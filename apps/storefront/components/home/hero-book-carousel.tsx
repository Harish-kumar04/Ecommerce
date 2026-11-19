"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Img from "@/components/ui/img";
import { BiName, T } from "@/components/i18n/t";
import { splitBilingual } from "@/lib/i18n";
import {
  circularOffset,
  discountPercent,
  nextIndex,
  prevIndex,
  wrapIndex,
} from "@/lib/carousel-index";

export interface HeroCarouselBook {
  id: string;
  slug?: string | null;
  name: string;
  image_url?: string | null;
  price_cents: number;
  sale_price_cents?: number | null;
  rating_avg?: number | null;
}

const AUTOPLAY_MS = 4000;
const SWIPE_PX = 40;

const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

/** Coverflow pose for a slide at `offset` from the front (transform + opacity only). */
function slideStyle(offset: number, reduced: boolean): CSSProperties {
  const abs = Math.abs(offset);
  if (reduced) {
    return { opacity: abs === 0 ? 1 : 0, zIndex: abs === 0 ? 25 : 1 };
  }
  const dir = Math.sign(offset);
  if (abs === 0) {
    return { transform: "translate3d(0,0,0) scale(1) rotateY(0deg)", opacity: 1, zIndex: 25 };
  }
  if (abs === 1) {
    return {
      transform: `translate3d(${dir * 68}%, 6%, 0) scale(0.85) rotateY(${-dir * 12}deg)`,
      opacity: 0.72,
      zIndex: 15,
    };
  }
  if (abs === 2) {
    return {
      transform: `translate3d(${dir * 112}%, 10%, 0) scale(0.72) rotateY(${-dir * 18}deg)`,
      opacity: 0,
      zIndex: 5,
    };
  }
  return { transform: "translate3d(0, 10%, 0) scale(0.6)", opacity: 0, zIndex: 1 };
}

/**
 * Hero featured-books carousel (client island). One book at the front, its
 * neighbours peeking behind in a 3D stacked-deck pose. Autoplays every ~4s,
 * pauses on hover / focus / touch / hidden tab, and honours reduced motion.
 */
export default function HeroBookCarousel({
  tenant,
  books,
}: {
  tenant: string;
  books: HeroCarouselBook[];
}) {
  const count = books.length;
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(
    () => new Set([0, wrapIndex(1, count), wrapIndex(-1, count)]),
  );
  const dragStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const paused = hovered || focused || touching || tabHidden || reduced;

  const goTo = useCallback((i: number) => setActive(wrapIndex(i, count)), [count]);
  const goNext = useCallback(() => setActive((a) => nextIndex(a, count)), [count]);
  const goPrev = useCallback(() => setActive((a) => prevIndex(a, count)), [count]);

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Page Visibility API
  useEffect(() => {
    const update = () => setTabHidden(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // Autoplay (timer restarts after every slide change, manual or automatic)
  useEffect(() => {
    if (paused || count < 2) return;
    const t = window.setTimeout(goNext, AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [active, paused, count, goNext]);

  // Lazy-mount covers only once they are front or adjacent.
  useEffect(() => {
    setSeen((prev) => {
      const want = [active, wrapIndex(active + 1, count), wrapIndex(active - 1, count)];
      if (want.every((i) => prev.has(i))) return prev;
      const next = new Set(prev);
      want.forEach((i) => next.add(i));
      return next;
    });
  }, [active, count]);

  if (count === 0) return null;

  const front = books[active];
  const hrefFor = (b: HeroCarouselBook) => `/${tenant}/books/${encodeURIComponent(b.slug || b.id)}`;
  const claimFor = (b: HeroCarouselBook) => {
    if (b.rating_avg && b.rating_avg > 0) return { kind: "rating" as const, rating: b.rating_avg };
    const pct = discountPercent(b.price_cents, b.sale_price_cents);
    if (pct > 0) return { kind: "discount" as const, pct };
    return null;
  };
  const frontHasClaim = Boolean(claimFor(front));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="சிறப்பு நூல்கள் | Featured books"
      className="relative z-10 h-[262px] w-full outline-none sm:h-[334px]"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onTouchStart={() => setTouching(true)}
      onTouchEnd={() => setTouching(false)}
      onTouchCancel={() => setTouching(false)}
    >
      {/* Floating Badge 1 (Top-Left): Best Seller + front book title / price (cross-fades) */}
      <Link
        href={hrefFor(front)}
        prefetch={false}
        className="absolute -top-6 left-0 z-30 flex w-[200px] max-w-[200px] items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 shadow-lg transition-transform hover:-translate-y-0.5 sm:-top-6 sm:left-2 sm:px-3.5 sm:py-2.5"
      >
        <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#D11D1A] text-white">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
            <path d={STAR_PATH} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-brand-red-dark">
            <T ta="சிறந்த வெளியீடு" en="Best Seller" />
          </p>
          <div className="grid" aria-live={paused ? "polite" : "off"}>
            {books.map((b, i) => {
              const isFront = i === active;
              const onSale = discountPercent(b.price_cents, b.sale_price_cents) > 0;
              return (
                <div
                  key={b.id}
                  aria-hidden={!isFront}
                  className="hero-cf-layer min-w-0 [grid-area:1/1]"
                  style={{ opacity: isFront ? 1 : 0 }}
                >
                  <p className="truncate text-[12px] font-bold text-black">
                    <BiName value={b.name} />
                  </p>
                  {b.price_cents > 0 && (
                    <p className="text-[11px] font-semibold text-black/70">
                      {rupees(onSale ? (b.sale_price_cents as number) : b.price_cents)}
                      {onSale && (
                        <span className="ml-1.5 text-black/40 line-through">{rupees(b.price_cents)}</span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Link>

      {/* Floating Badge 2 (Bottom-Right): truthful rating / discount for the front book only */}
      <div
        aria-hidden={!frontHasClaim}
        className="hero-cf-layer pointer-events-none absolute -bottom-3 right-1 z-30 flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 shadow-lg sm:right-3 sm:px-4"
        style={{ opacity: frontHasClaim ? 1 : 0 }}
      >
        <div className="flex items-center text-brand-red" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((star) => (
            <svg key={star} viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d={STAR_PATH} />
            </svg>
          ))}
        </div>
        <span className="grid text-[12px] font-extrabold text-black">
          {books.map((b, i) => {
            const claim = claimFor(b);
            const isFront = i === active;
            return (
              <span
                key={b.id}
                aria-hidden={!isFront}
                className="hero-cf-layer whitespace-nowrap [grid-area:1/1]"
                style={{ opacity: isFront ? 1 : 0 }}
              >
                {claim?.kind === "rating" ? (
                  `${claim.rating.toFixed(1)} / 5`
                ) : claim?.kind === "discount" ? (
                  <T ta={`${claim.pct}% வரை சலுகை`} en={`Up to ${claim.pct}% OFF`} />
                ) : null}
              </span>
            );
          })}
        </span>
      </div>

      {/* Stage: fixed-size, perspective container (no layout shift) */}
      <div
        className="absolute inset-x-0 top-0 bottom-7 touch-pan-y select-none"
        style={{ perspective: "1100px" }}
        onPointerDown={(e) => {
          dragStartX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (dragStartX.current === null) return;
          const dx = e.clientX - dragStartX.current;
          dragStartX.current = null;
          if (Math.abs(dx) > SWIPE_PX) {
            suppressClick.current = true;
            if (dx < 0) goNext();
            else goPrev();
          }
        }}
        onPointerCancel={() => {
          dragStartX.current = null;
        }}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* Faint red sunrise halo (static) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[300px] sm:w-[300px]"
          style={{
            background:
              "radial-gradient(circle, rgba(229,35,32,0.22) 0%, rgba(229,35,32,0.08) 45%, rgba(229,35,32,0) 70%)",
          }}
        />

        {/* Soft ground shadow under the front book */}
        <div
          aria-hidden="true"
          className="hero-cf-shadow pointer-events-none absolute bottom-0 left-1/2 -ml-[66px] h-4 w-[132px] rounded-[50%] sm:-ml-[86px] sm:w-[172px]"
          style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 70%)" }}
        />

        {books.map((b, i) => {
          const offset = circularOffset(i, active, count);
          const isFront = offset === 0;
          const alt = splitBilingual(b.name, "|").join(" — ");
          const showImage = Boolean(b.image_url) && (seen.has(i) || Math.abs(offset) <= 1);
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={!isFront}
              className="hero-cf-card absolute left-1/2 top-2 -ml-[75px] w-[150px] sm:-ml-[98px] sm:w-[196px]"
              style={{
                ...slideStyle(offset, reduced),
                pointerEvents: Math.abs(offset) <= 1 ? "auto" : "none",
              }}
            >
              <div className={isFront && !reduced ? "hero-cf-float" : undefined}>
                <Link
                  href={hrefFor(b)}
                  prefetch={false}
                  tabIndex={isFront ? 0 : -1}
                  aria-label={alt}
                  draggable={false}
                  onClick={(e) => {
                    if (!isFront) {
                      e.preventDefault();
                      goTo(i);
                    }
                  }}
                  className="relative block aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-white bg-[#F4F4F5] shadow-2xl"
                >
                  {showImage ? (
                    <Img
                      src={b.image_url as string}
                      alt={alt}
                      fill
                      priority={i === 0}
                      draggable={false}
                      sizes="(max-width: 640px) 160px, 210px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2.5 text-center">
                      <span className="line-clamp-3 text-[11px] font-bold leading-tight text-black/80 sm:text-[12.5px]">
                        <BiName value={b.name} />
                      </span>
                      {!b.image_url && (
                        <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-medium text-black/55">
                          <T ta="படம் இல்லை" en="No cover" />
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </div>
            </div>
          );
        })}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="முந்தைய நூல் | Previous book"
              className="absolute left-0 top-1/2 z-30 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-black shadow-md transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-red sm:left-1"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="அடுத்த நூல் | Next book"
              className="absolute right-0 top-1/2 z-30 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-black shadow-md transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-red sm:right-1"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-1.5">
          {books.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`நூல் ${i + 1} | Book ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className="group inline-flex h-6 w-5 items-center justify-center"
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full transition-transform duration-300 ${
                  i === active ? "scale-[1.45] bg-brand-red" : "bg-black/25 group-hover:bg-black/45"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
