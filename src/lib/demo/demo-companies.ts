// Companies that render a fully synthetic dashboard for sales demos instead of
// real Supabase metrics. The synthetic data is generated entirely in portal
// code (see ./synthetic-dashboard.ts) — no database rows are read or written,
// and the call log is left untouched so the live call-in demo still works.
export const DEMO_COMPANY_IDS = ["primesync"] as const;

export function isDemoCompany(companyId: string): boolean {
  return (DEMO_COMPANY_IDS as readonly string[]).includes(companyId);
}
