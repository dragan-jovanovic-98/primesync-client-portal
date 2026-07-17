// Companies that render a fully synthetic dashboard for sales demos instead of
// real Supabase metrics. The synthetic data is generated entirely in portal
// code (see ./synthetic-dashboard.ts) — no database rows are read or written,
// and the call log is left untouched so the live call-in demo still works.
//
// Each id here needs a matching profile in ./demo-profiles.ts, which carries the
// business-shaped constants (call volume, outcome mix, AOV, close rates). An id
// without a profile falls back to the repair profile and will look wrong for any
// other vertical.
//
//   primesync  — auto repair (the original case-study demo)
//   giada-demo — independent dealership, "Imperial Auto Sales", backs the GIADA
//                demo cluster on +14709125087
export const DEMO_COMPANY_IDS = ["primesync", "giada-demo"] as const;

export function isDemoCompany(companyId: string): boolean {
  return (DEMO_COMPANY_IDS as readonly string[]).includes(companyId);
}
