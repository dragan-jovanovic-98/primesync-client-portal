"use client";

import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Returns true on phones (<768px), false on desktop, and null while we're
 * still detecting (server render and first client paint).
 *
 * Consumers that branch on truthiness (`if (isMobile)`) will treat the null
 * detection state as "not mobile yet" and render the desktop variant — which
 * is the right default. Consumers that need to distinguish "checking" from
 * "definitely desktop" (e.g. the settings drill-down redirect) should compare
 * explicitly against `false`.
 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
