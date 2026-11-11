/**
 * Brand motif from the publisher logo: the layered pages of an open book,
 * drawn as thin parallel curves rising from a central spine. Used as a section
 * divider and as the footer's top edge. Pure SVG; colour via `currentColor`.
 */

const LAYERS = [0, 1, 2, 3];

export default function PageLines({
  className = "",
  layers = LAYERS.length,
}: {
  className?: string;
  layers?: number;
}) {
  const ys = LAYERS.slice(0, Math.max(1, Math.min(layers, LAYERS.length)));
  return (
    <svg
      viewBox="0 0 1200 48"
      preserveAspectRatio="none"
      className={`block w-full text-brand-black ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {ys.map((i) => {
        const y = 14 + i * 7;
        return (
          <g key={i} strokeWidth={i === 0 ? 1.6 : 1} opacity={1 - i * 0.18}>
            <path d={`M600 ${y + 6} C 470 ${y - 8}, 190 ${y - 8}, 8 ${y + 4}`} vectorEffect="non-scaling-stroke" />
            <path d={`M600 ${y + 6} C 730 ${y - 8}, 1010 ${y - 8}, 1192 ${y + 4}`} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
      <path d="M600 18 L600 44" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
