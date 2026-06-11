import { NextRequest, NextResponse } from "next/server";
import { getRoutePortalSession } from "@/lib/portal/route-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasStripeSecretKey, stripeRequest } from "@/lib/stripe";
import { getCreditPack, getPackPriceId } from "@/lib/billing/credit-packs";

type StripeCheckoutSession = {
  url: string | null;
};

/**
 * Starts a wallet top-up for the current prepaid client.
 *
 * Mirrors the customer-portal handoff (`/api/billing/customer-portal`): identity
 * is derived from the portal session (never the request body), and the call is
 * made directly to TorQi Stripe with `STRIPE_SECRET_KEY_PRIMARY`. The charged
 * amount comes only from the server-resolved pack price ID.
 *
 * On success the resulting `payment_intent.succeeded` webhook (handled by the
 * admin dashboard) writes a `payments_v2` row, the `fn_sync_wallet_v2` trigger
 * credits the wallet, and `invoice_creation` produces a receipt that syncs into
 * `invoices_v2`. This route never writes the wallet balance itself.
 */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const session = await getRoutePortalSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasStripeSecretKey()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  let tier: string | undefined;
  try {
    const body = (await request.json()) as { tier?: unknown };
    tier = typeof body?.tier === "string" ? body.tier : undefined;
  } catch {
    tier = undefined;
  }

  const pack = tier ? getCreditPack(tier) : null;
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, stripe_customer_id, plan_id")
    .eq("company_id", session.companyId)
    .maybeSingle<{
      id: string;
      stripe_customer_id: string | null;
      plan_id: string | null;
    }>();

  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  // Adding funds is a prepaid-only concept.
  let isPrepaid = false;
  if (client.plan_id) {
    const { data: plan } = await admin
      .from("plans")
      .select("plan_type")
      .eq("id", client.plan_id)
      .maybeSingle<{ plan_type: string | null }>();
    isPrepaid = plan?.plan_type === "prepaid";
  }
  if (!isPrepaid) {
    return NextResponse.json(
      { error: "Adding funds is only available on prepaid plans." },
      { status: 400 },
    );
  }

  // For prepaid clients the TorQi customer always lives in `stripe_customer_id`
  // (pre-create script guarantee). We charge it directly with the primary key —
  // never `customerIdFor`, which would resolve the legacy Primesync customer
  // while the client is still flagged `stripe_account = 'legacy'`.
  if (!client.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Please contact support." },
      { status: 400 },
    );
  }

  let priceId: string;
  try {
    priceId = getPackPriceId(pack.tier);
  } catch (err) {
    console.error("[wallet/topup] price config error:", err);
    return NextResponse.json({ error: "Credit packs are not configured." }, { status: 503 });
  }

  try {
    const checkout = await stripeRequest<StripeCheckoutSession>(
      "/v1/checkout/sessions",
      {
        method: "POST",
        params: {
          mode: "payment",
          customer: client.stripe_customer_id,
          "line_items[0][price]": priceId,
          "line_items[0][quantity]": "1",
          // Generate a finalized invoice + PDF so the purchase appears in the
          // existing invoice history (portal + admin) as a receipt.
          "invoice_creation[enabled]": "true",
          "invoice_creation[invoice_data][description]": `Wallet credit pack — ${pack.label}`,
          "invoice_creation[invoice_data][metadata][purpose]": "wallet_topup",
          "invoice_creation[invoice_data][metadata][company_id]": session.companyId,
          // PI metadata drives the admin wallet credit tagging + companion cutover flip.
          "payment_intent_data[metadata][company_id]": session.companyId,
          "payment_intent_data[metadata][purpose]": "wallet_topup",
          "payment_intent_data[metadata][pack]": pack.tier,
          // Save the card so `payment_method.attached` fires (records TorQi consent).
          "payment_intent_data[setup_future_usage]": "off_session",
          "metadata[company_id]": session.companyId,
          "metadata[purpose]": "wallet_topup",
          "metadata[pack]": pack.tier,
          // Plain strings — must NOT pre-encode the {CHECKOUT_SESSION_ID} placeholder.
          success_url: `${origin}/billing?topup=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/billing?topup=cancelled`,
        },
      },
    );

    if (!checkout.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[wallet/topup] Stripe error:", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
