import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandPanel } from "@/components/layout/brand-panel";
import { BRAND } from "@/lib/brand";
import { signInWithPassword } from "@/app/(auth)/login/actions";

const statusMessages = {
  invalid: "Enter your email and password to continue.",
  error: "That sign-in attempt failed. Check your password or complete setup first.",
  "password-reset-complete":
    "Password updated. Sign in with your new password.",
} as const;

const errorMessages = {
  "no-access": "This email is not yet mapped to a portal account. Contact TorQi support.",
  disabled: "This account has been disabled. Contact TorQi support for access.",
  "setup-required": "Your portal access has not been set up yet. Use your setup link first.",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: keyof typeof statusMessages;
    error?: keyof typeof errorMessages;
  }>;
}) {
  const { status, error } = await searchParams;
  const message = status ? statusMessages[status] : error ? errorMessages[error] : null;
  const isError = !!error;

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
              Sign in
            </h1>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-[rgba(0,0,0,0.7)]">
              Welcome back. Enter your credentials to access the portal.
            </p>
          </div>

          {message ? (
            <p
              className={`mt-5 rounded-lg border px-3 py-2.5 text-[13px] ${
                isError
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
              style={{ animation: "torqi-fade-up 400ms ease-out both" }}
            >
              {message}
            </p>
          ) : null}

          <form
            action={signInWithPassword}
            className="mt-7 space-y-4"
            style={{ animation: "torqi-fade-up 600ms ease-out 100ms both" }}
          >
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-[rgba(0,0,0,0.7)]"
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

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-[rgba(0,0,0,0.7)]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[12.5px] text-[rgba(0,0,0,0.5)] underline-offset-2 transition-colors hover:text-[#242529] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-10 w-full rounded-lg border border-[#eeeff1] bg-white px-3 text-[14px] text-[#242529] transition-colors focus:border-[#c9c9cc] focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
              />
            </div>

            <button
              type="submit"
              className="group mt-1 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--torqi-orange)] px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(241,154,31,0.35)] transition-all hover:bg-[var(--torqi-orange-hover)] active:scale-[0.995]"
            >
              <span>Sign in</span>
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </form>

          <div
            className="mt-7 border-t border-[#eeeff1] pt-5 text-[12.5px] leading-[1.55] text-[rgba(0,0,0,0.5)]"
            style={{ animation: "torqi-fade-up 600ms ease-out 220ms both" }}
          >
            <p className="font-medium text-[rgba(0,0,0,0.6)]">
              Need first-time access?
            </p>
            <p className="mt-0.5 text-[rgba(0,0,0,0.45)]">
              Use your portal setup link, or ask an admin to send one.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
