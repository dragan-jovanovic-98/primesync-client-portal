// Ended-reason vocabulary for the portal. Single source of truth shared by the
// /calls filter, the call detail view, and the CSV export. Raw values are
// Retell disconnection reasons stored on all_client_calls.ended_reason.

// Filter option keys (what the URL ?ended_reason= carries) → raw DB values.
// Most map 1:1; "error" groups the error_* variants so the dropdown shows a
// single "System error" entry (mirrors OUTCOME_CATEGORY_VALUES).
export const ENDED_REASON_FILTER_VALUES: Record<string, string[]> = {
  transfer: ["call_transfer"],
  caller_hangup: ["user_hangup"],
  agent_hangup: ["agent_hangup"],
  inactivity: ["inactivity"],
  voicemail: ["voicemail_reached"],
  max_duration: ["max_duration_reached"],
  no_answer: ["dial_no_answer"],
  line_busy: ["dial_busy"],
  no_audio: ["error_no_audio_received"],
  error: ["error_unknown", "error_retell"],
  payment: ["no_valid_payment"],
};

// Label shown for each filter option key (order defines dropdown order).
export const ENDED_REASON_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "transfer", label: "Transferred to staff" },
  { value: "caller_hangup", label: "Caller hung up" },
  { value: "agent_hangup", label: "Agent ended call" },
  { value: "inactivity", label: "Ended — no response" },
  { value: "voicemail", label: "Reached voicemail" },
  { value: "max_duration", label: "Reached max length" },
  { value: "no_answer", label: "No answer" },
  { value: "line_busy", label: "Line busy" },
  { value: "no_audio", label: "No audio" },
  { value: "error", label: "System error" },
  { value: "payment", label: "Payment issue" },
];

// Raw stored value → clean label, for the detail view and CSV.
export const ENDED_REASON_LABELS: Record<string, string> = {
  call_transfer: "Transferred to staff",
  user_hangup: "Caller hung up",
  agent_hangup: "Agent ended call",
  inactivity: "Ended — no response",
  voicemail_reached: "Reached voicemail",
  max_duration_reached: "Reached max length",
  dial_no_answer: "No answer",
  dial_busy: "Line busy",
  error_no_audio_received: "No audio",
  error_unknown: "System error",
  error_retell: "System error",
  no_valid_payment: "Payment issue",
};

// Narrow the filter options to only those whose underlying raw value(s) are
// actually present in the given set (e.g. the reasons a client's calls have).
// A grouped option (like "System error") survives if ANY of its raw values
// is present. Preserves the canonical option order.
export function filterEndedReasonOptions(
  presentRawValues: Iterable<string>,
): Array<{ value: string; label: string }> {
  const present = presentRawValues instanceof Set
    ? presentRawValues
    : new Set(presentRawValues);
  return ENDED_REASON_FILTER_OPTIONS.filter((opt) =>
    (ENDED_REASON_FILTER_VALUES[opt.value] ?? []).some((raw) => present.has(raw)),
  );
}

export function getEndedReasonLabel(raw: string | null | undefined): string {
  if (!raw) return "Other";
  return ENDED_REASON_LABELS[raw] ?? "Other";
}

// Expand comma-joined filter-option keys (from the URL) to the raw DB values
// the RPC filters on. Returns null when nothing valid is selected.
export function expandEndedReason(filterValue: string | undefined): string[] | null {
  if (!filterValue || filterValue === "all") return null;
  const raws = filterValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((key) => ENDED_REASON_FILTER_VALUES[key] ?? []);
  return raws.length > 0 ? raws : null;
}
