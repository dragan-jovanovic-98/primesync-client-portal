import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Persistent global banner shown to admin portal users until they add a payment
 * method on the new TorQi Stripe account. Driven by `clients.torqi_consent_at`
 * being NULL in combination with `clients.stripe_account = 'legacy'`.
 *
 * The banner is non-dismissible by design — the action it requests is required
 * and the banner disappears automatically once the `payment_method.attached`
 * webhook handler in the admin dashboard sets `torqi_consent_at`.
 *
 * The "Add payment method" link routes through the existing customer-portal
 * handoff at `/api/billing/customer-portal`, which after Phase 6 always opens a
 * Stripe Customer Portal session against the TorQi account.
 */
export function ReconsentBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="flex-1 text-sm text-amber-900">
          <strong className="font-semibold">Action required:</strong> please
          re-add your payment method to keep service uninterrupted. Your card
          details are securely managed by Stripe.
        </p>
        <Link
          href="/api/billing/customer-portal"
          className="shrink-0 text-sm font-medium text-amber-900 underline hover:text-amber-950"
        >
          Add payment method →
        </Link>
      </div>
    </div>
  );
}
