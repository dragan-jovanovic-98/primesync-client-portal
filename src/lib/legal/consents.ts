import { cache } from "react";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEGAL_DOCUMENT_TYPES,
  LEGAL_VERSIONS,
  type LegalDocumentType,
} from "@/lib/legal/versions";

const USER_AGENT_MAX_LENGTH = 1024;

function looksLikeIp(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) return true;
  if (trimmed.includes(":") && /^[0-9a-f:.]+$/i.test(trimmed)) return true;
  return false;
}

export type RequestContext = {
  ip: string | null;
  userAgent: string | null;
};

/**
 * Reads IP + user-agent from the current request headers. Safe to call
 * inside server actions and server components. Returns null for any field
 * we can't extract or validate; the consent write tolerates nulls.
 */
export async function getRequestIpAndUserAgent(): Promise<RequestContext> {
  const headerStore = await headers();

  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  let ip: string | null = null;
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim() ?? "";
    if (looksLikeIp(first)) {
      ip = first;
    }
  }
  if (!ip && realIp) {
    const trimmed = realIp.trim();
    if (looksLikeIp(trimmed)) {
      ip = trimmed;
    }
  }

  const userAgentHeader = headerStore.get("user-agent");
  let userAgent: string | null = null;
  if (userAgentHeader) {
    const trimmed = userAgentHeader.trim().slice(0, USER_AGENT_MAX_LENGTH);
    if (trimmed) {
      userAgent = trimmed;
    }
  }

  return { ip, userAgent };
}

type RecordConsentsOptions = {
  portalUser: { id: string; company_id: string };
  ip: string | null;
  userAgent: string | null;
};

/**
 * Append-only write of two consent rows (one per document type) plus two
 * mirrored audit rows. The two .insert calls are not atomic with each other,
 * but the audit log is forensic; the canonical legal record is portal_consents.
 *
 * Throws on either insert failure. Callers decide whether to redirect-with-error
 * or surface the failure another way.
 */
export async function recordConsents(opts: RecordConsentsOptions): Promise<void> {
  const admin = createAdminClient();
  const acceptedAt = new Date().toISOString();

  const consentRows = LEGAL_DOCUMENT_TYPES.map((documentType) => ({
    portal_user_id: opts.portalUser.id,
    document_type: documentType,
    document_version: LEGAL_VERSIONS[documentType],
    accepted_at: acceptedAt,
    ip_address: opts.ip,
    user_agent: opts.userAgent,
  }));

  const { error: consentError } = await admin
    .from("portal_consents")
    .insert(consentRows);

  if (consentError) {
    throw new Error(
      `[legal] recordConsents portal_consents insert failed: ${consentError.message}`,
    );
  }

  const auditRows = LEGAL_DOCUMENT_TYPES.map((documentType) => ({
    company_id: opts.portalUser.company_id,
    actor_portal_user_id: opts.portalUser.id,
    target_portal_user_id: opts.portalUser.id,
    action: "consent.accepted",
    metadata: {
      document_type: documentType,
      document_version: LEGAL_VERSIONS[documentType],
      ip: opts.ip,
      user_agent: opts.userAgent,
    },
  }));

  const { error: auditError } = await admin
    .from("portal_audit_log")
    .insert(auditRows);

  if (auditError) {
    throw new Error(
      `[legal] recordConsents portal_audit_log insert failed: ${auditError.message}`,
    );
  }
}

type LatestAcceptedVersions = Record<LegalDocumentType, string | null>;

/**
 * Returns the latest accepted version per document type for the user,
 * or null if they have never accepted that document type.
 *
 * Wrapped in React cache() so multiple callers in the same request share
 * the result (e.g. the layout gate plus an action's defensive check).
 */
export const getLatestAcceptedVersions = cache(
  async (portalUserId: string): Promise<LatestAcceptedVersions> => {
    const empty: LatestAcceptedVersions = { terms: null, privacy: null };
    if (!portalUserId) return empty;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("portal_consents")
      .select("document_type, document_version")
      .eq("portal_user_id", portalUserId)
      .order("accepted_at", { ascending: false });

    if (error || !data) {
      return empty;
    }

    const result = { ...empty };
    for (const row of data as Array<{
      document_type: LegalDocumentType;
      document_version: string;
    }>) {
      if (result[row.document_type] === null) {
        result[row.document_type] = row.document_version;
      }
    }
    return result;
  },
);

/**
 * Returns the document types whose latest accepted version does NOT match
 * the current LEGAL_VERSIONS constant. A user who has never accepted a
 * document is "stale" for that document. Empty array means the user is
 * fully current and should not be redirected to /accept-updates.
 */
export async function getStaleDocumentTypes(
  portalUserId: string,
): Promise<LegalDocumentType[]> {
  const latest = await getLatestAcceptedVersions(portalUserId);
  return LEGAL_DOCUMENT_TYPES.filter(
    (documentType) => latest[documentType] !== LEGAL_VERSIONS[documentType],
  );
}

export async function isUserCurrentOnLegal(
  portalUserId: string,
): Promise<boolean> {
  return (await getStaleDocumentTypes(portalUserId)).length === 0;
}
