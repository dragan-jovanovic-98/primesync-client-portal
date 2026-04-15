export const PORTAL_PASSWORD_RULES = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
} as const;

export const PORTAL_PASSWORD_RULE_HINTS: readonly string[] = [
  `At least ${PORTAL_PASSWORD_RULES.minLength} characters`,
  "At least one uppercase letter (A–Z)",
  "At least one lowercase letter (a–z)",
  "At least one number (0–9)",
  "A symbol is recommended but not required",
];

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validatePortalPassword(
  password: string,
): PasswordValidationResult {
  const failed: string[] = [];

  if (password.length < PORTAL_PASSWORD_RULES.minLength) {
    failed.push(`at least ${PORTAL_PASSWORD_RULES.minLength} characters`);
  }
  if (PORTAL_PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    failed.push("an uppercase letter");
  }
  if (PORTAL_PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    failed.push("a lowercase letter");
  }
  if (PORTAL_PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    failed.push("a number");
  }

  if (failed.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `Password must include ${failed.join(", ")}.`,
  };
}
