"use client";

import { useState } from "react";
import Img from "@/components/ui/img";
import PenLoader from "@/components/ui/pen-loader";
import {
  DEFAULT_LOGO_URL,
  LOGO_ALT,
  LOGO_HEIGHT,
  LOGO_WIDTH,
} from "@/lib/site-defaults";

/**
 * Publisher brand logo rendered via next/image with Cloudinary transforms (f_auto,q_auto,w_<width>).
 * Reserves exact 1600x1596 aspect ratio to prevent layout shift and displays <PenLoader /> while loading.
 */
export default function BrandLogo({
  src = DEFAULT_LOGO_URL,
  sizes = "(max-width: 640px) 52px, 72px",
  className = "h-[50px] lg:h-[68px]",
  wrapperClassName = "",
  penSize = "sm",
}: {
  src?: string | null;
  sizes?: string;
  className?: string;
  wrapperClassName?: string;
  penSize?: "sm" | "md";
}) {
  const effectiveSrc = src && src !== "/logo.jpg" ? src : DEFAULT_LOGO_URL;
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoaded = loadedSrc === effectiveSrc;

  return (
    <span
      className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden ${wrapperClassName}`}
      style={{ aspectRatio: `${LOGO_WIDTH} / ${LOGO_HEIGHT}` }}
    >
      {!isLoaded && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white">
          <PenLoader size={penSize} label="Loading" />
        </span>
      )}
      <Img
        src={effectiveSrc}
        alt={LOGO_ALT}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        sizes={sizes}
        placeholder="empty"
        onLoad={() => setLoadedSrc(effectiveSrc)}
        onError={() => setLoadedSrc(effectiveSrc)}
        className={`w-auto object-contain transition-opacity duration-200 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
      />
    </span>
  );
}
