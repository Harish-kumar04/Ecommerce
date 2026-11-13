import ReactDOM from "react-dom";
import type { ImageLoader, ImageProps } from "next/image";
import { getImgProps } from "next/dist/shared/lib/get-img-props";
import defaultLoader from "next/dist/shared/lib/image-loader";
import type { ImageConfigComplete } from "next/dist/shared/lib/image-config";
import { canOptimize, cloudinaryImageUrl, isCloudinaryUrl } from "@/lib/site-defaults";

/**
 * Lightweight inline SVG image-load placeholder featuring a subtle fountain-pen nib
 * writing a #E52320 red ink curve on a warm-white 3:4 book sheet.
 */
export const BOOK_BLUR_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 48'%3E%3Crect width='36' height='48' fill='%23fafafa'/%3E%3Crect x='4' y='5' width='28' height='38' rx='2.5' fill='%23f1f1f2'/%3E%3Cpath d='M10 31c4-3 7 2 11-1s4-2 6 0' fill='none' stroke='%23e52320' stroke-opacity='.38' stroke-width='1.4' stroke-linecap='round'/%3E%3Cpath d='M21 17l3.5 3.5-4.5 5.5-4 1 .8-4z' fill='%23000' fill-opacity='.18'/%3E%3C/svg%3E";

const cloudinaryLoader: ImageLoader = ({ src, width }) => cloudinaryImageUrl(src, width);
const gifCoverLoader: ImageLoader = ({ src, width, quality }) =>
  `/api/cover?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;

function isOptimizableRemoteGif(src?: string | null): boolean {
  if (!src || src.startsWith("/") || !canOptimize(src)) return false;
  try {
    return new URL(src).pathname.toLowerCase().endsWith(".gif");
  } catch {
    return false;
  }
}

export default function Img(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : null;
  const isCloud = isCloudinaryUrl(src);
  const isRemoteGif = !isCloud && isOptimizableRemoteGif(src);
  const unoptimized =
    props.unoptimized ?? (src ? !isCloud && !canOptimize(src) : false);
  const loader =
    props.loader ??
    (isCloud ? cloudinaryLoader : isRemoteGif ? gifCoverLoader : undefined);
  const showPlaceholder =
    !props.priority &&
    props.placeholder !== "empty" &&
    (props.fill || (Number(props.width) || 0) >= 64);

  const { placeholder: _ignoredPlaceholder, blurDataURL: _ignoredBlur, style, ...rest } = props;

  const { props: imgProps } = getImgProps(
    {
      loading: props.priority ? undefined : (props.loading ?? "lazy"),
      decoding: "async",
      ...rest,
      loader,
      unoptimized,
    },
    {
      defaultLoader,
      imgConf: process.env.__NEXT_IMAGE_OPTS as unknown as ImageConfigComplete,
    },
  );

  if (props.priority && imgProps.src) {
    ReactDOM.preload(imgProps.src, {
      as: "image",
      imageSrcSet: imgProps.srcSet,
      imageSizes: imgProps.sizes,
      fetchPriority: "high",
    });
  }

  const mergedStyle = showPlaceholder
    ? {
        backgroundColor: "#f7f7f7",
        backgroundImage: `url("${BOOK_BLUR_DATA_URL}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...imgProps.style,
        ...style,
      }
    : { ...imgProps.style, ...style };

  const clean = Object.fromEntries(
    Object.entries({ ...imgProps, style: mergedStyle }).filter(([, v]) => v !== undefined),
  );
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...clean} />;
}
