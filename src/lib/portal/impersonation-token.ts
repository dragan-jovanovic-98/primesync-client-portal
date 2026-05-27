import { createHmac, timingSafeEqual } from "crypto";

// Signed handoff token for admin -> portal impersonation. The admin dashboard
// mints it (Phase D); the portal /impersonate route verifies it. It wraps the
// one-time Supabase magic-link token_hash and binds the target company +
// impersonator under an HMAC so neither can be tampered, with a short self-expiry.
export type HandoffPayload = {
  th: string; // magic-link token_hash (the single-use Supabase credential)
  cid: string; // target company_id (integrity-bound)
  imp: string; // impersonator user id (admin/ae who initiated)
  exp: number; // epoch seconds — our own short window
  jti: string; // random nonce
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signHandoffToken(payload: HandoffPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Returns the payload if the signature is valid AND the token is unexpired,
 * else null. Constant-time signature comparison. Never throws.
 */
export function verifyHandoffToken(token: string, secret: string): HandoffPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = b64url(createHmac("sha256", secret).update(body).digest());
  const given = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  let payload: HandoffPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    !payload ||
    typeof payload.th !== "string" ||
    typeof payload.cid !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (Date.now() / 1000 > payload.exp) return null; // expired

  return payload;
}
