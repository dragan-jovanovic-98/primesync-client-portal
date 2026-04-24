import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/portal/session";
import {
  getBillingData,
  getBillingSettingsData,
} from "@/app/(portal)/billing/actions";
import { createPlanChangeRequest } from "@/app/(portal)/settings/actions";
import { formatBillingCurrency, formatBillingDate, formatMinutes } from "@/lib/billing";

const statusMessages: Record<string, string> = {
  "plan-request-submitted":
    "Plan change request submitted. Our team will review it and follow up.",
  "plan-request-error": "We could not submit that plan change request.",
  "plan-request-invalid":
    "Enter the requested plan and a short reason for the change.",
  "billing-portal-unavailable":
    "Billing portal is not configured yet for this workspace.",
};

export default async function BillingSettingsPage({
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

  const [billingData, billingSettings] = await Promise.all([
    getBillingData(session.membership.company_id),
    getBillingSettingsData(session.membership.company_id),
  ]);

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      {feedback ? (
        <p className="text-[13px] text-emerald-600">{feedback}</p>
      ) : null}

      <div>
        <h2 className="text-sm font-medium text-zinc-900">Billing controls</h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          Manage payment methods in Stripe and send plan change requests through
          TorQi.
        </p>
      </div>

      {/* Payment methods */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-medium text-zinc-900">
            Payment methods
          </h3>
          <p className="mt-1 text-[13px] text-zinc-500">
            Secure card updates stay in Stripe&apos;s billing portal.
          </p>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="space-y-2">
            {(billingSettings?.paymentMethods ?? []).length > 0 ? (
              billingSettings?.paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between rounded-lg bg-[#f7f7f8] px-3 py-2"
                >
                  <div>
                    <p className="text-[14px] font-medium capitalize text-zinc-900">
                      {method.brand ?? "Card"} ending in {method.last4 ?? "----"}
                    </p>
                    <p className="text-[12px] text-zinc-500">
                      Expires {method.expMonth ?? "--"}/
                      {method.expYear ?? "----"}
                    </p>
                  </div>
                  {method.isDefault ? (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                      Default
                    </span>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-[#f7f7f8] px-3 py-3 text-[13px] text-zinc-500">
                No saved payment methods are on file yet.
              </div>
            )}
          </div>

          <a
            href="/api/billing/customer-portal"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-8 items-center justify-center rounded-lg px-4 text-[13px] font-medium transition-colors ${
              billingSettings?.customerPortalAvailable
                ? "bg-[#242529] text-white! hover:bg-[#111214]"
                : "cursor-not-allowed bg-zinc-100 text-zinc-400"
            }`}
            aria-disabled={!billingSettings?.customerPortalAvailable}
          >
            Manage payment methods
          </a>
          <p className="text-[12px] text-zinc-400">
            Opens Stripe in a new tab so your portal session stays here.
          </p>
        </div>
      </div>

      {/* Plan changes */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-medium text-zinc-900">Plan changes</h3>
          <p className="mt-1 text-[13px] text-zinc-500">
            Clients can request plan changes here. TorQi reviews and applies
            them manually.
          </p>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="rounded-lg bg-[#f7f7f8] px-3 py-3">
            <p className="text-[14px] font-medium text-zinc-900">
              Current plan: {billingData?.plan.name ?? "No plan on file"}
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">
              {billingData
                ? `${formatMinutes(billingData.plan.includedMinutes)} included minutes · ${formatBillingCurrency(billingData.plan.overageRate)}/min overage · Next billing ${formatBillingDate(billingData.plan.nextBillingDate)}`
                : "Billing details unavailable"}
            </p>
          </div>

          <form action={createPlanChangeRequest} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="requestedPlan"
                className="text-[13px] text-zinc-500"
              >
                Requested plan
              </label>
              <input
                id="requestedPlan"
                name="requestedPlan"
                type="text"
                placeholder="Example: Growth Plus"
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="text-[13px] text-zinc-500">
                Why are you requesting a change?
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Tell us what changed in your usage, team size, or billing needs."
                className="w-full rounded-lg border border-[#eeeff1] px-3 py-2 text-[14px] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--torqi-orange)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--torqi-orange-hover)]"
              >
                Request plan change
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
