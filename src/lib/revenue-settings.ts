export type RevenueCategoryKey =
  | "appointment"
  | "message"
  | "quote"
  | "urgent"
  | "towing"
  | "transfer"
  | "voicemail"
  | "general_inquiry"
  | "reschedule_cancel"
  | "other";

export type RevenueCategoryConfig = {
  enabled: boolean;
  closeRate: number;
};

export type RevenueSettings = {
  averageOrderValue: number;
  categories: Record<RevenueCategoryKey, RevenueCategoryConfig>;
};

export const FIXED_REVENUE_CATEGORIES: Array<{
  key: RevenueCategoryKey;
  label: string;
  description: string;
}> = [
  { key: "appointment", label: "Appointments", description: "Booked appointments and appointment-request outcomes." },
  { key: "message", label: "Messages", description: "Messages that may turn into work after follow-up." },
  { key: "quote", label: "Quotes", description: "Quote and estimate requests." },
  { key: "urgent", label: "Urgent", description: "Urgent requests that can convert quickly." },
  { key: "towing", label: "Towing", description: "Towing and roadside recovery requests." },
  { key: "transfer", label: "Transfers", description: "Transferred calls that may still create revenue." },
  { key: "voicemail", label: "Voicemail", description: "Voicemails left for later follow-up." },
  { key: "general_inquiry", label: "General Inquiry", description: "General inquiries that may become future business." },
  { key: "reschedule_cancel", label: "Reschedule / Cancel", description: "Reschedules and cancellations." },
  { key: "other", label: "Other", description: "Unmapped or miscellaneous outcomes." },
];

export const DEFAULT_REVENUE_SETTINGS: RevenueSettings = {
  averageOrderValue: 300,
  categories: {
    appointment: { enabled: true, closeRate: 60 },
    message: { enabled: true, closeRate: 15 },
    quote: { enabled: true, closeRate: 25 },
    urgent: { enabled: true, closeRate: 25 },
    towing: { enabled: true, closeRate: 60 },
    transfer: { enabled: true, closeRate: 0 },
    voicemail: { enabled: false, closeRate: 5 },
    general_inquiry: { enabled: true, closeRate: 5 },
    reschedule_cancel: { enabled: false, closeRate: 0 },
    other: { enabled: false, closeRate: 0 },
  },
};

export function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function normalizeRevenueSettings(
  rawSettings: Partial<RevenueSettings> | null | undefined,
): RevenueSettings {
  const categories = { ...DEFAULT_REVENUE_SETTINGS.categories };
  const rawCategories = rawSettings?.categories;

  if (rawCategories) {
    for (const category of FIXED_REVENUE_CATEGORIES) {
      const next = rawCategories[category.key];
      if (!next) continue;
      categories[category.key] = {
        enabled:
          typeof next.enabled === "boolean"
            ? next.enabled
            : DEFAULT_REVENUE_SETTINGS.categories[category.key].enabled,
        closeRate:
          typeof next.closeRate === "number"
            ? clampPercentage(next.closeRate)
            : DEFAULT_REVENUE_SETTINGS.categories[category.key].closeRate,
      };
    }
  }

  return {
    averageOrderValue:
      typeof rawSettings?.averageOrderValue === "number" &&
      Number.isFinite(rawSettings.averageOrderValue) &&
      rawSettings.averageOrderValue >= 0
        ? rawSettings.averageOrderValue
        : DEFAULT_REVENUE_SETTINGS.averageOrderValue,
    categories,
  };
}
