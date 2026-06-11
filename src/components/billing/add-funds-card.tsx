"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/billing/credit-packs";
import { formatBillingCurrency } from "@/lib/billing";

interface AddFundsCardProps {
  walletBalance: number;
}

const LARGEST_PACK = CREDIT_PACKS[CREDIT_PACKS.length - 1];

export function AddFundsCard({ walletBalance }: AddFundsCardProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deficit = walletBalance < 0 ? Math.abs(walletBalance) : 0;

  // Smallest pack that clears the deficit; never below the smallest pack.
  const suggested =
    deficit > 0
      ? CREDIT_PACKS.find((pack) => pack.amountDollars >= deficit) ?? LARGEST_PACK
      : null;
  const needsMultiple = deficit > LARGEST_PACK.amountDollars;

  async function startTopup(tier: string) {
    setError(null);
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/billing/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoadingTier(null);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoadingTier(null);
    }
  }

  return (
    <section className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="border-b border-[#eeeff1] px-5 py-4">
        <h2 className="text-[14px] font-semibold text-[#242529]">Add funds</h2>
        <p className="mt-0.5 text-[12.5px] text-zinc-500">
          Top up your wallet balance. Funds are added automatically after payment.
        </p>
      </div>

      <div className="px-5 py-5">
        {deficit > 0 && suggested ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            Your wallet is overdrawn by{" "}
            <strong className="font-semibold">{formatBillingCurrency(deficit)}</strong>. The{" "}
            {formatBillingCurrency(suggested.amountDollars)} pack will restore a positive balance
            {needsMultiple ? " (you may need more than one)" : ""}.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => {
            const isSuggested = suggested?.tier === pack.tier;
            const isLoading = loadingTier === pack.tier;
            return (
              <button
                key={pack.tier}
                type="button"
                disabled={loadingTier !== null}
                onClick={() => startTopup(pack.tier)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-lg border px-4 py-5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSuggested
                    ? "border-[#242529] bg-[#fbfbfb]"
                    : "border-[#e5e5e5] hover:border-[#242529] hover:bg-[#f8f9fa]"
                }`}
              >
                {isSuggested ? (
                  <span className="absolute -top-2 rounded-full bg-[#242529] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    Recommended
                  </span>
                ) : null}
                <Wallet className="h-4 w-4 text-[rgba(0,0,0,0.55)]" />
                <span className="font-mono text-[18px] font-semibold tabular-nums text-[#242529]">
                  {formatBillingCurrency(pack.amountDollars)}
                </span>
                <span className="text-[12px] text-zinc-500">
                  {isLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Redirecting…
                    </span>
                  ) : (
                    "credit pack"
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mt-3 text-[13px] text-red-600">{error}</p>
        ) : (
          <p className="mt-3 text-[12px] text-zinc-400">
            You&apos;ll be redirected to Stripe to pay securely. A receipt is added to your invoice
            history.
          </p>
        )}
      </div>
    </section>
  );
}
