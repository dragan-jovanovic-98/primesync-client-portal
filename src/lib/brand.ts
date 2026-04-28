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
  tagline: "Power Every Call. Drive Every Opportunity.",

  logoPath: "/brand/torqi-logo.svg",
  logoDarkPath: "/brand/torqi-logo-dark.png",
  faviconPath: "/brand/torqi-favicon.svg",
  appleTouchIconPath: "/brand/torqi-apple-touch-icon.png",
  ogImagePath: "/brand/torqi-og.png",
  patternPath: "/brand/torqi-pattern.svg",

  metadataTitle: "TorQi Client Portal",
  metadataDescription: "Client portal for TorQi AI voice agent customers.",

  colors: {
    orange: "#F19A1F",
    orangeHover: "#D98611",
    navy: "#0F1841",
    navyHover: "#1A2563",
    white: "#FFFFFF",
  },

  // Email identity. Visible branding in the body is TorQi; the technical sender
  // (from-email + from-name) stays on Primesync infrastructure until SendGrid
  // domain-auth on torqi.ai is verified end-to-end and the migration wave has
  // gone out. Flip `fromEmail` / `fromName` here when ready — no other file
  // needs to change.
  emailFooter: "© TorQi · Built by Primesync",
  emailLogoPath: "/brand/torqi-logo.png",
  supportEmail: process.env.SUPPORT_EMAIL || "support@primesync.co",
  fromEmail: process.env.FROM_EMAIL || "portal@primesync.co",
  fromName: "Primesync AI",
} as const;
