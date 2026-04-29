"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { BottomSheet } from "@/components/ui/bottom-sheet";

type Action = (formData: FormData) => void | Promise<void>;

type UserStatus = "invited" | "active" | "disabled";
type UserRole = "admin" | "staff";

export interface TeamRowMenuProps {
  userId: string;
  userRole: UserRole;
  userStatus: UserStatus;
  promoteAction: Action;
  demoteAction: Action;
  disableAction: Action;
  reenableAction: Action;
  resendAction: Action;
}

export function TeamRowMenu({
  userId,
  userRole,
  userStatus,
  promoteAction,
  demoteAction,
  disableAction,
  reenableAction,
  resendAction,
}: TeamRowMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || isMobile) return;

    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isMobile]);

  function close() {
    setOpen(false);
  }

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label="Row actions"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-[#525866] transition-colors hover:bg-zinc-100",
            open && "bg-zinc-100",
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <BottomSheet open={open} onClose={close} title="User actions">
          <div className="divide-y divide-[#eeeff1]">
            {userStatus === "disabled" ? (
              <SheetItemForm action={reenableAction} userId={userId} onSubmit={close}>
                <SheetItem icon={<UserCheck className="h-4 w-4" />} variant="positive">
                  Enable portal access
                </SheetItem>
              </SheetItemForm>
            ) : (
              <>
                {userStatus === "invited" ? (
                  <SheetItemForm action={resendAction} userId={userId} onSubmit={close}>
                    <SheetItem icon={<Mail className="h-4 w-4" />}>
                      Resend invitation
                    </SheetItem>
                  </SheetItemForm>
                ) : null}

                {userRole === "admin" ? (
                  <SheetItemForm action={demoteAction} userId={userId} onSubmit={close}>
                    <SheetItem icon={<UserMinus className="h-4 w-4" />}>
                      Demote to staff
                    </SheetItem>
                  </SheetItemForm>
                ) : (
                  <SheetItemForm action={promoteAction} userId={userId} onSubmit={close}>
                    <SheetItem icon={<UserPlus className="h-4 w-4" />}>
                      Promote to admin
                    </SheetItem>
                  </SheetItemForm>
                )}

                <SheetItemForm action={disableAction} userId={userId} onSubmit={close}>
                  <SheetItem icon={<UserX className="h-4 w-4" />} variant="destructive">
                    Disable portal access
                  </SheetItem>
                </SheetItemForm>
              </>
            )}
          </div>
        </BottomSheet>
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-[#525866] transition-colors",
          "hover:bg-zinc-100",
          open && "bg-zinc-100",
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[208px] overflow-hidden rounded-lg border border-[#eeeff1] bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
        >
          {userStatus === "disabled" ? (
            <MenuForm action={reenableAction} userId={userId}>
              <MenuItem icon={<UserCheck className="h-3.5 w-3.5" />} variant="positive">
                Enable portal access
              </MenuItem>
            </MenuForm>
          ) : (
            <>
              {userStatus === "invited" ? (
                <MenuForm action={resendAction} userId={userId}>
                  <MenuItem icon={<Mail className="h-3.5 w-3.5" />}>
                    Resend invitation
                  </MenuItem>
                </MenuForm>
              ) : null}

              {userRole === "admin" ? (
                <MenuForm action={demoteAction} userId={userId}>
                  <MenuItem icon={<UserMinus className="h-3.5 w-3.5" />}>
                    Demote to staff
                  </MenuItem>
                </MenuForm>
              ) : (
                <MenuForm action={promoteAction} userId={userId}>
                  <MenuItem icon={<UserPlus className="h-3.5 w-3.5" />}>
                    Promote to admin
                  </MenuItem>
                </MenuForm>
              )}

              <div className="my-1 h-px bg-[#eeeff1]" />

              <MenuForm action={disableAction} userId={userId}>
                <MenuItem icon={<UserX className="h-3.5 w-3.5" />} variant="destructive">
                  Disable portal access
                </MenuItem>
              </MenuForm>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SheetItemForm({
  action,
  userId,
  onSubmit,
  children,
}: {
  action: Action;
  userId: string;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="portalUserId" value={userId} />
      {children}
    </form>
  );
}

function SheetItem({
  icon,
  variant = "neutral",
  children,
}: {
  icon: React.ReactNode;
  variant?: "neutral" | "positive" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={cn(
        "flex w-full items-center gap-3 px-5 py-4 text-left text-[14px] font-medium transition-colors",
        variant === "neutral" && "text-[#242529] active:bg-[#fbfbfb]",
        variant === "positive" && "text-emerald-700 active:bg-emerald-50",
        variant === "destructive" && "text-rose-600 active:bg-rose-50",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

function MenuForm({
  action,
  userId,
  children,
}: {
  action: Action;
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="portalUserId" value={userId} />
      {children}
    </form>
  );
}

function MenuItem({
  icon,
  variant = "neutral",
  children,
}: {
  icon: React.ReactNode;
  variant?: "neutral" | "positive" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors",
        variant === "neutral" && "text-[#242529] hover:bg-[#f5f7fa]",
        variant === "positive" && "text-emerald-700 hover:bg-emerald-50",
        variant === "destructive" && "text-rose-600 hover:bg-rose-50",
      )}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}
