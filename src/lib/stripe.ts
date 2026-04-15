type StripeRequestOptions = {
  method?: "GET" | "POST";
  params?: Record<string, string>;
};

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
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
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
