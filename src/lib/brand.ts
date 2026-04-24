/**
 * TorQi brand tokens — single source of truth for brand-specific strings,
 * colors, and asset paths consumed by the portal UI.
 *
 * Full brand spec:    context/torqi-brand.md
 * Source assets:      reference/torqi-brand/
 * Web-ready assets:   app/public/brand/torqi-*
 *
 * Casing rule: `TorQi` (capital T + Q) in user-facing prose and UI;
 * `torqi` (lowercase) in code/URLs/folder names.
 */

export const BRAND = {
  wordmark: "TorQi",
  company: "TorQi",
  legalFooter: "© TorQi · AI voice agents for customer-facing businesses",
  tagline: "Power Every Call. Drive Every Opportunity.",

  logoPath: "/brand/torqi-logo.svg",
  logoDarkPath: "/brand/torqi-logo-dark.png",
  faviconPath: "/brand/torqi-favicon.svg",
  appleTouchIconPath: "/brand/torqi-apple-touch-icon.png", // generated in Phase 3
  ogImagePath: "/brand/torqi-og.png", // generated in Phase 3
  patternPath: "/brand/torqi-pattern.svg", // generated in Phase 3

  metadataTitle: "TorQi Client Portal",
  metadataDescription: "Client portal for TorQi AI voice agent customers.",

  colors: {
    orange: "#F19A1F",
    orangeHover: "#D98611",
    navy: "#0F1841",
    navyHover: "#1A2563",
    white: "#FFFFFF",
  },

  // Email identity — deferred. Email templates (email-layout.ts, email.ts)
  // remain on Primesync infrastructure for now so deliverability isn't hurt
  // by a from-name / from-domain mismatch. When TorQi email infra (SendGrid
  // domain-auth on torqi.ai) is ready, uncomment these and route the email
  // templates through BRAND.
  //
  // supportEmail: process.env.SUPPORT_EMAIL || "support@torqi.ai",
  // fromEmail:    process.env.FROM_EMAIL    || "portal@torqi.ai",
  // fromName:     "TorQi Portal",
  // emailLogoPath: "/brand/torqi-logo-dark.png",
} as const;
