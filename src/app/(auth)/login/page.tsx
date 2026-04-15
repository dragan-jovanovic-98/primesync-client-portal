import Link from "next/link";
import { signInWithPassword } from "@/app/(auth)/login/actions";

const statusMessages = {
  invalid: "Enter your email and password to continue.",
  error: "That sign-in attempt failed. Check your password or complete setup first.",
} as const;

const errorMessages = {
  "no-access": "This email is not yet mapped to a portal account. Contact Primesync support.",
  disabled: "This account has been disabled. Contact Primesync support for access.",
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
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left — feature overview */}
        <div className="rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-8">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#242529] text-[10px] font-bold text-white">
            P
          </div>
          <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.3px] text-[#242529]">
            Primesync Client Portal
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-[rgba(0,0,0,0.55)]">
            Visibility and control for your voice agent program. Review calls,
            manage settings, track billing, and keep your team aligned.
          </p>
          <div className="mt-8 space-y-3">
            {[
              ["Call visibility", "See what your agents handled, when they transferred, and what happened after hours."],
              ["Role-based access", "Admins manage billing and users while staff stays focused on daily operations."],
              ["Operational settings", "Business hours, closures, and support requests are routed through one place."],
              ["Referral and support", "Referral tools and direct help paths are built into the workspace."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-[#eeeff1] bg-white p-4">
                <p className="text-sm font-medium text-[#242529]">{title}</p>
                <p className="mt-1 text-[13px] leading-5 text-[rgba(0,0,0,0.55)]">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — sign-in form */}
        <div className="flex flex-col justify-center">
          <h2 className="text-[20px] font-semibold tracking-[-0.3px] text-[#242529]">
            Sign in
          </h2>
          <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.55)]">
            Enter your email and password to access the portal.
          </p>

          {message ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2.5 text-[13px] ${
                isError
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </p>
          ) : null}

          <form action={signInWithPassword} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] text-zinc-500">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[13px] text-zinc-500">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-[13px] text-[rgba(0,0,0,0.45)]">
            Need first-time access? Use your portal setup link or ask an admin to
            create one.
          </p>
          <Link
            href="/"
            className="mt-2 inline-block text-[13px] font-medium text-[#242529] hover:underline"
          >
            Back to portal home
          </Link>
        </div>
      </div>
    </main>
  );
}
