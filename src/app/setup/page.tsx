import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { BrandPanel } from "@/components/layout/brand-panel";
import { ConsentCheckbox } from "@/components/legal/consent-checkbox";
import { BRAND } from "@/lib/brand";
import { completePortalSetup } from "@/app/setup/actions";
import { PORTAL_PASSWORD_RULE_HINTS } from "@/lib/portal/password";
import { getPortalSetupToken, isPortalSetupTokenUsable } from "@/lib/portal/setup-tokens";

const messages = {
  invalid: "Enter your full name to continue.",
  mismatch: "The password confirmation did not match.",
  "weak-password":
    "Password does not meet the requirements below. Please update and try again.",
  "agree-required":
    "Please confirm you agree to the Terms of Service and Privacy Policy to continue.",
  error: "We could not complete setup. Try the link again or request a new one.",
  expired: "That setup link has expired or was already used. Request a new one.",
  "invalid-token": "That setup link is invalid. Request a fresh portal setup link.",
} as const;

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    status?: keyof typeof messages;
    reason?: string;
  }>;
}) {
  const { token = "", status, reason } = await searchParams;
  const message = status ? messages[status] : null;
  const setupToken = token ? await getPortalSetupToken(token) : null;
  const portalUser = setupToken
    ? Array.isArray(setupToken.portal_user)
      ? setupToken.portal_user[0]
      : setupToken.portal_user
    : null;
  const isValid = !!token && !!portalUser && isPortalSetupTokenUsable(setupToken);

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
              Set up your portal access
            </h1>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-[rgba(0,0,0,0.7)]">
              Create your password to access the {BRAND.wordmark} client portal.
            </p>
          </div>

          {message ? (
            <div
              className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700"
              style={{ animation: "torqi-fade-up 400ms ease-out both" }}
            >
              <p>{message}</p>
              {reason ? <p className="mt-1">{reason}</p> : null}
            </div>
          ) : null}

          {isValid ? (
            <form
              action={completePortalSetup}
              className="mt-7 space-y-4"
              style={{ animation: "torqi-fade-up 600ms ease-out 100ms both" }}
            >
              <input type="hidden" name="token" value={token} />

              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-[13px] font-medium text-[rgba(0,0,0,0.7)]"
                >
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  defaultValue={portalUser.full_name ?? ""}
                  required
                  className="h-10 w-full rounded-lg border border-[#eeeff1] bg-white px-3 text-[14px] text-[#242529] transition-colors focus:border-[#c9c9cc] focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-[rgba(0,0,0,0.7)]"
                >
                  Password
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
                <ul className="mt-2 space-y-1 text-[12px] leading-[1.55] text-[rgba(0,0,0,0.7)]">
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
                  className="block text-[13px] font-medium text-[rgba(0,0,0,0.7)]"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-10 w-full rounded-lg border border-[#eeeff1] bg-white px-3 text-[14px] text-[#242529] transition-colors focus:border-[#c9c9cc] focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
                />
              </div>

              <div className="pt-1">
                <ConsentCheckbox />
              </div>

              <button
                type="submit"
                className="group mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--torqi-orange)] px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(241,154,31,0.35)] transition-all hover:bg-[var(--torqi-orange-hover)] active:scale-[0.995]"
              >
                <span>Complete setup</span>
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </form>
          ) : (
            <div
              className="mt-6 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-5 text-[13px] leading-[1.55] text-[rgba(0,0,0,0.7)]"
              style={{ animation: "torqi-fade-up 500ms ease-out both" }}
            >
              <p className="font-semibold text-[#242529]">Setup link unavailable</p>
              <p className="mt-1">
                This setup link is not usable. Request a fresh link from a portal admin.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
