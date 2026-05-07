import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { BrandPanel } from "@/components/layout/brand-panel";
import { ConsentCheckbox } from "@/components/legal/consent-checkbox";
import { BRAND } from "@/lib/brand";
import { getStaleDocumentTypes } from "@/lib/legal/consents";
import {
  LEGAL_DOCUMENT_LABELS,
  LEGAL_DOCUMENT_TYPES,
  type LegalDocumentType,
} from "@/lib/legal/versions";
import { requirePortalSession } from "@/lib/portal/session";
import {
  completeConsentReacceptance,
  signOutFromAcceptUpdates,
} from "@/app/accept-updates/actions";
import { redirect } from "next/navigation";

const messages = {
  "agree-required":
    "Please confirm you agree to the Terms of Service and Privacy Policy to continue.",
  error: "Something went wrong. Try again.",
} as const;

function safeNextPath(input: string | undefined): string {
  if (!input) return "/dashboard";
  if (!input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  return input;
}

function summarizeStaleDocs(stale: LegalDocumentType[]): string {
  const labels = stale.map((doc) => LEGAL_DOCUMENT_LABELS[doc]);
  if (labels.length === 0) return "";
  if (labels.length === 1) return `our ${labels[0]}`;
  if (labels.length === 2) return `our ${labels[0]} and ${labels[1]}`;
  return `our ${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export default async function AcceptUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    status?: keyof typeof messages;
  }>;
}) {
  const { next, status } = await searchParams;
  const session = await requirePortalSession();
  const stale = await getStaleDocumentTypes(session.membership.id);
  const nextPath = safeNextPath(next);

  if (stale.length === 0) {
    redirect(nextPath);
  }

  const message = status ? messages[status] : null;
  const summary = summarizeStaleDocs(stale);
  const everythingNew = stale.length === LEGAL_DOCUMENT_TYPES.length;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.2fr_0.8fr]">
      <BrandPanel />

      <section className="relative flex items-center justify-center px-6 py-14 sm:px-10">
        {/* Compact brand lockup — mobile only */}
        <div className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
          <Image
            src="/brand/torqi-favicon-dark.svg"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-md"
          />
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-[#242529]">
            {BRAND.wordmark}
          </span>
        </div>

        <div className="w-full max-w-[420px]">
          <div style={{ animation: "torqi-fade-up 550ms ease-out both" }}>
            <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#242529]">
              {everythingNew
                ? "We've updated our policies"
                : "We've updated a policy"}
            </h1>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-[rgba(0,0,0,0.7)]">
              Please review and accept {summary} to continue using the{" "}
              {BRAND.wordmark} portal.
            </p>
          </div>

          {message ? (
            <div
              className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700"
              style={{ animation: "torqi-fade-up 400ms ease-out both" }}
            >
              {message}
            </div>
          ) : null}

          <form
            action={completeConsentReacceptance}
            className="mt-7 space-y-5"
            style={{ animation: "torqi-fade-up 600ms ease-out 100ms both" }}
          >
            <input type="hidden" name="next" value={nextPath} />

            <ConsentCheckbox />

            <button
              type="submit"
              className="group inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--torqi-orange)] px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(241,154,31,0.35)] transition-all hover:bg-[var(--torqi-orange-hover)] active:scale-[0.995]"
            >
              <span>I agree, continue</span>
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </form>

          <form
            action={signOutFromAcceptUpdates}
            className="mt-5 border-t border-[#eeeff1] pt-5 text-[12.5px] leading-[1.55] text-[rgba(0,0,0,0.5)]"
            style={{ animation: "torqi-fade-up 600ms ease-out 220ms both" }}
          >
            <p>
              Not ready to accept?{" "}
              <button
                type="submit"
                className="text-[#242529] underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                Sign out
              </button>
              .
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
