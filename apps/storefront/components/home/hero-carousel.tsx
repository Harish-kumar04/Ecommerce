"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../brand/icons";

const INTERVAL_MS = 5000;
const TOUCH_RESUME_MS = 6000;

/**
 * Client controller for the hero slider. Slides arrive as server-rendered children, so
 * their images, text and links cost no client JS; this island only handles the CSS
 * scroll-snap track, autoplay (5s; paused on hover, focus, touch and hidden tabs; off
 * under prefers-reduced-motion), dots and arrows.
 */
export default function HeroCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const touchTimer = useRef<number>();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = trackRef.current;
      if (!el || count === 0) return;
      const next = ((i % count) + count) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [count, reduced],
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / (el.clientWidth || 1)))));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [count]);

  const paused = hovered || focused || touched || reduced;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") goTo(index + 1);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, count, index, goTo]);

  useEffect(() => () => window.clearTimeout(touchTimer.current), []);

  const arrow =
    "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black shadow-card transition-colors hover:border-brand-red hover:text-brand-red md:inline-flex";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="சிறப்பு அறிவிப்புகள் / Featured"
      className="relative bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onTouchStart={() => {
        window.clearTimeout(touchTimer.current);
        setTouched(true);
      }}
      onTouchEnd={() => {
        touchTimer.current = window.setTimeout(() => setTouched(false), TOUCH_RESUME_MS);
      }}
    >
      <div ref={trackRef} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            className="relative h-[480px] w-full shrink-0 snap-start snap-always overflow-hidden sm:h-[540px] lg:h-[clamp(540px,36.5vw,700px)]"
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => goTo(index - 1)} aria-label="முந்தைய / Previous slide" className={`${arrow} left-3 lg:left-6`}>
            <ChevronLeftIcon />
          </button>
          <button type="button" onClick={() => goTo(index + 1)} aria-label="அடுத்த / Next slide" className={`${arrow} right-3 lg:right-6`}>
            <ChevronRightIcon />
          </button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 lg:bottom-6">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1} / ${count}`}
                aria-current={i === index ? "true" : undefined}
                className="group inline-flex h-6 items-center justify-center px-0.5"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    i === index ? "w-8 bg-brand-red" : "w-2 bg-black/25 group-hover:bg-black/45"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
