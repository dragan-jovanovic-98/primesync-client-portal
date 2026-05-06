import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  formatBillingCurrency,
  formatCycleRange,
  formatMinutes,
  type BillingUsage,
} from "@/lib/billing";

export function UsageMeter({
  usage,
  planType,
  walletBalance,
}: {
  usage: BillingUsage;
  planType: string | null;
  walletBalance: number;
}) {
  const isPrepaid = planType === "prepaid";

  const barColor =
    usage.usagePercent >= 95
      ? "bg-[#C2410C]"
      : usage.usagePercent >= 80
        ? "bg-[#F19A1F]"
        : "bg-[#0F1841]";

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Usage This Period
        </p>
      </div>

      <div className="space-y-5 px-5 pb-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[14px] font-medium text-[#242529]">Call Minutes</span>
            <div className="text-right">
              <span className="tabular-nums text-[20px] font-bold tracking-[-0.3px] text-[#242529]">
                {formatMinutes(usage.usedMinutes)}
              </span>
              {!isPrepaid && (
                <span className="ml-1 text-[14px] text-[rgba(0,0,0,0.35)]">
                  / {formatMinutes(usage.includedMinutes)}
                </span>
              )}
            </div>
          </div>

          {!isPrepaid && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#f4f4f5]">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${Math.max(usage.usagePercent, usage.usedMinutes > 0 ? 4 : 0)}%` }}
                />
              </div>

              <div className="mt-1.5 flex justify-between">
                <span className="text-[12px] text-[rgba(0,0,0,0.4)]">
                  {usage.includedMinutes > 0
                    ? `${formatMinutes(usage.remainingMinutes)} remaining`
                    : "No included minute cap"}
                </span>
                {usage.overageMinutes > 0 ? (
                  <span className="text-[12px] font-medium text-rose-600">
                    {formatMinutes(usage.overageMinutes)} overage
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-[#f4f4f5] px-3 py-2 text-[13px]">
            <span className="block text-[rgba(0,0,0,0.7)]">Current cycle</span>
            <span className="mt-1 block font-medium text-[#242529]">
              {formatCycleRange(usage.cycleStart, usage.cycleEnd)}
            </span>
          </div>

          <div className="rounded-lg bg-[#f4f4f5] px-3 py-2 text-[13px]">
            <span className="block text-[rgba(0,0,0,0.7)]">
              {isPrepaid ? "Wallet balance" : "Current overage"}
            </span>
            <span className="mt-1 block font-medium text-[#242529]">
              {isPrepaid
                ? formatBillingCurrency(walletBalance)
                : `${formatBillingCurrency(usage.overageCost)}${usage.overageRate > 0 ? ` at ${formatBillingCurrency(usage.overageRate)}/min` : ""}`}
            </span>
          </div>

          <div className="rounded-lg bg-[#f4f4f5] px-3 py-2 text-[13px]">
            <span className="block text-[rgba(0,0,0,0.7)]">Active phone lines</span>
            <span className="mt-1 block font-medium text-[#242529]">
              {usage.activePhoneLines}
            </span>
          </div>
        </div>

        {usage.updatedAt ? (
          <p className="text-[12px] text-[rgba(0,0,0,0.4)]">
            Updated {formatDistanceToNow(new Date(usage.updatedAt), { addSuffix: true })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
