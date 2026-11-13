"use client";

import { useEffect, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import {
  ADMIN_LOGO_ALT,
  DEFAULT_LOGO_URL,
  LOGO_HEIGHT,
  LOGO_WIDTH,
  cloudinaryLogoTransform,
  resolveAdminLogoUrl,
} from "@/lib/logo";

export {
  ADMIN_LOGO_ALT,
  DEFAULT_LOGO_URL,
  LOGO_HEIGHT,
  LOGO_WIDTH,
  cloudinaryLogoTransform,
  resolveAdminLogoUrl,
};

function adminLogoLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    const q = quality ? `q_${quality}` : "q_auto";
    const afterUpload = src.split("/upload/")[1] || "";
    const firstSeg = afterUpload.split("/")[0] || "";
    if (firstSeg.includes("_") && !/^v\d+$/.test(firstSeg)) {
      return src;
    }
    return src.replace("/upload/", `/upload/f_auto,${q},w_${width}/`);
  }
  return src;
}

function AdminPenLoader({ size = 20 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading logo"
      className="inline-flex items-center justify-center"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="overflow-visible"
      >
        <path
          d="M 10 50 C 20 38, 28 58, 38 44 C 46 33, 50 48, 56 42"
          stroke="#dc2626"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
          className="admin-pen-stroke"
        />
        <g className="admin-pen-nib">
          <path
            d="M 28 8 L 36 8 L 40 24 L 32 38 L 24 24 Z"
            fill="#0a0a0a"
            stroke="#0a0a0a"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <line x1="32" y1="22" x2="32" y2="37" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="32" cy="21" r="2.2" fill="#dc2626" />
        </g>
      </svg>
    </div>
  );
}

interface AdminBrandLogoProps {
  src?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
  penSize?: number;
}

export function AdminBrandLogo({
  src,
  sizes = "80px",
  priority = false,
  className = "h-12 w-12",
  penSize = 20,
}: AdminBrandLogoProps) {
  const effectiveSrc = resolveAdminLogoUrl(src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [effectiveSrc]);

  const isCustomRemote =
    effectiveSrc.startsWith("http://") || effectiveSrc.startsWith("https://");

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ aspectRatio: `${LOGO_WIDTH} / ${LOGO_HEIGHT}` }}
    >
      {!loaded && (
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-neutral-950/90">
          <AdminPenLoader size={penSize} />
        </span>
      )}
      <Image
        loader={isCustomRemote ? adminLogoLoader : undefined}
        unoptimized={!isCustomRemote}
        src={effectiveSrc}
        alt={ADMIN_LOGO_ALT}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`h-full w-full object-contain transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}

export default AdminBrandLogo;
