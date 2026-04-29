import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrandPanel } from "@/components/layout/brand-panel";
import { BRAND } from "@/lib/brand";
import { PORTAL_PASSWORD_RULE_HINTS } from "@/lib/portal/password";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { completePortalPasswordReset } from "@/app/auth/recover/actions";

const statusMessages: Record<string, { kind: "error"; text: string }> = {
  mismatch: { kind: "error", text: "The password confirmation did not match." },
  "weak-password": {
    kind: "error",
    text: "Password does not meet the requirements below. Please update and try again.",
  },
  error: {
    kind: "error",
    text: "We couldn't update your password. Try the reset link again.",
  },
};

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=invalid-link");
  }

  const { status, reason } = await searchParams;
  const banner = status ? statusMessages[status] : null;

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
              Set a new password
            </h1>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-[rgba(0,0,0,0.55)]">
              Choose a new password for your {BRAND.wordmark} portal account.
            </p>
          </div>

          {banner ? (
            <div
              className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700"
              style={{ animation: "torqi-fade-up 400ms ease-out both" }}
            >
              <p>{banner.text}</p>
              {reason ? <p className="mt-1">{reason}</p> : null}
            </div>
          ) : null}

          <form
            action={completePortalPasswordReset}
            className="mt-7 space-y-4"
            style={{ animation: "torqi-fade-up 600ms ease-out 100ms both" }}
          >
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-[rgba(0,0,0,0.55)]"
              >
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                className="h-10 w-full rounded-lg border border-[#eeeff1] bg-white px-3 text-[14px] text-[#242529] transition-colors focus:border-[#c9c9cc] focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
              <ul className="mt-2 space-y-1 text-[12px] leading-[1.55] text-[rgba(0,0,0,0.55)]">
                {PORTAL_PASSWORD_RULE_HINTS.map((hint) => (
                  <li key={hint} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[rgba(0,0,0,0.35)]"
                    />
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-[13px] font-medium text-[rgba(0,0,0,0.55)]"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                className="h-10 w-full rounded-lg border border-[#eeeff1] bg-white px-3 text-[14px] text-[#242529] transition-colors focus:border-[#c9c9cc] focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>

            <button
              type="submit"
              className="group mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--torqi-orange)] px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(241,154,31,0.35)] transition-all hover:bg-[var(--torqi-orange-hover)] active:scale-[0.995]"
            >
              <span>Update password</span>
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
