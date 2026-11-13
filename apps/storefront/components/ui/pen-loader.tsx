type PenSize = "sm" | "md" | "lg";

const DIMS: Record<PenSize, string> = {
  sm: "h-4 w-7",
  md: "h-8 w-14",
  lg: "h-12 w-24",
};

/**
 * Fountain-pen nib SVG loader writing a flowing #E52320 ink line (~1.2s CSS loop).
 * Zero JS libraries, <2 KB, accessible (role="status", aria-busy="true"),
 * and static when `prefers-reduced-motion: reduce` is active.
 */
export default function PenLoader({
  size = "md",
  tone = "default",
  label = "Loading",
  className = "",
}: {
  size?: PenSize;
  tone?: "default" | "light";
  label?: string;
  className?: string;
}) {
  const nibColor = tone === "light" ? "#FFFFFF" : "#000000";
  const inkColor = tone === "light" ? "#FFFFFF" : "#E52320";

  return (
    <span
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`inline-flex items-center justify-center align-middle select-none ${className}`}
    >
      <svg
        viewBox="0 0 64 32"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className={DIMS[size]}
      >
        <path
          d="M4 26 C 14 19, 24 29, 36 22 S 52 19, 60 25"
          stroke={inkColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          className="pen-ink"
        />
        <g className="pen-nib">
          <path
            d="M27 3 L34 10 L24 22 L15 24 L17 15 Z"
            fill={nibColor}
          />
          <circle cx="23.5" cy="14.5" r="1.5" fill={tone === "light" ? "#E52320" : "#FFFFFF"} />
          <path
            d="M15 24 L22.5 15.5"
            stroke={tone === "light" ? "#E52320" : "#FFFFFF"}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
