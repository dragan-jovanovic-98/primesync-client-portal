import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePortalSession } from "@/lib/portal/session";
import { getCallById, getCallTimezone } from "@/app/(portal)/calls/actions";
import { CallDetail } from "@/components/calls/call-detail";
import { hasCapability } from "@/lib/permissions";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePortalSession({ page: "calls" });
  const { id } = await params;
  const callId = decodeURIComponent(id);

  const [call, timeZone] = await Promise.all([
    getCallById(callId),
    getCallTimezone(callId),
  ]);

  if (!call) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/calls"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-[#525866] transition-colors hover:bg-[#f5f5f5] hover:text-[#242529]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Call Logs
      </Link>
      <CallDetail
        call={call}
        timeZone={timeZone}
        canWriteReview={hasCapability(session.role, "calls.write_review")}
      />
    </div>
  );
}
