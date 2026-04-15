import { format, parseISO } from "date-fns";

export type BillingPlan = {
  name: string | null;
  status: string | null;
  planType: string | null;
  includedMinutes: number;
  overageRate: number;
  prepaidRate: number | null;
  walletBalance: number;
  cycleMonths: number;
  nextBillingDate: string | null;
  billingAnchor: string | null;
  stripeConnected: boolean;
};

export type BillingUsage = {
  cycleStart: string | null;
  cycleEnd: string | null;
  usedMinutes: number;
  includedMinutes: number;
  usagePercent: number;
  remainingMinutes: number;
  overageMinutes: number;
  overageCost: number;
  overageRate: number;
  activePhoneLines: number;
  updatedAt: string | null;
};

export type BillingInvoice = {
  id: string;
  stripeInvoiceId: string | null;
  createdAt: string;
  amount: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
};

export type BillingPaymentMethodSummary = {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

export type BillingDailyUsagePoint = {
  date: string;
  minutesUsed: number;
};

export type BillingUsageCallRow = {
  callId: string;
  callDate: string | null;
  durationSeconds: number | null;
  clientCost: number | null;
  assistantId: string | null;
  agentName: string | null;
  locationId: string | null;
  locationName: string | null;
  outcome: string | null;
};

export type BillingUsageResult = {
  rows: BillingUsageCallRow[];
  total: number;
  page: number;
  perPage: number;
};

export type BillingPageData = {
  plan: BillingPlan;
  usage: BillingUsage;
  invoices: BillingInvoice[];
  paymentMethod: BillingPaymentMethodSummary | null;
  dailyUsage: BillingDailyUsagePoint[];
};

export type BillingSettingsData = {
  customerPortalAvailable: boolean;
  paymentMethods: Array<{
    id: string;
    brand: string | null;
    last4: string | null;
    expMonth: number | null;
    expYear: number | null;
    isDefault: boolean;
  }>;
};

export function formatBillingCurrency(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCardBrand(brand: string | null) {
  if (!brand) return "Card";
  const normalized = brand.toLowerCase();
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    "american express": "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return map[normalized] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function formatCardExpiry(month: number | null, year: number | null) {
  if (!month || !year) return null;
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

export function formatMinutes(value: number) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(rounded);
}

export function formatBillingDate(value: string | null) {
  if (!value) return "—";
  return format(parseISO(value), "MMMM d, yyyy");
}

export function formatShortBillingDate(value: string | null) {
  if (!value) return "—";
  return format(parseISO(value), "MMM d, yyyy");
}

export function formatCycleRange(start: string | null, end: string | null) {
  if (!start || !end) return "No billing cycle yet";
  return `${format(parseISO(start), "MMM d")} - ${format(parseISO(end), "MMM d, yyyy")}`;
}

export function getBillingCycleLabel(months: number) {
  return months === 1 ? "Monthly billing cycle" : `${months}-month billing cycle`;
}
