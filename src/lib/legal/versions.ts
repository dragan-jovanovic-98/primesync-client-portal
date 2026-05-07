/**
 * Single source of truth for legal-document versions and URLs.
 *
 * Versioning contract:
 *   - When you change the Terms of Service or Privacy Policy on torqi.ai,
 *     bump the corresponding string here in the same commit.
 *   - On the next sign-in, every user whose latest accepted version for that
 *     doc_type does not match this constant will be redirected to
 *     /accept-updates and forced to re-accept.
 *   - Date-style strings ("2026-05-07") are fine; semver works too. The only
 *     requirement is that the new value differs from the prior one.
 */
export const LEGAL_VERSIONS = {
  terms: "2026-05-07",
  privacy: "2026-05-07",
} as const;

export const LEGAL_URLS = {
  terms: "https://www.torqi.ai/terms-of-service",
  privacy: "https://www.torqi.ai/privacy-policy",
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const LEGAL_DOCUMENT_TYPES: readonly LegalDocumentType[] = [
  "terms",
  "privacy",
] as const;

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentType, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};
