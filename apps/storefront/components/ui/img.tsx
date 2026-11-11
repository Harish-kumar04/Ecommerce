import type { ImageProps } from "next/image";
import { getImgProps } from "next/dist/shared/lib/get-img-props";
import defaultLoader from "next/dist/shared/lib/image-loader";
import type { ImageConfigComplete } from "next/dist/shared/lib/image-config";
import { canOptimize } from "@/lib/site-defaults";

/**
 * next/image optimisation without the next/image client component.
 *
 * Uses Next's own `getImgProps` (the function behind `getImageProps()` in next/image)
 * with the build-time image config, producing the same optimised `src`, `srcSet`,
 * `sizes`, `loading`/`fetchPriority` and layout styles as <Image>, but rendered as a
 * plain <img>. Importing `next/image` itself would pull its client component into every
 * page's JavaScript; this keeps image rendering at zero client JS.
 * Hosts not allowed in next.config.js `images.remotePatterns` fall back to `unoptimized`.
 */
export default function Img(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : null;
  const unoptimized = props.unoptimized ?? (src ? !canOptimize(src) : false);
  const { props: imgProps } = getImgProps(
    { ...props, unoptimized },
    {
      defaultLoader,
      // Replaced at build time by Next's DefinePlugin (same source next/image uses).
      imgConf: process.env.__NEXT_IMAGE_OPTS as unknown as ImageConfigComplete,
    },
  );
  const clean = Object.fromEntries(Object.entries(imgProps).filter(([, v]) => v !== undefined));
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...clean} />;
}
