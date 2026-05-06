import { BadgeDollarSign, CalendarClock, Wallet } from "lucide-react";
import {
  formatBillingCurrency,
  formatBillingDate,
  formatMinutes,
  getBillingCycleLabel,
  type BillingPlan,
} from "@/lib/billing";

export function PlanCard({ plan }: { plan: BillingPlan }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#eeeff1] bg-white">
      <div className="h-[3px] bg-[#0F1841]" />
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Current Plan
        </p>
      </div>

      <div className="space-y-4 px-5 pb-5">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-[24px] font-bold tracking-[-0.5px] text-[#242529]">
              {plan.name ?? "No plan on file"}
            </p>
            {plan.status ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-emerald-700">
                {plan.status}
              </span>
            ) : null}
            {plan.stripeConnected ? (
              <span className="inline-flex items-center rounded-full bg-[#f3f6ff] px-2 py-0.5 text-[11px] font-semibold text-[#335cff]">
                Stripe synced
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.7)]">
            {plan.planType === "prepaid"
              ? `Prepaid plan${plan.prepaidRate !== null ? ` · ${formatBillingCurrency(plan.prepaidRate)}/min` : ""}`
              : plan.planType
                ? `${plan.planType.charAt(0).toUpperCase() + plan.planType.slice(1)} plan${plan.includedMinutes > 0 ? ` · ${formatMinutes(plan.includedMinutes)} min included` : ""}${plan.overageRate > 0 ? ` · ${formatBillingCurrency(plan.overageRate)}/min overage` : ""}`
                : "Billing configuration pending"}
          </p>
        </div>

        <p className="text-[13px] text-[rgba(0,0,0,0.45)]">
          Next billing: {formatBillingDate(plan.nextBillingDate)}
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-[#f7f7f8] px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[rgba(0,0,0,0.48)]">
              <CalendarClock className="h-3.5 w-3.5" />
              Cycle
            </div>
            <p className="mt-1 text-[14px] font-medium text-[#242529]">
              {getBillingCycleLabel(plan.cycleMonths)}
            </p>
          </div>

          <div className="rounded-lg bg-[#f7f7f8] px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[rgba(0,0,0,0.48)]">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              {plan.planType === "prepaid" ? "Rate" : "Included"}
            </div>
            <p className="mt-1 text-[14px] font-medium text-[#242529]">
              {plan.planType === "prepaid"
                ? plan.prepaidRate !== null
                  ? `${formatBillingCurrency(plan.prepaidRate)}/min`
                  : "—"
                : plan.includedMinutes > 0
                  ? `${formatMinutes(plan.includedMinutes)} min`
                  : "Usage-based"}
            </p>
          </div>

          <div className="rounded-lg bg-[#f7f7f8] px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[rgba(0,0,0,0.48)]">
              <Wallet className="h-3.5 w-3.5" />
              Wallet
            </div>
            <p className="mt-1 text-[14px] font-medium text-[#242529]">
              {formatBillingCurrency(plan.walletBalance)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
