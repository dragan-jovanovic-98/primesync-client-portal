import { requirePortalSession } from "@/lib/portal/session";
import { Copy, Gift } from "lucide-react";

export default async function ReferralsPage() {
  await requirePortalSession({ page: "referrals" });

  return (
    <div className="space-y-6">
      {/* Referral link card */}
      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="px-5 py-4">
          <p className="text-base font-semibold text-[#242529]">
            Your Referral Link
          </p>
        </div>
        <div className="space-y-3 px-5 pb-5">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-[rgba(0,0,0,0.7)]">
              Referral link will appear once connected
            </code>
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#525866] transition-colors hover:bg-[#f8f9fa]">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-[rgba(0,0,0,0.45)]">
            Share this link with other businesses. When they sign up,
            you&apos;ll both benefit.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          ["Total Referrals", "0"],
          ["Signed Up", "0"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#eeeff1] bg-white p-5"
          >
            <p className="text-sm text-[rgba(0,0,0,0.7)]">{label}</p>
            <p className="mt-1 text-3xl font-bold text-[#242529]">{value}</p>
          </div>
        ))}
      </div>

      {/* Referral history table */}
      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="px-5 py-4">
          <p className="text-base font-semibold text-[#242529]">
            Referral History
          </p>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[14px] text-[rgba(0,0,0,0.7)]">
            No referrals yet.
          </p>
        </div>
      </div>

      {/* Rewards placeholder — Courtside pattern */}
      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="flex items-center gap-4 px-5 py-6">
          <Gift className="h-8 w-8 text-[rgba(0,0,0,0.35)]" />
          <div>
            <p className="font-semibold text-[#242529]">
              Referral rewards coming soon
            </p>
            <p className="text-sm text-[rgba(0,0,0,0.7)]">
              Earn credits and discounts for every business you refer that signs
              up for TorQi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
