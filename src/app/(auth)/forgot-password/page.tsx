import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandPanel } from "@/components/layout/brand-panel";
import { BRAND } from "@/lib/brand";
import { requestPortalPasswordReset } from "@/app/(auth)/forgot-password/actions";

const statusMessages = {
  sent: "Check your email — we just sent a link to reset your password.",
  invalid: "Enter the email associated with your portal account.",
} as const;

const errorMessages = {
  "no-account":
    "We couldn't find a portal account for that email. Check the spelling, or contact TorQi support.",
  disabled:
    "This account has been disabled. Contact TorQi support for access.",
  "setup-required":
    "Your portal access has not been set up yet. Use your setup link instead — or ask an admin to send a new one.",
  "invalid-link":
    "That reset link expired or was already used. Request a new one below.",
  server:
    "Something went wrong while sending the reset email. Try again in a moment.",
} as const;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: keyof typeof statusMessages;
    error?: keyof typeof errorMessages;
  }>;
}) {
  const { status, error } = await searchParams;
  const banner: { kind: "success" | "error"; text: string } | null = error
    ? { kind: "error", text: errorMessages[error] }
    : status === "sent"
      ? { kind: "success", text: statusMessages.sent }
      : status === "invalid"
        ? { kind: "error", text: statusMessages.invalid }
        : null;

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

        <div className="w-full max-w-[380px]">
          <div style={{ animation: "torqi-fade-up 550ms ease-out both" }}>
            <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#242529]">
              Forgot your password?
            </h1>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-[rgba(0,0,0,0.55)]">
              Enter the email on your account and we&apos;ll send you a link to choose a new one.
            </p>
          </div>

          {banner ? (
            <p
              className={`mt-5 rounded-lg border px-3 py-2.5 text-[13px] ${
                banner.kind === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
              style={{ animation: "torqi-fade-up 400ms ease-out both" }}
            >
              {banner.text}
            </p>
          ) : null}

          <form
            action={requestPortalPasswordReset}
            className="mt-7 space-y-4"
            style={{ animation: "torqi-fade-up 600ms ease-out 100ms both" }}
          >
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-[rgba(0,0,0,0.55)]"
              >
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                className="h-10 w-full rounded-lg border border-[#eeeff1] bg-white px-3 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.35)] transition-colors focus:border-[#c9c9cc] focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>

            <button
              type="submit"
              className="group mt-1 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--torqi-orange)] px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(241,154,31,0.35)] transition-all hover:bg-[var(--torqi-orange-hover)] active:scale-[0.995]"
            >
              <span>Send reset link</span>
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </form>

          <div
            className="mt-7 border-t border-[#eeeff1] pt-5 text-[12.5px] leading-[1.55] text-[rgba(0,0,0,0.5)]"
            style={{ animation: "torqi-fade-up 600ms ease-out 220ms both" }}
          >
            <p>
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-medium text-[#242529] underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
