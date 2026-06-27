"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check } from "lucide-react";
import {
  setCallNotes,
  setCallReviewed,
} from "@/app/(portal)/calls/actions";
import {
  CALL_TIME_FORMATS,
  formatCallDuration,
  formatInClientTz,
  formatPhoneNumber,
  getOutcomeBadge,
  normalizeSentiment,
  SENTIMENT_STYLES,
  type CallLogDetail,
} from "@/lib/calls";
import { getEndedReasonLabel } from "@/lib/call-ended-reasons";
import { cn } from "@/lib/utils";

function outcomeBadgeStyles(tier: "high" | "medium" | "low") {
  if (tier === "high") return "bg-[#F19A1F] text-white";
  if (tier === "medium") return "bg-[#0F1841] text-white";
  return "bg-zinc-100 text-zinc-500";
}

interface CallDetailProps {
  call: CallLogDetail;
  /** Shop's resolved IANA timezone for this call, so times match the call log
   * + time-of-day filter. Null falls back to America/Los_Angeles. */
  timeZone: string | null;
  /** Whether the current portal user can mark this call reviewed and edit notes. */
  canWriteReview: boolean;
}

export function CallDetail({ call, timeZone, canWriteReview }: CallDetailProps) {
  const badge = getOutcomeBadge(call.call_outcome);
  const sentiment = normalizeSentiment(call.user_sentiment);
  const sentimentStyle = sentiment ? SENTIMENT_STYLES[sentiment] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-medium text-zinc-700">
          {call.call_direction || "unknown"}
        </span>
        <span
          className={cn(
            "rounded-lg px-2.5 py-1 text-[12px] font-medium",
            outcomeBadgeStyles(badge.tier),
          )}
        >
          {badge.label}
        </span>
        {sentimentStyle ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
              sentimentStyle.pill,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", sentimentStyle.dot)} />
            {sentimentStyle.label}
          </span>
        ) : null}
        <div className="ml-auto">
          <ReviewedToggle
            callId={call.call_id}
            initialReviewed={call.reviewed}
            initialReviewedAt={call.reviewed_at}
            canWriteReview={canWriteReview}
          />
        </div>
      </div>

      {/* Mobile-only metadata strip — replaces Call Info / Caller cards on phones */}
      <p className="-mt-2 text-[12.5px] text-zinc-500 md:hidden">
        {formatInClientTz(call.call_date, timeZone, CALL_TIME_FORMATS.date)}
        {" · "}
        {formatInClientTz(call.call_date, timeZone, CALL_TIME_FORMATS.time)}
        {" · "}
        {formatCallDuration(call.call_duration_s)}
        {" · "}
        {call.agent_name || "—"}
        {" · "}
        {formatPhoneNumber(call.phone_number)}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-[#eeeff1] bg-white">
            <div className="border-b border-[#eeeff1] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#242529]">Summary</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-[14px] leading-6 text-[#242529]">
                {call.summary || "No summary available."}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-[#eeeff1] bg-white">
            <div className="border-b border-[#eeeff1] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#242529]">Recording</h2>
            </div>
            <div className="px-5 py-4">
              {call.recording_url ? (
                <audio controls className="w-full">
                  <source src={call.recording_url} />
                  Your browser does not support audio playback.
                </audio>
              ) : (
                <p className="text-[14px] text-[rgba(0,0,0,0.7)]">Recording unavailable.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#eeeff1] bg-white">
            <div className="border-b border-[#eeeff1] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#242529]">Transcript</h2>
            </div>
            <div className="px-5 py-5">
              <TranscriptChat transcript={call.transcript} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="hidden rounded-lg border border-[#eeeff1] bg-white md:block">
            <div className="border-b border-[#eeeff1] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#242529]">Call Info</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-[14px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[rgba(0,0,0,0.45)]">Date</span>
                <span className="font-medium text-[#242529]">
                  {formatInClientTz(call.call_date, timeZone, CALL_TIME_FORMATS.dateYear)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[rgba(0,0,0,0.45)]">Time</span>
                <span className="font-medium text-[#242529]">
                  {formatInClientTz(call.call_date, timeZone, CALL_TIME_FORMATS.time)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[rgba(0,0,0,0.45)]">Duration</span>
                <span className="font-mono font-medium tabular-nums text-[#242529]">
                  {formatCallDuration(call.call_duration_s)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[rgba(0,0,0,0.45)]">Agent</span>
                <span className="font-medium text-[#242529]">{call.agent_name || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[rgba(0,0,0,0.45)]">Ended Reason</span>
                <span className="font-medium text-right text-[#242529]">
                  {getEndedReasonLabel(call.ended_reason)}
                </span>
              </div>
            </div>
          </section>

          <section className="hidden rounded-lg border border-[#eeeff1] bg-white md:block">
            <div className="border-b border-[#eeeff1] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#242529]">Caller</h2>
            </div>
            <div className="space-y-2 px-5 py-4 text-[14px]">
              <p className="font-medium text-[#242529]">{formatPhoneNumber(call.phone_number)}</p>
              <p className="text-[rgba(0,0,0,0.45)]">
                Call ID: <span className="font-mono">{call.call_id}</span>
              </p>
            </div>
          </section>

          <NotesPanel
            callId={call.call_id}
            initialNotes={call.client_notes}
            canWriteReview={canWriteReview}
          />
        </div>
      </div>
    </div>
  );
}

type TranscriptTurn = { speaker: "agent" | "user"; text: string };

function parseTranscript(raw: string | null): TranscriptTurn[] {
  if (!raw) return [];
  const turns: TranscriptTurn[] = [];
  const lineRegex = /^(agent|user)\s*:\s*(.*)$/i;

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(lineRegex);
    if (match) {
      const speaker = match[1].toLowerCase() === "agent" ? "agent" : "user";
      const text = match[2].trim();
      if (text) turns.push({ speaker, text });
    } else {
      const trimmed = line.trim();
      if (trimmed && turns.length > 0) {
        turns[turns.length - 1].text += ` ${trimmed}`;
      }
    }
  }

  return turns;
}

function TranscriptChat({ transcript }: { transcript: string | null }) {
  const turns = parseTranscript(transcript);

  if (turns.length === 0) {
    return (
      <p className="text-[14px] text-[rgba(0,0,0,0.7)]">
        No transcript available.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {turns.map((turn, index) => {
        const isAgent = turn.speaker === "agent";
        return (
          <div
            key={index}
            className={cn(
              "flex",
              isAgent ? "justify-start" : "justify-end",
            )}
          >
            <div className="flex max-w-[78%] flex-col gap-1">
              <span
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]",
                  isAgent ? "text-left" : "text-right",
                )}
              >
                {isAgent ? "Agent" : "Caller"}
              </span>
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-[14px] leading-[1.45]",
                  isAgent
                    ? "rounded-tl-sm bg-[#f5f5f7] text-[#242529]"
                    : "rounded-tr-sm bg-[#242529] text-white",
                )}
              >
                {turn.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ReviewedToggleProps {
  callId: string;
  initialReviewed: boolean;
  initialReviewedAt: string | null;
  canWriteReview: boolean;
}

function ReviewedToggle({
  callId,
  initialReviewed,
  initialReviewedAt,
  canWriteReview,
}: ReviewedToggleProps) {
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [reviewedAt, setReviewedAt] = useState<string | null>(initialReviewedAt);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    const previousReviewed = reviewed;
    const previousAt = reviewedAt;
    setReviewed(next);
    setReviewedAt(next ? new Date().toISOString() : null);
    startTransition(async () => {
      try {
        const updated = await setCallReviewed(callId, next);
        setReviewed(updated.reviewed);
        setReviewedAt(updated.reviewed_at);
      } catch {
        setReviewed(previousReviewed);
        setReviewedAt(previousAt);
      }
    });
  }

  if (reviewed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        <span>
          Reviewed
          {reviewedAt
            ? ` · ${formatDistanceToNow(new Date(reviewedAt), { addSuffix: true })}`
            : ""}
        </span>
        {canWriteReview ? (
          <button
            type="button"
            onClick={() => toggle(false)}
            disabled={isPending}
            className="ml-1 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Undo
          </button>
        ) : null}
      </div>
    );
  }

  if (!canWriteReview) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => toggle(true)}
      disabled={isPending}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa] disabled:opacity-50"
    >
      <Check className="h-3.5 w-3.5" />
      Mark reviewed
    </button>
  );
}

interface NotesPanelProps {
  callId: string;
  initialNotes: string | null;
  canWriteReview: boolean;
}

function NotesPanel({ callId, initialNotes, canWriteReview }: NotesPanelProps) {
  const [savedValue, setSavedValue] = useState(initialNotes ?? "");
  const [value, setValue] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = value !== savedValue;

  // If the user has no write permission and there are no notes, hide the
  // panel entirely so we don't waste real estate on an empty card.
  if (!canWriteReview && !savedValue) {
    return null;
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await setCallNotes(callId, value);
        const next = updated.client_notes ?? "";
        setSavedValue(next);
        setValue(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save notes");
      }
    });
  }

  return (
    <section className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="border-b border-[#eeeff1] px-5 py-4">
        <h2 className="text-[15px] font-semibold text-[#242529]">Notes</h2>
      </div>
      <div className="space-y-3 px-5 py-4">
        {canWriteReview ? (
          <>
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Add notes about this call..."
              disabled={isPending}
              className="min-h-[96px] w-full resize-y rounded-md border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.25)] focus:border-[#335cff] focus:outline-none disabled:opacity-60"
            />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[rgba(0,0,0,0.45)]">
                {error ? (
                  <span className="text-rose-600">{error}</span>
                ) : isPending ? (
                  "Saving..."
                ) : isDirty ? (
                  "Unsaved changes"
                ) : savedValue ? (
                  "Saved"
                ) : (
                  ""
                )}
              </span>
              <button
                type="button"
                onClick={save}
                disabled={!isDirty || isPending}
                className="rounded-md bg-[#242529] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3a3b3f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-[14px] leading-6 text-[#242529]">
            {savedValue}
          </p>
        )}
      </div>
    </section>
  );
}
