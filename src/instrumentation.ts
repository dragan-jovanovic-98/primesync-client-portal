import * as Sentry from "@sentry/nextjs";

const SHARED_INIT = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample 10% of traces for performance — enough signal without burning quota.
  // Errors themselves are always captured (no sampling).
  tracesSampleRate: 0.1,

  // Suppress noisy framework / dev errors that aren't actionable.
  ignoreErrors: [
    // Browser extensions injecting scripts
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Aborted fetches from page navigations
    "AbortError: The operation was aborted",
  ],

  // Don't send IP / cookies / headers — defense in depth on tenant data.
  sendDefaultPii: false,
};

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(SHARED_INIT);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(SHARED_INIT);
  }
}

export const onRequestError = Sentry.captureRequestError;
