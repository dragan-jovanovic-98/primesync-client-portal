import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress source-map-upload chatter unless we're in CI.
  silent: !process.env.CI,

  // Upload more files for source maps so server / edge / route handlers
  // resolve cleanly in stack traces.
  widenClientFileUpload: true,

  // Tunneling events through our domain (to dodge ad-blockers) was tried via
  // tunnelRoute: "/monitoring" but the rewrite injection didn't take in
  // Turbopack dev. Disabled for now — events go directly to ingest.sentry.io.
  // Re-evaluate after first wave of clients if blocked-event reports come in.

  // Upload source maps to Sentry but delete them from the public bundle
  // afterwards so visitors can't download our source.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Note: disableLogger / reactComponentAnnotation / automaticVercelMonitors
  // are all webpack-only — Turbopack (Next 16's default) silently ignores
  // them. Re-add under the `webpack` key if/when this project moves back
  // to webpack builds.
});
