import { requirePortalSession } from "@/lib/portal/session";
import { PORTAL_PASSWORD_RULE_HINTS } from "@/lib/portal/password";
import {
  updatePortalPassword,
  updatePortalProfile,
} from "@/app/(portal)/settings/actions";

type StatusKind = "success" | "error";

const statusMessages: Record<string, { kind: StatusKind; message: string }> = {
  "profile-saved": { kind: "success", message: "Profile updated." },
  "profile-error": {
    kind: "error",
    message: "We could not update your profile.",
  },
  "profile-invalid": { kind: "error", message: "Name is required." },
  "password-updated": { kind: "success", message: "Password updated." },
  "password-weak": {
    kind: "error",
    message: "Password does not meet the requirements below.",
  },
  "password-mismatch": {
    kind: "error",
    message: "The password confirmation did not match.",
  },
  "password-error": {
    kind: "error",
    message: "We could not update your password.",
  },
  "current-password-required": {
    kind: "error",
    message: "Enter your current password to continue.",
  },
  "current-password-wrong": {
    kind: "error",
    message: "The current password you entered is incorrect.",
  },
};

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string }>;
}) {
  const session = await requirePortalSession({ page: "settings" });
  const { status, reason } = await searchParams;
  const feedback = status ? statusMessages[status] : null;
  const feedbackClass =
    feedback?.kind === "error"
      ? "text-[13px] text-rose-600"
      : "text-[13px] text-emerald-600";
  const roleLabel = session.membership.is_owner ? "owner" : session.membership.role;

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      {feedback ? (
        <div>
          <p className={feedbackClass}>{feedback.message}</p>
          {feedback.kind === "error" && reason ? (
            <p className="mt-0.5 text-[13px] text-rose-600">{reason}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-900">Profile</h2>
          <p className="mt-1 text-[13px] text-zinc-500">
            Your personal portal profile and sign-in credentials.
          </p>
        </div>

        <form action={updatePortalProfile} className="space-y-4 px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-[#f7f7f8] px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white">
              {(session.membership.full_name || session.membership.email)
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-zinc-500">
                {session.membership.email}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
              {roleLabel}
            </span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-[13px] text-zinc-500">
              Display name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={session.membership.full_name ?? ""}
              className="h-9 w-full rounded-lg border border-[#eeeff1] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] text-zinc-500">Email</label>
            <input
              type="email"
              disabled
              value={session.membership.email}
              className="h-9 w-full rounded-lg border border-[#eeeff1] bg-zinc-50 px-3 text-[14px] text-zinc-500"
            />
            <p className="text-[12px] text-zinc-400">
              Contact support to change your email address.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Save profile
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-900">Password</h2>
          <p className="mt-1 text-[13px] text-zinc-500">
            Update the password used to sign in to the portal.
          </p>
        </div>

        <form action={updatePortalPassword} className="space-y-4 px-4 py-4">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-[13px] text-zinc-500">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="h-9 w-full rounded-lg border border-[#eeeff1] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="h-px bg-zinc-100" />

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] text-zinc-500">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={10}
              className="h-9 w-full rounded-lg border border-[#eeeff1] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
            <ul className="mt-1.5 space-y-0.5 text-[12px] text-zinc-500">
              {PORTAL_PASSWORD_RULE_HINTS.map((hint) => (
                <li key={hint} className="flex items-start gap-1.5">
                  <span aria-hidden="true">•</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[13px] text-zinc-500">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={10}
              className="h-9 w-full rounded-lg border border-[#eeeff1] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Update password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
