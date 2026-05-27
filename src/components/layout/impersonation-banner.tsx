import { Eye } from "lucide-react";

/**
 * Persistent, non-dismissable bar shown on every portal page during an admin
 * "view as client" observer session. Server component. The Return-to-Admin link
 * hits /impersonate/exit (plain <a> — the route 302s to the external admin app,
 * which next/link shouldn't try to client-navigate).
 */
export function ImpersonationBanner({ clientName }: { clientName: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900 sm:px-8">
      <span className="flex min-w-0 items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Viewing <span className="font-semibold">{clientName}</span> as admin — read-only
        </span>
      </span>
      <a
        href="/impersonate/exit"
        className="shrink-0 rounded-md border border-amber-400 bg-amber-200 px-3 py-1 font-semibold text-amber-900 transition-colors hover:bg-amber-300"
      >
        Return to Admin
      </a>
    </div>
  );
}
