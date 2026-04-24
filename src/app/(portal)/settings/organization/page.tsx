import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  updateCompanyProfile,
  updatePortalRevenueSettings,
} from "@/app/(portal)/settings/actions";
import {
  FIXED_REVENUE_CATEGORIES,
  normalizeRevenueSettings,
} from "@/lib/revenue-settings";
import { EmailListInput } from "@/components/settings/email-list-input";

type CompanyRow = {
  id: string;
  name: string | null;
  email: string | null;
  timezone: string | null;
  industry: string | null;
  service_emails: string[] | null;
  report_frequency: string | null;
  report_emails: string[] | null;
};

const statusMessages: Record<string, string> = {
  "company-profile-saved": "Company profile updated.",
  "company-profile-error": "We could not save the company profile.",
  "company-profile-invalid": "Name, billing email, and timezone are required.",
  "revenue-settings-saved": "Revenue settings updated.",
  "revenue-settings-error": "We could not save revenue settings.",
  "invalid-revenue-settings":
    "Enter a valid average order value and close rates.",
};

const INDUSTRIES = [
  "Auto Repair",
  "Auto Dealer",
  "HVAC",
  "Plumbing",
  "Dental",
  "Medical",
  "Legal",
  "Real Estate",
  "Home Services",
  "Other",
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Toronto", label: "Eastern Time — Canada" },
  { value: "America/Vancouver", label: "Pacific Time — Canada" },
  { value: "Europe/London", label: "GMT / London" },
  { value: "Europe/Paris", label: "CET / Paris" },
  { value: "Australia/Sydney", label: "AET / Sydney" },
];

const reportFrequencies = ["none", "daily", "weekly", "monthly"];

export default async function OrganizationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requirePortalSession({ page: "settings" });

  if (session.role !== "admin") {
    redirect("/settings/account");
  }

  const { status } = await searchParams;
  const feedback = status ? statusMessages[status] : null;
  const supabase = await createServerSupabaseClient();

  const [{ data: company }, { data: rawRevenueSettings }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, name, email, timezone, industry, service_emails, report_frequency, report_emails",
      )
      .eq("company_id", session.membership.company_id)
      .maybeSingle<CompanyRow>(),
    supabase
      .from("portal_revenue_settings")
      .select("average_order_value, category_settings")
      .eq("company_id", session.membership.company_id)
      .maybeSingle<{
        average_order_value: number | string | null;
        category_settings: Record<
          string,
          { enabled?: boolean; closeRate?: number }
        > | null;
      }>(),
  ]);

  const revenueSettings = normalizeRevenueSettings({
    averageOrderValue:
      typeof rawRevenueSettings?.average_order_value === "string"
        ? Number(rawRevenueSettings.average_order_value)
        : (rawRevenueSettings?.average_order_value ?? undefined),
    categories: (rawRevenueSettings?.category_settings ?? undefined) as any,
  });

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      {feedback ? (
        <p className="text-[13px] text-emerald-600">{feedback}</p>
      ) : null}

      {/* Company identity form */}
      <form action={updateCompanyProfile} className="space-y-6">
        <div className="rounded-[20px] border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h3 className="text-sm font-medium text-zinc-900">
              Company identity
            </h3>
            <p className="mt-1 text-[13px] text-zinc-500">
              Core business details used across billing, reporting, and portal
              communication.
            </p>
          </div>

          <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[13px] text-zinc-500">
                Company name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={company?.name ?? ""}
                className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="industry" className="text-[13px] text-zinc-500">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                defaultValue={company?.industry ?? ""}
                className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] text-zinc-500">
                Billing email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={company?.email ?? ""}
                className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="timezone" className="text-[13px] text-zinc-500">
                Company timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={company?.timezone ?? ""}
                className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              >
                <option value="">Select timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[20px] border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h3 className="text-sm font-medium text-zinc-900">
                Notification routing
              </h3>
              <p className="mt-1 text-[13px] text-zinc-500">
                Company-level inboxes for operational notices.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <EmailListInput
                name="serviceEmails"
                label="Service emails"
                initialEmails={company?.service_emails ?? []}
                placeholder="Add email address"
              />
              <p className="text-[12px] text-zinc-400">
                Company-level defaults. Location-specific addresses are managed
                in the Locations tab.
              </p>
            </div>
          </div>

          <div className="rounded-[20px] border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h3 className="text-sm font-medium text-zinc-900">Reporting</h3>
              <p className="mt-1 text-[13px] text-zinc-500">
                Control when performance reports go out and who receives them.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="reportFrequency"
                  className="text-[13px] text-zinc-500"
                >
                  Report cadence
                </label>
                <select
                  id="reportFrequency"
                  name="reportFrequency"
                  defaultValue={company?.report_frequency ?? "none"}
                  className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
                >
                  {reportFrequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <EmailListInput
                name="reportEmails"
                label="Report recipients"
                initialEmails={company?.report_emails ?? []}
                placeholder="Add recipient email"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
          >
            Save organization settings
          </button>
        </div>
      </form>

      {/* Revenue settings */}
      <div className="rounded-[20px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h3 className="text-sm font-medium text-zinc-900">
            Revenue settings
          </h3>
          <p className="mt-1 text-[13px] text-zinc-500">
            Estimated orders and revenue impact are derived from these outcome
            assumptions.
          </p>
        </div>

        <form
          action={updatePortalRevenueSettings}
          className="space-y-6 px-5 py-5"
        >
          <div className="space-y-1.5 rounded-2xl bg-[#f7f7f8] p-4">
            <label
              htmlFor="averageOrderValue"
              className="text-[13px] text-zinc-500"
            >
              Average order value ($)
            </label>
            <input
              id="averageOrderValue"
              name="averageOrderValue"
              type="number"
              min="0"
              step="0.01"
              defaultValue={revenueSettings.averageOrderValue}
              className="h-10 w-full rounded-xl border border-[#eeeff1] bg-white px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
            />
          </div>

          <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
            {FIXED_REVENUE_CATEGORIES.map((category) => {
              const value = revenueSettings.categories[category.key];

              return (
                <div
                  key={category.key}
                  className="flex items-start justify-between gap-4 px-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={`category_enabled_${category.key}`}
                        defaultChecked={value.enabled}
                        className="h-4 w-4 rounded border-zinc-300 text-[#242529] focus:ring-[rgba(15,24,65,0.15)]"
                      />
                      <span className="text-[14px] font-medium text-zinc-900">
                        {category.label}
                      </span>
                    </label>
                    <p className="mt-1 pl-6 text-[13px] text-zinc-500">
                      {category.description}
                    </p>
                  </div>

                  <div className="w-[120px] shrink-0 space-y-1.5">
                    <label
                      htmlFor={`category_close_rate_${category.key}`}
                      className="text-[12px] text-zinc-500"
                    >
                      Close rate %
                    </label>
                    <input
                      id={`category_close_rate_${category.key}`}
                      name={`category_close_rate_${category.key}`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue={value.closeRate}
                      className="h-8 w-full rounded-xl border border-[#eeeff1] px-2.5 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Save revenue settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
