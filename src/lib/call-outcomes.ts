export type OutcomeCategory =
  | "appointment"
  | "message"
  | "quote"
  | "urgent"
  | "towing"
  | "transfer"
  | "voicemail"
  | "general_inquiry"
  | "reschedule_cancel"
  | "other";

type OutcomeTier = "high" | "medium" | "low";

const OUTCOME_MAP: Record<string, OutcomeCategory> = {
  appointment_request: "appointment",
  appointment_link: "appointment",
  appointment: "appointment",
  scheduleAppointment: "appointment",
  send_appointment: "appointment",
  send_link: "appointment",
  request_inspection: "appointment",
  service_request: "appointment",
  submit_service_ticket: "appointment",
  message: "message",
  leave_message: "message",
  leaveMessage: "message",
  get_sms: "message",
  send_message: "message",
  send_first_sms: "message",
  quote: "quote",
  quote_request: "quote",
  urgent_message: "urgent",
  urgent_request: "urgent",
  contactTow: "towing",
  contactTow_no_sms: "towing",
  contact_tow: "towing",
  transfer: "transfer",
  contact_laurel: "transfer",
  voicemail: "voicemail",
  general_inquiry: "general_inquiry",
  findRepairOrder: "general_inquiry",
  findCustomer: "general_inquiry",
  findVehicle: "general_inquiry",
  createVehicle: "general_inquiry",
  shop_directions: "general_inquiry",
  send_directions: "general_inquiry",
  reschedule: "reschedule_cancel",
  cancel: "reschedule_cancel",
};

export const OUTCOME_CATEGORY_VALUES: Record<OutcomeCategory, string[]> = {
  appointment: [
    "appointment_request",
    "appointment_link",
    "appointment",
    "scheduleAppointment",
    "send_appointment",
    "send_link",
    "request_inspection",
    "service_request",
    "submit_service_ticket",
  ],
  message: ["message", "leave_message", "leaveMessage", "get_sms", "send_message", "send_first_sms"],
  quote: ["quote", "quote_request"],
  urgent: ["urgent_message", "urgent_request"],
  towing: ["contactTow", "contactTow_no_sms", "contact_tow"],
  transfer: ["transfer", "contact_laurel"],
  voicemail: ["voicemail"],
  general_inquiry: [
    "general_inquiry",
    "findRepairOrder",
    "findCustomer",
    "findVehicle",
    "createVehicle",
    "shop_directions",
    "send_directions",
  ],
  reschedule_cancel: ["reschedule", "cancel"],
  other: [],
};

export const OUTCOME_LABELS: Record<OutcomeCategory, string> = {
  appointment: "Appointment",
  message: "Message",
  quote: "Quote",
  urgent: "Urgent",
  towing: "Towing",
  transfer: "Transfer",
  voicemail: "Voicemail",
  general_inquiry: "General Inquiry",
  reschedule_cancel: "Reschedule/Cancel",
  other: "Other",
};

export const OUTCOME_TIER_LABELS: Record<OutcomeTier, string> = {
  high: "Actioned",
  medium: "Informational",
  low: "No action",
};

export const OUTCOME_TIER_COLORS: Record<OutcomeTier, string> = {
  high: "#F19A1F",
  medium: "#0F1841",
  low: "#a1a1aa",
};

const OUTCOME_TIERS: Record<OutcomeCategory, OutcomeTier> = {
  appointment: "high",
  quote: "high",
  urgent: "high",
  towing: "high",
  message: "medium",
  transfer: "medium",
  general_inquiry: "medium",
  reschedule_cancel: "low",
  voicemail: "low",
  other: "low",
};

const OUTCOME_VALUE_WEIGHTS: Record<OutcomeCategory, number> = {
  appointment: 1,
  quote: 0.7,
  urgent: 0.85,
  towing: 0.9,
  message: 0.2,
  transfer: 0.25,
  general_inquiry: 0.15,
  reschedule_cancel: 0.1,
  voicemail: 0.05,
  other: 0.08,
};

export function getOutcomeCategory(rawOutcome: string | null): OutcomeCategory {
  if (!rawOutcome) return "other";
  return OUTCOME_MAP[rawOutcome] ?? "other";
}

export function getOutcomeLabel(rawOutcome: string | null) {
  return OUTCOME_LABELS[getOutcomeCategory(rawOutcome)];
}

export function isAppointmentOutcome(rawOutcome: string | null) {
  return getOutcomeCategory(rawOutcome) === "appointment";
}

export function getOutcomeTier(category: OutcomeCategory): OutcomeTier {
  return OUTCOME_TIERS[category];
}

export function getOutcomeEstimatedValue(category: OutcomeCategory, averageOrderValue: number, closeRate: number) {
  return Math.round(averageOrderValue * closeRate * OUTCOME_VALUE_WEIGHTS[category]);
}
