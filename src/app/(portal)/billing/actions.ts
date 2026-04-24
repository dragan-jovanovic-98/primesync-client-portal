import { addMonths } from "date-fns";
import { unstable_noStore as noStore } from "next/cache";
import type {
  BillingDailyUsagePoint,
  BillingInvoice,
  BillingPageData,
  BillingPaymentMethodSummary,
  BillingPlan,
  BillingSettingsData,
  BillingUsage,
  BillingUsageCallRow,
  BillingUsageResult,
} from "@/lib/billing";
import { requirePortalAction } from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasStripeSecretKey } from "@/lib/stripe";

type ClientRow = {
  id: string;
  name: string | null;
  status: string | null;
  plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_cycle_anchor: string | null;
  cycle_length_months: number | null;
  wallet_balance: number | string | null;
  prepaid_rate_min_override: number | string | null;
  overage_rate_min_override: number | string | null;
  included_minutes_override: number | string | null;
  timezone: string | null;
};

const DEFAULT_TIMEZONE = "America/Los_Angeles";

type PlanRow = {
  name: string | null;
  display_name: string | null;
  plan_type: string | null;
  prepaid_rate_min: number | string | null;
  included_minutes: number | string | null;
  overage_rate_min: number | string | null;
};

type UsageCycleRow = {
  cycle_start: string | null;
  cycle_end: string | null;
  used_minutes: number | string | null;
  overage_cost: number | string | null;
  updated_at: string | null;
};

type InvoiceRow = {
  id: string;
  stripe_invoice_id: string | null;
  status: string | null;
  total: number | null;
  currency: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  paid_at: string | null;
};

type AssistantRow = {
  phone_number: string | null;
  status: boolean | null;
};

type PaymentMethodRow = {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function getNextBillingDate(usageCycle: UsageCycleRow | null, client: ClientRow) {
  if (usageCycle?.cycle_end) return usageCycle.cycle_end;
  if (!client.billing_cycle_anchor) return null;
  return addMonths(
    new Date(client.billing_cycle_anchor),
    Math.max(1, client.cycle_length_months ?? 1),
  ).toISOString();
}

function buildPlan(client: ClientRow, plan: PlanRow | null, usageCycle: UsageCycleRow | null): BillingPlan {
  const includedMinutes =
    client.included_minutes_override !== null
      ? toNumber(client.included_minutes_override)
      : toNumber(plan?.included_minutes);
  const overageRate =
    client.overage_rate_min_override !== null
      ? toNumber(client.overage_rate_min_override)
      : toNumber(plan?.overage_rate_min);
  const prepaidRate =
    client.prepaid_rate_min_override !== null
      ? toNumber(client.prepaid_rate_min_override)
      : plan?.prepaid_rate_min !== null && plan?.prepaid_rate_min !== undefined
        ? toNumber(plan.prepaid_rate_min)
        : null;

  return {
    name: plan?.display_name ?? plan?.name ?? "Custom",
    status: client.status,
    planType: plan?.plan_type ?? null,
    includedMinutes,
    overageRate,
    prepaidRate,
    walletBalance: toNumber(client.wallet_balance),
    cycleMonths: Math.max(1, client.cycle_length_months ?? 1),
    nextBillingDate: getNextBillingDate(usageCycle, client),
    billingAnchor: client.billing_cycle_anchor,
    stripeConnected: Boolean(client.stripe_customer_id && client.stripe_subscription_id),
  };
}

function buildUsage(
  plan: BillingPlan,
  usageCycle: UsageCycleRow | null,
  assistants: AssistantRow[],
  computedUsedMinutes: number | null,
): BillingUsage {
  // NOTE: usage_cycle.used_minutes is maintained outside this repo and is
  // currently drifting from reality (a Supabase function/trigger that updates
  // it appears to be reading a stale or incomplete source). Until that's
  // fixed upstream, the portal computes usedMinutes directly from
  // all_client_calls.call_duration_s over the cycle window and passes it in
  // as computedUsedMinutes. When that upstream bug is resolved, this
  // parameter can go away and we can revert to usageCycle.used_minutes.
  const usedMinutes =
    computedUsedMinutes !== null
      ? computedUsedMinutes
      : toNumber(usageCycle?.used_minutes);
  const includedMinutes = Math.max(0, plan.includedMinutes);
  const remainingMinutes = Math.max(0, includedMinutes - usedMinutes);
  const overageMinutes = Math.max(0, usedMinutes - includedMinutes);
  // Recompute overage cost from our computed usedMinutes instead of trusting
  // usage_cycle.overage_cost, since that's derived from the same stale value.
  const overageCost =
    computedUsedMinutes !== null
      ? overageMinutes * plan.overageRate
      : usageCycle?.overage_cost !== null && usageCycle?.overage_cost !== undefined
        ? toNumber(usageCycle.overage_cost)
        : overageMinutes * plan.overageRate;
  const usagePercent =
    includedMinutes > 0 ? Math.min((usedMinutes / includedMinutes) * 100, 100) : 0;
  const activePhoneLines = new Set(
    assistants
      .filter((assistant) => assistant.phone_number && assistant.status !== false)
      .map((assistant) => assistant.phone_number),
  ).size;

  return {
    cycleStart: usageCycle?.cycle_start ?? null,
    cycleEnd: usageCycle?.cycle_end ?? null,
    usedMinutes,
    includedMinutes,
    usagePercent,
    remainingMinutes,
    overageMinutes,
    overageCost,
    overageRate: plan.overageRate,
    activePhoneLines,
    updatedAt: usageCycle?.updated_at ?? null,
  };
}

function buildInvoices(invoices: InvoiceRow[]): BillingInvoice[] {
  return invoices.map((invoice) => ({
    id: invoice.id,
    stripeInvoiceId: invoice.stripe_invoice_id,
    createdAt: invoice.created_at,
    amount: toNumber(invoice.total) / 100,
    currency: invoice.currency || "usd",
    status: invoice.status || "draft",
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    paidAt: invoice.paid_at,
  }));
}

export async function getBillingData(companyId: string): Promise<BillingPageData> {
  noStore();
  const supabase = await createServerSupabaseClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, name, status, plan_id, stripe_customer_id, stripe_subscription_id, billing_cycle_anchor, cycle_length_months, wallet_balance, prepaid_rate_min_override, overage_rate_min_override, included_minutes_override, timezone",
    )
    .eq("company_id", companyId)
    .maybeSingle<ClientRow>();

  if (clientError) {
    throw new Error(`Failed to load billing client data: ${clientError.message}`);
  }

  if (!client) {
    return {
      plan: {
        name: null,
        status: null,
        planType: null,
        includedMinutes: 0,
        overageRate: 0,
        prepaidRate: null,
        walletBalance: 0,
        cycleMonths: 1,
        nextBillingDate: null,
        billingAnchor: null,
        stripeConnected: false,
      },
      usage: {
        cycleStart: null,
        cycleEnd: null,
        usedMinutes: 0,
        includedMinutes: 0,
        usagePercent: 0,
        remainingMinutes: 0,
        overageMinutes: 0,
        overageCost: 0,
        overageRate: 0,
        activePhoneLines: 0,
        updatedAt: null,
      },
      invoices: [],
      paymentMethod: null,
      dailyUsage: [],
    };
  }

  const [
    planResult,
    usageResult,
    assistantsResult,
    invoicesResult,
    paymentMethodResult,
  ] = await Promise.all([
    client.plan_id
      ? supabase
          .from("plans")
          .select("name, display_name, plan_type, prepaid_rate_min, included_minutes, overage_rate_min")
          .eq("id", client.plan_id)
          .maybeSingle<PlanRow>()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("usage_cycle")
      .select("cycle_start, cycle_end, used_minutes, overage_cost, updated_at")
      .eq("company_id", companyId)
      .order("cycle_start", { ascending: false })
      .limit(1)
      .maybeSingle<UsageCycleRow>(),
    supabase
      .from("assistants")
      .select("phone_number, status")
      .eq("company_id", companyId)
      .returns<AssistantRow[]>(),
    supabase
      .from("invoices_v2")
      .select(
        "id, stripe_invoice_id, status, total, currency, hosted_invoice_url, invoice_pdf, period_start, period_end, created_at, paid_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<InvoiceRow[]>(),
    supabase
      .from("client_payment_methods")
      .select("brand, last4, exp_month, exp_year, is_default, added_at")
      .eq("client_id", client.id)
      .order("is_default", { ascending: false })
      .order("added_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        brand: string | null;
        last4: string | null;
        exp_month: number | null;
        exp_year: number | null;
        is_default: boolean | null;
        added_at: string | null;
      }>(),
  ]);

  if (planResult.error) {
    throw new Error(`Failed to load billing plan data: ${planResult.error.message}`);
  }

  if (usageResult.error) {
    throw new Error(`Failed to load billing usage data: ${usageResult.error.message}`);
  }

  if (assistantsResult.error) {
    throw new Error(`Failed to load billing assistant data: ${assistantsResult.error.message}`);
  }

  if (invoicesResult.error) {
    throw new Error(`Failed to load billing invoices: ${invoicesResult.error.message}`);
  }

  const plan = buildPlan(client, planResult.data, usageResult.data);

  // Pull used minutes + daily usage series from the SQL usage-meter RPC in
  // one call. Used minutes are computed off all_client_calls.call_duration_s
  // (see buildUsage note for why we bypass usage_cycle.used_minutes), and the
  // daily series is bucketed in the tenant's timezone with zero-call days
  // filled in so the chart always shows the whole cycle.
  const meter = await loadUsageMeter(
    supabase,
    usageResult.data?.cycle_start ?? null,
    usageResult.data?.cycle_end ?? null,
    client.timezone || DEFAULT_TIMEZONE,
  );

  const usage = buildUsage(
    plan,
    usageResult.data,
    assistantsResult.data ?? [],
    meter.usedMinutes,
  );
  const invoices = buildInvoices(invoicesResult.data ?? []);

  const paymentMethod: BillingPaymentMethodSummary | null = paymentMethodResult.data
    ? {
        brand: paymentMethodResult.data.brand,
        last4: paymentMethodResult.data.last4,
        expMonth: paymentMethodResult.data.exp_month,
        expYear: paymentMethodResult.data.exp_year,
      }
    : null;

  return {
    plan,
    usage,
    invoices,
    paymentMethod,
    dailyUsage: meter.dailySeries,
  };
}

type UsageMeterPayload = {
  used_minutes: number | string;
  daily_series: Array<{ date: string; minutes_used: number | string }>;
};

type UsageMeterResult = {
  usedMinutes: number | null;
  dailySeries: BillingDailyUsagePoint[];
};

async function loadUsageMeter(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  cycleStart: string | null,
  cycleEnd: string | null,
  timeZone: string,
): Promise<UsageMeterResult> {
  // Fall back to the last 30 days for brand-new accounts without a cycle row,
  // so the chart still renders something useful.
  const now = new Date();
  const fallbackStart = new Date(now);
  fallbackStart.setDate(fallbackStart.getDate() - 29);
  const startIso = (cycleStart ? new Date(cycleStart) : fallbackStart).toISOString();
  const endIso = (cycleEnd ? new Date(cycleEnd) : now).toISOString();

  // The generated Supabase types don't yet include the new RPC.
  const rpcClient = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await rpcClient.rpc("get_portal_usage_meter", {
    p_cycle_start: startIso,
    p_cycle_end: endIso,
    p_timezone: timeZone,
  });

  if (error || !data) {
    if (error) console.error("[portal] get_portal_usage_meter RPC failed:", error);
    return { usedMinutes: null, dailySeries: [] };
  }

  const payload = data as UsageMeterPayload;
  const usedMinutes = Number(payload.used_minutes);
  const dailySeries: BillingDailyUsagePoint[] = payload.daily_series.map((row) => ({
    date: row.date,
    minutesUsed: Number(row.minutes_used),
  }));

  return {
    usedMinutes: Number.isFinite(usedMinutes) ? usedMinutes : 0,
    dailySeries,
  };
}

export async function getPortalUsage(filters: {
  from?: string;
  to?: string;
  assistantIds?: string[];
  locationIds?: string[];
  page?: number;
  perPage?: number;
}): Promise<BillingUsageResult> {
  noStore();
  await requirePortalAction({ capability: "billing.read", page: "billing" });

  const supabase = await createServerSupabaseClient();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const perPage = filters.perPage && filters.perPage > 0 ? filters.perPage : 25;
  const offset = (page - 1) * perPage;

  const { data, error } = await supabase.rpc("get_portal_usage", {
    p_from: filters.from ? `${filters.from}T00:00:00` : undefined,
    p_to: filters.to ? `${filters.to}T23:59:59.999` : undefined,
    p_assistant_ids:
      filters.assistantIds && filters.assistantIds.length > 0
        ? filters.assistantIds
        : undefined,
    p_location_ids:
      filters.locationIds && filters.locationIds.length > 0
        ? filters.locationIds
        : undefined,
    p_limit: perPage,
    p_offset: offset,
  });

  if (error) {
    console.error("[portal] get_portal_usage RPC failed:", error);
    return { rows: [], total: 0, page, perPage };
  }

  const rows = (data ?? []) as unknown as Array<{
    call_id: string;
    call_date: string | null;
    call_duration_s: number | null;
    total_cost_client: number | string | null;
    assistant_id: string | null;
    agent_name: string | null;
    location_id: string | null;
    location_name: string | null;
    call_outcome: string | null;
    total_count: number;
  }>;

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const mapped: BillingUsageCallRow[] = rows.map((row) => ({
    callId: row.call_id,
    callDate: row.call_date,
    durationSeconds: row.call_duration_s,
    clientCost:
      row.total_cost_client === null || row.total_cost_client === undefined
        ? null
        : Number(row.total_cost_client),
    assistantId: row.assistant_id,
    agentName: row.agent_name,
    locationId: row.location_id,
    locationName: row.location_name,
    outcome: row.call_outcome,
  }));

  return { rows: mapped, total, page, perPage };
}

export async function getBillingSettingsData(companyId: string): Promise<BillingSettingsData> {
  noStore();
  const supabase = await createServerSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle<{ id: string }>();

  if (!client) {
    return {
      customerPortalAvailable: false,
      paymentMethods: [],
    };
  }

  const { data: paymentMethods } = await supabase
    .from("client_payment_methods")
    .select("id, brand, last4, exp_month, exp_year, is_default")
    .eq("client_id", client.id)
    .order("is_default", { ascending: false })
    .order("added_at", { ascending: false })
    .returns<PaymentMethodRow[]>();

  // Deduplicate by brand+last4+exp — upstream sync can insert duplicate rows
  const seen = new Set<string>();
  const dedupedMethods = (paymentMethods ?? []).filter((method) => {
    const key = `${method.brand}-${method.last4}-${method.exp_month}-${method.exp_year}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    customerPortalAvailable: hasStripeSecretKey(),
    paymentMethods: dedupedMethods.map((method) => ({
      id: method.id,
      brand: method.brand,
      last4: method.last4,
      expMonth: method.exp_month,
      expYear: method.exp_year,
      isDefault: Boolean(method.is_default),
    })),
  };
}
