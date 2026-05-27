"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PortalRole } from "@/lib/permissions";

type PortalUser = {
  companyId: string;
  email: string;
  fullName: string | null;
  role: PortalRole;
  /** True in an admin read-only "view as client" observer session. */
  isImpersonating: boolean;
};

const PortalContext = createContext<PortalUser | null>(null);

export function PortalProvider({
  children,
  ...user
}: PortalUser & { children: ReactNode }) {
  return (
    <PortalContext.Provider value={user}>{children}</PortalContext.Provider>
  );
}

export function usePortalUser() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortalUser must be used within PortalProvider");
  return ctx;
}
