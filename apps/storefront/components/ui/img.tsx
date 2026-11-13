"use client";

import NextImage, { type ImageLoader, type ImageProps } from "next/image";
import { canOptimize, cloudinaryImageUrl, isCloudinaryUrl } from "@/lib/site-defaults";

/**
 * Lightweight inline SVG blur placeholder on a warm-white 3:4 book sheet.
 */
export const BOOK_BLUR_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 48'%3E%3Crect width='36' height='48' fill='%23fafafa'/%3E%3Crect x='4' y='5' width='28' height='38' rx='2.5' fill='%23f1f1f2'/%3E%3Cpath d='M10 31c4-3 7 2 11-1s4-2 6 0' fill='none' stroke='%23e52320' stroke-opacity='.38' stroke-width='1.4' stroke-linecap='round'/%3E%3Cpath d='M21 17l3.5 3.5-4.5 5.5-4 1 .8-4z' fill='%23000' fill-opacity='.18'/%3E%3C/svg%3E";

const cloudinaryLoader: ImageLoader = ({ src, width }) => cloudinaryImageUrl(src, width);

export default function Img(props: ImageProps) {
  const { priority, loading: _ignoredLoading, loader: customLoader, unoptimized: customUnoptimized, placeholder, blurDataURL, ...rest } = props;

  const srcStr = typeof rest.src === "string" ? rest.src : null;
  const isCloud = isCloudinaryUrl(srcStr);
  const loader = customLoader ?? (isCloud ? cloudinaryLoader : undefined);
  const unoptimized =
    customUnoptimized ?? (srcStr ? !isCloud && !canOptimize(srcStr) : false);

  const isPriority = Boolean(priority);
  const useBlur =
    !isPriority &&
    placeholder !== "empty" &&
    (rest.fill || (Number(rest.width) || 0) >= 64);

  return (
    <NextImage
      {...rest}
      loader={loader}
      unoptimized={unoptimized}
      priority={isPriority ? true : undefined}
      loading={isPriority ? undefined : "lazy"}
      placeholder={useBlur ? "blur" : "empty"}
      blurDataURL={useBlur ? blurDataURL || BOOK_BLUR_DATA_URL : undefined}
    />
  );
}
