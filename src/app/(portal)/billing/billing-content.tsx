import type {
  BillingPageData,
  BillingUsageResult,
} from "@/lib/billing";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { DailyUsageChart } from "@/components/billing/daily-usage-chart";
import { ExportUsageButton } from "@/components/billing/export-usage-button";
import { InvoiceHistory } from "@/components/billing/invoice-history";
import { PaymentMethodCard } from "@/components/billing/payment-method-card";
import { PlanCard } from "@/components/billing/plan-card";
import { UsageFilters } from "@/components/billing/usage-filters";
import { UsageMeter } from "@/components/billing/usage-meter";
import { UsageTable } from "@/components/billing/usage-table";
import type { UsageFilterOption } from "@/components/billing/usage-filters";

interface BillingPageContentProps {
  data: BillingPageData;
  tab: "overview" | "usage";
  usageResult: BillingUsageResult | null;
  agentOptions: UsageFilterOption[];
  locationOptions: UsageFilterOption[];
  pathname: string;
  searchParamsString: string;
}

export function BillingPageContent({
  data,
  tab,
  usageResult,
  agentOptions,
  locationOptions,
  pathname,
  searchParamsString,
}: BillingPageContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#242529]">
            Billing
          </h1>
          <p className="mt-0.5 text-[14px] text-[rgba(0,0,0,0.55)]">
            Plan, usage, and payment details
          </p>
        </div>
        <BillingTabs />
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PlanCard plan={data.plan} />
            <UsageMeter
              usage={data.usage}
              planType={data.plan.planType}
              walletBalance={data.plan.walletBalance}
            />
          </div>

          <DailyUsageChart
            points={data.dailyUsage}
            cycleStart={data.usage.cycleStart}
            cycleEnd={data.usage.cycleEnd}
            usedMinutes={data.usage.usedMinutes}
            includedMinutes={data.usage.includedMinutes}
          />

          <PaymentMethodCard method={data.paymentMethod} />

          <InvoiceHistory invoices={data.invoices} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <UsageFilters
              agentOptions={agentOptions}
              locationOptions={locationOptions}
            />
            <ExportUsageButton />
          </div>
          {usageResult ? (
            <UsageTable
              result={usageResult}
              pathname={pathname}
              searchParamsString={searchParamsString}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
