type StripeRequestOptions = {
  method?: "GET" | "POST";
  params?: Record<string, string>;
};

/**
 * Returns the Stripe live secret key for the TorQi (primary) account.
 *
 * Reads `STRIPE_SECRET_KEY_PRIMARY` first, falling back to the legacy
 * `STRIPE_SECRET_KEY` env var. The fallback exists so the portal keeps working
 * during the env-var rename window — once `_PRIMARY` is set everywhere and the
 * old un-suffixed var is deleted in Vercel, the fallback is harmless dead code.
 *
 * The portal is single-account by design: it always talks to TorQi Stripe.
 * The `stripe_account` discriminator on the client only affects the admin
 * dashboard's webhook + billing routes, not the portal.
 */
function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY_PRIMARY ?? process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY_PRIMARY (or fallback STRIPE_SECRET_KEY).");
  }
  return key;
}

function buildBody(params: Record<string, string>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, value);
  }
  return body.toString();
}

export async function stripeRequest<T>(
  path: string,
  options: StripeRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? buildBody(options.params ?? {}) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

export function hasStripeSecretKey() {
  return Boolean(process.env.STRIPE_SECRET_KEY_PRIMARY ?? process.env.STRIPE_SECRET_KEY);
}
