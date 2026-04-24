import Image from "next/image";
import { BRAND } from "@/lib/brand";

/**
 * Left-side TorQi brand panel for auth surfaces (/login, /setup).
 *
 * Editorial composition: eyebrow top-left, wordmark + tagline vertically
 * centered with left-aligned anchor, meta bottom. Single atmospheric gesture —
 * a soft radial glow from the upper-right — keeps the panel from reading flat
 * without adding decorative orange. Visible at `lg:` and up; mobile hides
 * this panel entirely and shows a compact TorQi lockup in the form column.
 */
export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[var(--torqi-navy)] lg:flex lg:flex-col">
      {/* Ambient atmosphere — navy family only, no decorative orange */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 55% at 85% 12%, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.015) 45%, transparent 72%)",
        }}
      />

      {/* Eyebrow */}
      <div
        className="relative px-14 pt-14"
        style={{ animation: "torqi-fade-up 650ms ease-out both" }}
      >
        <span className="text-[10.5px] font-medium uppercase tracking-[0.32em] text-white/45">
          Client Portal
        </span>
      </div>

      {/* Centerpiece: wordmark + tagline */}
      <div className="relative flex flex-1 flex-col justify-center px-14 pb-12">
        <div
          style={{ animation: "torqi-fade-up 700ms ease-out 120ms both" }}
        >
          <Image
            src={BRAND.logoPath}
            alt={BRAND.wordmark}
            width={870}
            height={300}
            priority
            className="h-auto w-[320px] select-none"
          />
        </div>

        <div
          className="mt-12 max-w-[460px]"
          style={{ animation: "torqi-fade-up 700ms ease-out 240ms both" }}
        >
          <h2 className="text-[40px] font-bold leading-[1.05] tracking-[-0.036em] text-white">
            Power Every Call.
          </h2>
          <h2 className="text-[40px] font-bold leading-[1.05] tracking-[-0.036em] text-white/70">
            Drive Every Opportunity.
          </h2>
        </div>
      </div>

      {/* Footer meta — authenticity detail */}
      <div
        className="relative flex items-center justify-between px-14 pb-10"
        style={{ animation: "torqi-fade-up 700ms ease-out 400ms both" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/85" />
          </span>
          <span className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-white/40">
            All Systems Operational
          </span>
        </div>
        <span className="text-[10.5px] font-medium tracking-[0.08em] text-white/30">
          © {new Date().getFullYear()} {BRAND.wordmark}
        </span>
      </div>
    </aside>
  );
}
