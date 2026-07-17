// Per-company profiles for the synthetic demo dashboard.
//
// The generator logic in ./synthetic-dashboard.ts is vertical-agnostic; every
// number that makes a demo look like a *particular kind of business* lives here.
// Adjust these after a sales review without touching the generator.
//
// To add a demo company: add its company_id to ./demo-companies.ts and add a
// profile here under the same key.

import type { OutcomeCategory } from "@/lib/call-outcomes";

export type DemoProfile = {
  /**
   * Namespace mixed into the per-day PRNG seed. Two demo companies with the
   * same namespace would generate the identical call sequence.
   *
   * primesync uses "" deliberately: the seed was `day:<date>` before profiles
   * existed, and an empty namespace reproduces that string exactly, so the
   * existing demo's numbers are unchanged by the refactor. New companies must
   * set a non-empty namespace.
   */
  seedNamespace: string;
  baseCallsPerDay: number;
  dailyJitter: number;
  /** Indexed by Date.getDay() — 0 = Sunday .. 6 = Saturday. */
  weekdayFactors: ReadonlyArray<number>;
  /** Duration draw: BASE + triangular(0..1) * SPREAD, clamped at MIN. */
  durationBaseS: number;
  durationSpreadS: number;
  durationMinS: number;
  /** Weights must sum to 1. */
  outcomeMix: ReadonlyArray<{ category: OutcomeCategory; weight: number }>;
  /** Relative call likelihood per hour 0..23. */
  hourWeights: ReadonlyArray<number>;
  businessHourStart: number; // inclusive
  businessHourEnd: number; // exclusive
  timezone: string;
  /** Used only if the demo company has no active assistants. */
  fallbackAgents: ReadonlyArray<{ assistant_id: string; agent_name: string }>;
  averageOrderValue: number;
  /** Per-category close rate as a fraction. */
  closeRates: Record<OutcomeCategory, number>;
};

// --- primesync: auto repair --------------------------------------------------
// Calibrated against real bimmex-shop + oxford-automotive baselines. These
// values are a verbatim lift of the pre-profile module constants — do not tune
// them as a side effect of dealership work.

const PRIMESYNC_REPAIR: DemoProfile = {
  seedNamespace: "",
  baseCallsPerDay: 20,
  dailyJitter: 0.15,
  weekdayFactors: [0.35, 1.0, 1.05, 1.05, 1.0, 0.95, 0.55],
  durationBaseS: 18,
  durationSpreadS: 64,
  durationMinS: 8,
  outcomeMix: [
    { category: "transfer", weight: 0.48 },
    { category: "general_inquiry", weight: 0.3 },
    { category: "appointment", weight: 0.12 },
    { category: "quote", weight: 0.05 },
    { category: "message", weight: 0.04 },
    { category: "urgent", weight: 0.01 },
  ],
  hourWeights: [
    0.2, 0.15, 0.1, 0.1, 0.15, 0.3, 0.6, 1.2, // 0-7
    3.0, 6.0, 7.0, 6.0, 4.0, 4.0, 6.0, 6.0, // 8-15
    5.0, 3.5, 2.0, 1.5, 1.0, 0.7, 0.4, 0.3, // 16-23
  ],
  businessHourStart: 8,
  businessHourEnd: 18,
  timezone: "America/Los_Angeles",
  fallbackAgents: [
    { assistant_id: "demo-agent-front-desk", agent_name: "Front Desk AI" },
    { assistant_id: "demo-agent-after-hours", agent_name: "After-Hours AI" },
    { assistant_id: "demo-agent-overflow", agent_name: "Overflow AI" },
  ],
  averageOrderValue: 250,
  closeRates: {
    appointment: 0.5,
    quote: 0.2,
    financing: 0, // repair shops do not finance
    urgent: 0.5,
    message: 0.15,
    transfer: 0,
    general_inquiry: 0,
    towing: 0,
    voicemail: 0,
    reschedule_cancel: 0,
    other: 0,
  },
};

// --- giada-demo: independent dealership --------------------------------------
// Backs the GIADA dealership demo cluster ("Imperial Auto Sales", +14709125087).
//
// ⚠️ THESE NUMBERS ARE A STARTING POINT AND NEED A SALES REVIEW (Dragan/Ash)
// before the GIADA conference. They are deliberately conservative — see the AOV
// note below. They are a GTM judgement, not a technical one.
//
// Shaped for the dealership ICP (T1 BHPH, 80-250 units/mo). Differences from
// repair that matter:
//   - Saturday is the BUSIEST day, not the quietest. Repair's 0.55 Saturday is
//     exactly wrong for a dealership; Sunday is near-dead (most GA dealers shut).
//   - Longer calls. Vehicle and financing conversations run well past an
//     oil-change booking.
//   - Open late — showroom hours run to 8pm, so the after-hours split differs.
//   - Financing is a first-class outcome; towing is not an outcome at all.

const GIADA_DEALERSHIP: DemoProfile = {
  seedNamespace: "giada-demo",
  baseCallsPerDay: 35,
  dailyJitter: 0.18,
  //             sun   mon  tue   wed   thu  fri   sat
  weekdayFactors: [0.15, 1.0, 0.95, 0.95, 1.0, 1.1, 1.25],
  // Mean ≈ 25 + 0.5 * 100 = ~75s, vs repair's ~50s.
  durationBaseS: 25,
  durationSpreadS: 100,
  durationMinS: 10,
  // Weights sum to 1.00. A dealership's inbound mix is less transfer-dominated
  // than repair's because the AI handles more of the qualifying conversation.
  outcomeMix: [
    { category: "transfer", weight: 0.3 },
    { category: "general_inquiry", weight: 0.24 },
    { category: "appointment", weight: 0.18 },
    { category: "financing", weight: 0.12 },
    { category: "quote", weight: 0.09 },
    { category: "message", weight: 0.06 },
    { category: "urgent", weight: 0.01 },
  ],
  // Later, flatter peak than repair: dealership traffic builds through the
  // afternoon and holds into the evening rather than spiking at 10am.
  hourWeights: [
    0.2, 0.15, 0.1, 0.1, 0.15, 0.25, 0.5, 1.0, // 0-7
    2.0, 4.5, 5.5, 6.0, 5.5, 5.5, 6.0, 6.5, // 8-15
    6.5, 6.0, 5.0, 3.5, 2.0, 1.0, 0.5, 0.3, // 16-23
  ],
  businessHourStart: 9,
  businessHourEnd: 20,
  timezone: "America/New_York", // GIADA = Georgia Independent Auto Dealers Association
  // Not expected to be used: giada-demo has a real receptionist assistants row.
  // Present so the demo degrades gracefully if that row is ever removed.
  fallbackAgents: [{ assistant_id: "demo-giada-receptionist", agent_name: "Receptionist AI" }],
  // ⚠️ GROSS PROFIT PER UNIT, NOT STICKER PRICE. The dashboard computes
  // revenue as conversions * averageOrderValue, so this must be the margin the
  // dealer actually keeps (~$3.5k on a BHPH unit), not the ~$12k retail price.
  // Using sticker here would inflate the demo into six figures a week and read
  // as fantasy to any dealer who does the arithmetic.
  //
  // This is also the number a dealer on the GIADA floor will instinctively
  // check against their own gross, so it has to survive that. It is why the
  // conservatism lives in the close rates below rather than here: understating
  // gross profit would look wrong to them, whereas a modest conversion claim
  // reads as honest.
  averageOrderValue: 3500,
  closeRates: {
    // Tuned so the demo lands near $60k/month of influenced gross (Dragan,
    // 2026-07-16) — comfortably above the repair demo's ~$11k, because a
    // dealership's gross per unit dwarfs a repair ticket, while still claiming
    // only ~17 influenced units a month against an 80-250 unit/mo dealer. That
    // is a share a dealer will nod at; the ~34 units the first cut implied is
    // the kind of claim that starts an argument instead of a conversation.
    //
    // Deliberately far below the repair profile's rates. A booked test drive is
    // not half a vehicle sale, and a demo that implies otherwise loses the room.
    appointment: 0.06,
    financing: 0.04,
    quote: 0.02,
    message: 0.01,
    urgent: 0.01,
    // A call handed to a human salesperson is not a defensible AI-attributed
    // sale, and neither is an info request.
    transfer: 0,
    general_inquiry: 0,
    towing: 0, // dealerships do not dispatch tows
    voicemail: 0,
    reschedule_cancel: 0,
    other: 0,
  },
};

const DEMO_PROFILES: Record<string, DemoProfile> = {
  primesync: PRIMESYNC_REPAIR,
  "giada-demo": GIADA_DEALERSHIP,
};

/** Falls back to the repair profile so an allowlisted-but-unprofiled company still renders. */
export function getDemoProfile(companyId: string): DemoProfile {
  return DEMO_PROFILES[companyId] ?? PRIMESYNC_REPAIR;
}
