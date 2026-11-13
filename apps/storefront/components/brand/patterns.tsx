import Sunburst from "./sunburst";
import { T } from "../i18n/t";

/**
 * (a) Faint radiating-ray sunburst from the publisher logo motif at 4–6% opacity.
 * Pure inline SVG, zero client JS.
 */
export function SunburstBackdrop({
  className = "",
  position = "center",
}: {
  className?: string;
  position?: "center" | "right" | "top-right";
}) {
  const posCls =
    position === "right"
      ? "-bottom-4 right-0 w-[520px] sm:w-[680px] opacity-[0.055]"
      : position === "top-right"
        ? "-right-20 -top-8 w-[380px] sm:w-[500px] opacity-[0.05]"
        : "-bottom-2 left-1/2 -translate-x-1/2 w-[540px] sm:w-[720px] opacity-[0.05]";

  return (
    <Sunburst
      className={`pointer-events-none absolute max-w-none select-none ${posCls} ${className}`}
    />
  );
}

/**
 * (b) Thin red diagonal stripe divider between major sections.
 */
export function DiagonalStripeDivider({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pattern-red-stripes h-2.5 w-full border-y border-brand-red/15 ${className}`}
    />
  );
}

/**
 * (d) Bold Revolutionary Red (#E52320) arch / semicircle backdrop behind tilted hero book covers.
 */
export function HeroRedArch({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 420"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none select-none ${className}`}
    >
      {/* Soft outer halo */}
      <path
        d="M 36 420 V 224 A 204 204 0 0 1 444 224 V 420 Z"
        fill="#E52320"
        fillOpacity="0.08"
      />
      {/* Main solid Revolutionary Red arch */}
      <path
        d="M 64 420 V 232 A 176 176 0 0 1 416 232 V 420 Z"
        fill="#E52320"
      />
      {/* Crisp white inner hairline for editorial polish */}
      <path
        d="M 82 420 V 234 A 158 158 0 0 1 398 234 V 420"
        stroke="#FFFFFF"
        strokeOpacity="0.28"
        strokeWidth="1.5"
        strokeDasharray="5 5"
      />
    </svg>
  );
}

/**
 * Standardized section heading with bilingual eyebrow, bold h2, and red accent bar underneath.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  dark = false,
}: {
  eyebrow: { ta: string; en: string };
  title: { ta: string; en: string };
  subtitle?: { ta: string; en: string };
  align?: "left" | "center";
  dark?: boolean;
}) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p
        className={`text-[12px] font-bold uppercase tracking-[0.18em] ${
          dark ? "text-[#FF6B68]" : "text-brand-red-dark"
        }`}
      >
        <T ta={eyebrow.ta} en={eyebrow.en} />
      </p>
      <h2
        className={`mt-2 text-[26px] font-extrabold leading-[1.15] tracking-tight sm:text-[34px] lg:text-[40px] ${
          dark ? "text-white" : "text-black"
        }`}
      >
        <T ta={title.ta} en={title.en} />
      </h2>
      <div
        aria-hidden="true"
        className={`mt-3 h-1 w-14 rounded-full bg-brand-red ${centered ? "mx-auto" : ""}`}
      />
      {subtitle && (
        <p
          className={`mt-3 text-[15px] leading-relaxed sm:text-[16px] ${
            dark ? "text-white/75" : "text-black/70"
          }`}
        >
          <T ta={subtitle.ta} en={subtitle.en} />
        </p>
      )}
    </div>
  );
}
