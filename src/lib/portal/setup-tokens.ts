import { createHash, randomBytes } from "node:crypto";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildPortalSetupLink(token: string) {
  return `${getSiteUrl()}/setup?token=${token}`;
}

export async function createPortalSetupToken(params: {
  portalUserId: string;
  createdBy?: string;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const admin = createAdminClient();

  await admin
    .from("portal_setup_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("portal_user_id", params.portalUserId)
    .is("used_at", null);

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const { error } = await admin.from("portal_setup_tokens").insert({
    portal_user_id: params.portalUserId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: params.createdBy ?? null,
  });

  if (error) {
    throw new Error(`Failed to create setup token: ${error.message}`);
  }

  return {
    token,
    expiresAt,
    url: buildPortalSetupLink(token),
  };
}

export async function getPortalSetupToken(token: string) {
  const tokenHash = hashToken(token);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("portal_setup_tokens")
    .select(
      `
      id,
      expires_at,
      used_at,
      portal_user:portal_users (
        id,
        auth_user_id,
        company_id,
        email,
        full_name,
        role,
        is_owner,
        status,
        has_completed_onboarding
      )
    `,
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch setup token: ${error.message}`);
  }

  return data;
}

export async function markPortalSetupTokenUsed(id: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("portal_setup_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to mark setup token used: ${error.message}`);
  }
}

export function isPortalSetupTokenUsable(token: {
  expires_at: string;
  used_at: string | null;
} | null) {
  if (!token || token.used_at) {
    return false;
  }

  return new Date(token.expires_at).getTime() >= new Date().getTime();
}
