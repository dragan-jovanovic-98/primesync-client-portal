import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TeamRowMenu } from "@/components/settings/team-row-menu";
import { cn } from "@/lib/utils";
import {
  invitePortalUser,
  promotePortalUser,
  demotePortalUser,
  disablePortalUser,
  reenablePortalUser,
  regeneratePortalSetupLink,
} from "@/app/(portal)/settings/actions";

type PortalUserRow = {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "staff";
  is_owner: boolean;
  status: "invited" | "active" | "disabled";
  created_at: string;
};

type StatusKind = "success" | "error";

const statusMessages: Record<string, { kind: StatusKind; message: string }> = {
  "user-created": {
    kind: "success",
    message:
      "Portal access created. We sent an invitation email; the setup link below is a fallback if it doesn't arrive.",
  },
  "duplicate-user": {
    kind: "error",
    message: "That email already has access for this company.",
  },
  "duplicate-user-disabled": {
    kind: "error",
    message:
      "That email already belongs to a disabled team member. Enable them from the team list instead of re-inviting.",
  },
  "create-error": {
    kind: "error",
    message: "We could not create that portal user.",
  },
  "invalid-user": {
    kind: "error",
    message: "Enter a valid name and email to create access.",
  },
  "invalid-role": {
    kind: "error",
    message: "Choose a valid role for this user.",
  },
  "owner-locked": {
    kind: "error",
    message: "The owner account cannot be edited from this surface in v1.",
  },
  "self-locked": {
    kind: "error",
    message: "You cannot demote or disable your own account.",
  },
  "remove-blocked": {
    kind: "error",
    message: "Owners and your current account cannot be disabled here.",
  },
  "role-updated": {
    kind: "success",
    message: "The user role was updated.",
  },
  "role-update-error": {
    kind: "error",
    message: "We could not update that user's role.",
  },
  "user-disabled": {
    kind: "success",
    message:
      "Portal access has been disabled for that user. You can re-enable them anytime.",
  },
  "disable-error": {
    kind: "error",
    message: "We could not disable that user.",
  },
  "user-reenabled": {
    kind: "success",
    message: "Portal access has been re-enabled for that user.",
  },
  "reenable-error": {
    kind: "error",
    message: "We could not re-enable that user.",
  },
  "not-disabled": {
    kind: "error",
    message: "That user is not currently disabled.",
  },
  "setup-link-created": {
    kind: "success",
    message:
      "A new portal setup link is ready and we re-sent the invitation email.",
  },
};

const PILL_BASE =
  "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10.5px] font-semibold leading-none";

function roleBadgeStyle(role: string, isOwner: boolean) {
  if (isOwner) return "bg-[#242529] text-white";
  if (role === "admin") return "bg-zinc-100 text-zinc-700";
  return "border border-zinc-200 bg-white text-zinc-600";
}

function statusBadgeStyle(status: "invited" | "active" | "disabled") {
  if (status === "invited") return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-500";
}

export default async function TeamSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; setupLink?: string }>;
}) {
  const session = await requirePortalSession({ page: "settings" });

  if (session.role !== "admin") {
    redirect("/settings/account");
  }

  const { status, setupLink } = await searchParams;
  const feedback = status ? statusMessages[status] : null;
  const feedbackClass =
    feedback?.kind === "error"
      ? "text-[13px] text-rose-600"
      : "text-[13px] text-emerald-600";
  const supabase = await createServerSupabaseClient();

  const { data: portalUsers } = await supabase
    .from("portal_users")
    .select(
      "id, company_id, email, full_name, role, is_owner, status, created_at",
    )
    .eq("company_id", session.membership.company_id)
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true })
    .returns<PortalUserRow[]>();

  const users = portalUsers ?? [];

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      {feedback ? <p className={feedbackClass}>{feedback.message}</p> : null}
      {setupLink ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-700">
          <p className="font-medium">Portal setup link</p>
          <p className="mt-2 break-all">{setupLink}</p>
        </div>
      ) : null}

      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="flex items-center justify-between border-b border-[#eeeff1] px-5 py-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[#242529]">
              Team members
            </h2>
            <p className="mt-0.5 text-[12.5px] text-zinc-500">
              {users.length} {users.length === 1 ? "member" : "members"} in your
              company
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#eeeff1]">
          {users.map((user) => {
            const initials = (user.full_name || user.email)
              .slice(0, 2)
              .toUpperCase();
            const roleLabel = user.is_owner ? "owner" : user.role;
            const isSelf = user.email === session.membership.email;
            const showMenu = !user.is_owner && !isSelf;
            const rowDimmed = user.status === "disabled";

            return (
              <div
                key={user.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors last:rounded-b-lg hover:bg-[#fbfbfb]"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#242529] text-[12px] font-medium text-white",
                    rowDimmed && "opacity-50",
                  )}
                >
                  {initials}
                </div>

                <div className={cn("min-w-0 flex-1", rowDimmed && "opacity-60")}>
                  <p className="flex items-center gap-1.5 text-[14px] font-medium text-[#242529]">
                    <span className="truncate">
                      {user.full_name || user.email}
                    </span>
                    {isSelf ? (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                        you
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[12.5px] text-zinc-500">
                    {user.email}
                  </p>
                </div>

                <span
                  className={cn(PILL_BASE, roleBadgeStyle(user.role, user.is_owner))}
                >
                  {roleLabel}
                </span>

                {user.status !== "active" ? (
                  <span className={cn(PILL_BASE, statusBadgeStyle(user.status))}>
                    {user.status}
                  </span>
                ) : null}

                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {showMenu ? (
                    <TeamRowMenu
                      userId={user.id}
                      userRole={user.role}
                      userStatus={user.status}
                      promoteAction={promotePortalUser}
                      demoteAction={demotePortalUser}
                      disableAction={disablePortalUser}
                      reenableAction={reenablePortalUser}
                      resendAction={regeneratePortalSetupLink}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="border-b border-[#eeeff1] px-5 py-4">
          <h2 className="text-[14px] font-semibold text-[#242529]">
            Invite a team member
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">
            They&apos;ll receive an email with a link to set their password and
            join the portal.
          </p>
        </div>

        <form action={invitePortalUser} className="px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_140px]">
            <div className="space-y-1.5">
              <label
                htmlFor="fullName"
                className="block text-[12px] font-medium text-zinc-600"
              >
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Jane Doe"
                className="h-9 w-full rounded-lg border border-[#eeeff1] px-3 text-[13.5px] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[12px] font-medium text-zinc-600"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="jane@company.com"
                className="h-9 w-full rounded-lg border border-[#eeeff1] px-3 text-[13.5px] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="role"
                className="block text-[12px] font-medium text-zinc-600"
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="staff"
                className="h-9 w-full rounded-lg border border-[#eeeff1] bg-white px-3 text-[13.5px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Send invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
