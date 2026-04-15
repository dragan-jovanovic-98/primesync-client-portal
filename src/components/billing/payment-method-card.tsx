import { CreditCard } from "lucide-react";
import {
  formatCardBrand,
  formatCardExpiry,
  type BillingPaymentMethodSummary,
} from "@/lib/billing";

interface PaymentMethodCardProps {
  method: BillingPaymentMethodSummary | null;
}

export function PaymentMethodCard({ method }: PaymentMethodCardProps) {
  const brandLabel = method ? formatCardBrand(method.brand) : null;
  const expiry = method ? formatCardExpiry(method.expMonth, method.expYear) : null;

  return (
    <section className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-center justify-between border-b border-[#eeeff1] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242529]">
            Payment method
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">
            Manage your card and billing address in Stripe
          </p>
        </div>
        <a
          href="/api/billing/customer-portal"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
        >
          Manage in Stripe
        </a>
      </div>

      <div className="px-5 py-5">
        {method && method.last4 ? (
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-[#eeeff1] bg-[#fbfbfb]">
              <CreditCard className="h-4 w-4 text-[rgba(0,0,0,0.55)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#242529]">
                {brandLabel} ending in {method.last4}
              </p>
              {expiry ? (
                <p className="mt-0.5 text-[12.5px] text-zinc-500">
                  Expires {expiry}
                </p>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-zinc-500">
                  Default payment method
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-[#eeeff1] bg-[#fbfbfb] text-zinc-400">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#242529]">
                No payment method on file
              </p>
              <p className="mt-0.5 text-[12.5px] text-zinc-500">
                Add one in Stripe to enable automatic billing.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
