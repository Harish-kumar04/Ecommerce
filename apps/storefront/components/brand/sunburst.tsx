/**
 * Brand motif from the publisher logo: a semicircle of rounded, tapered red rays.
 * Pure SVG (no JS); colour comes from `currentColor` (default: brand red).
 */

const RAY_COUNT = 13;

/** One ray pointing straight up from the centre: narrow at the hub, wide and rounded at the tip. */
const RAY_PATH = "M -2.2 -44 L -9 -150 A 9 9 0 0 1 9 -150 L 2.2 -44 Z";

const RAY_ANGLES = Array.from({ length: RAY_COUNT }, (_, i) => -90 + (180 / (RAY_COUNT - 1)) * i);

export default function Sunburst({
  className = "",
  title,
}: {
  className?: string;
  /** Accessible title; omit for purely decorative use. */
  title?: string;
}) {
  return (
    <svg
      viewBox="-170 -170 340 172"
      className={`text-brand-red ${className}`}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {RAY_ANGLES.map((deg) => (
        <path key={deg} d={RAY_PATH} transform={`rotate(${deg})`} />
      ))}
      <path d="M -34 0 A 34 34 0 0 1 34 0 Z" />
    </svg>
  );
}
