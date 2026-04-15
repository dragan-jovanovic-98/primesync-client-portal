import { completePortalSetup } from "@/app/setup/actions";
import { PORTAL_PASSWORD_RULE_HINTS } from "@/lib/portal/password";
import { getPortalSetupToken, isPortalSetupTokenUsable } from "@/lib/portal/setup-tokens";

const messages = {
  invalid: "Enter your full name to continue.",
  mismatch: "The password confirmation did not match.",
  "weak-password":
    "Password does not meet the requirements below. Please update and try again.",
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
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#242529] text-[10px] font-bold text-white">
          P
        </div>
        <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.3px] text-[#242529]">
          Set up your portal access
        </h1>
        <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.55)]">
          Create your password to access the Primesync client portal.
        </p>

        {message ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
            <p>{message}</p>
            {reason ? <p className="mt-1">{reason}</p> : null}
          </div>
        ) : null}

        {isValid ? (
          <form action={completePortalSetup} className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-[13px] text-zinc-500">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                defaultValue={portalUser.full_name ?? ""}
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                required
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
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                minLength={10}
                required
              />
              <ul className="mt-1.5 space-y-0.5 text-[12px] text-[rgba(0,0,0,0.55)]">
                {PORTAL_PASSWORD_RULE_HINTS.map((hint) => (
                  <li key={hint} className="flex items-start gap-1.5">
                    <span aria-hidden="true">•</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-[13px] text-zinc-500"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="h-8 w-full rounded-lg border border-[#eeeff1] px-2.5 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Complete setup
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-4 text-[13px] text-[rgba(0,0,0,0.55)]">
            This setup link is not usable. Request a fresh link from a portal
            admin.
          </div>
        )}
      </div>
    </main>
  );
}
