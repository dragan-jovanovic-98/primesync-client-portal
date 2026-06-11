/**
 * Wallet credit packs — single source of truth for the self-serve "Add funds"
 * feature (prepaid clients only).
 *
 * Each pack is a real one-time Stripe Product/Price in the TorQi (primary)
 * account, credited 1:1 (pay $X → $X of wallet balance). The wallet credit is
 * applied by the existing `fn_sync_wallet_v2` trigger on `payments_v2`, so
 * nothing here writes the balance — these constants only drive the Checkout
 * line item and the UI.
 *
 * `priceEnv` names the server-only env var holding the Stripe `price_…` ID.
 * The card (client component) reads only `tier`/`amountDollars`/`label`;
 * `getPackPriceId` resolves the actual price ID server-side in the route.
 */

export type CreditPackTier = "250" | "500" | "1000";

export type CreditPack = {
  tier: CreditPackTier;
  amountDollars: number;
  label: string;
  priceEnv: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { tier: "250", amountDollars: 250, label: "$250", priceEnv: "STRIPE_PRICE_CREDIT_250" },
  { tier: "500", amountDollars: 500, label: "$500", priceEnv: "STRIPE_PRICE_CREDIT_500" },
  { tier: "1000", amountDollars: 1000, label: "$1,000", priceEnv: "STRIPE_PRICE_CREDIT_1000" },
];

/** Returns the pack for a tier string, or null if it isn't an allow-listed tier. */
export function getCreditPack(tier: string): CreditPack | null {
  return CREDIT_PACKS.find((pack) => pack.tier === tier) ?? null;
}

/**
 * Server-only: resolves the Stripe price ID for a pack tier from its env var.
 * Throws on an unknown tier or an unconfigured price env var — never returns a
 * client-supplied amount, so the charged value can't be tampered with.
 */
export function getPackPriceId(tier: string): string {
  const pack = getCreditPack(tier);
  if (!pack) {
    throw new Error(`Unknown credit pack tier: ${tier}`);
  }
  const priceId = process.env[pack.priceEnv];
  if (!priceId) {
    throw new Error(`Missing Stripe price env var ${pack.priceEnv} for credit pack ${tier}`);
  }
  return priceId;
}
