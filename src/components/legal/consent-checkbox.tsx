"use client";

import { LEGAL_URLS } from "@/lib/legal/versions";

const linkClass =
  "text-[#242529] underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none";

/**
 * Combined "I agree to the Terms of Service and Privacy Policy" checkbox.
 * Used by /setup (first-time consent) and /accept-updates (version-bump
 * re-acceptance). Single checkbox in UX; the server writes two rows in
 * portal_consents (one per document_type) on submit.
 */
export function ConsentCheckbox() {
  return (
    <label className="flex items-start gap-2.5 text-[13px] leading-[1.55] text-[rgba(0,0,0,0.7)]">
      <input
        type="checkbox"
        name="agree"
        value="on"
        required
        className="mt-[3px] h-[14px] w-[14px] shrink-0 cursor-pointer rounded border-[#c9c9cc] text-[var(--torqi-orange)] focus:ring-[rgba(15,24,65,0.12)]"
      />
      <span>
        I agree to the{" "}
        <a
          href={LEGAL_URLS.terms}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href={LEGAL_URLS.privacy}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Privacy Policy
        </a>
        .
      </span>
    </label>
  );
}
