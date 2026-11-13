import Link from "next/link";
import Img from "../ui/img";
import { T } from "../i18n/t";
import Sunburst from "../brand/sunburst";
import { ArrowRightIcon } from "../brand/icons";
import HeroCarousel from "./hero-carousel";
import { cloudinaryImageUrl } from "@/lib/site-defaults";

export interface SlideView {
  image_url?: string | null;
  mobile_image_url?: string | null;
  title_ta: string;
  title_en: string;
  subtitle_ta: string;
  subtitle_en: string;
  button_ta: string;
  button_en: string;
  href?: string | null;
  external?: boolean;
  /** Built-in brand slides: covers drawn on the sunburst background. */
  covers?: { src: string; alt: string }[];
}

/**
 * Hero slider (Server Component). Slides render on the server with zero JS; the
 * HeroCarousel island adds scroll-snap navigation, autoplay, dots and arrows.
 * Designed for 1920×700 on desktop; the first slide's image is `priority`.
 */
export default function HeroSlider({ slides }: { slides: SlideView[] }) {
  if (slides.length === 0) return null;
  return (
    <HeroCarousel>
      {slides.map((s, i) =>
        s.image_url ? <ImageSlide key={i} slide={s} first={i === 0} /> : <BrandSlide key={i} slide={s} first={i === 0} />,
      )}
    </HeroCarousel>
  );
}

function SlideCta({ slide, className }: { slide: SlideView; className: string }) {
  if (!slide.href || !(slide.button_ta || slide.button_en)) return null;
  const label = (
    <>
      <T ta={slide.button_ta || slide.button_en} en={slide.button_en || slide.button_ta} />
      <ArrowRightIcon />
    </>
  );
  return slide.external ? (
    <a href={slide.href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  ) : (
    <Link href={slide.href} className={className}>
      {label}
    </Link>
  );
}

function SlideText({ slide, first }: { slide: SlideView; first: boolean }) {
  const Heading = first ? "h1" : "h2";
  return (
    <div className="max-w-xl">
      {(slide.title_ta || slide.title_en) && (
        <Heading className="text-[34px] font-extrabold leading-[1.12] tracking-tight text-black sm:text-[46px] lg:text-[60px]">
          <T ta={slide.title_ta || slide.title_en} en={slide.title_en || slide.title_ta} />
        </Heading>
      )}
      {(slide.subtitle_ta || slide.subtitle_en) && (
        <p className="mt-4 text-[16px] leading-relaxed text-black/70 sm:text-[18px] lg:mt-6 lg:text-[21px]">
          <T ta={slide.subtitle_ta || slide.subtitle_en} en={slide.subtitle_en || slide.subtitle_ta} />
        </p>
      )}
      <SlideCta slide={slide} className="btn-red mt-7 h-12 text-[15px] lg:mt-9 lg:h-14 lg:px-8 lg:text-[17px]" />
    </div>
  );
}

/** Built-in slide: white canvas, red sunburst and fanned book covers. */
function BrandSlide({ slide, first }: { slide: SlideView; first: boolean }) {
  const covers = slide.covers ?? [];
  const tilt = ["-rotate-6 translate-y-6", "z-10 scale-110", "rotate-6 translate-y-6"];
  return (
    <div className="relative h-full w-full bg-white">
      <Sunburst className="pointer-events-none absolute -bottom-2 left-1/2 w-[760px] max-w-none -translate-x-1/2 opacity-[0.08] lg:left-auto lg:right-[4%] lg:w-[900px] lg:translate-x-0 lg:opacity-[0.14]" />
      <div className="container-site relative flex h-full items-center">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SlideText slide={slide} first={first} />
          </div>
          {covers.length > 0 && (
            <div className="hidden items-end justify-center lg:col-span-6 lg:flex">
              {covers.slice(0, 3).map((c, i) => (
                <div
                  key={c.src}
                  className={`relative -mx-4 aspect-[3/4] w-[clamp(150px,13vw,240px)] overflow-hidden rounded-xl bg-white shadow-glow-lg ring-1 ring-black/5 ${tilt[i] ?? ""}`}
                >
                  <Img
                    src={c.src}
                    alt={c.alt}
                    fill
                    sizes="(max-width: 1024px) 160px, 240px"
                    priority={first && i === 1}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Admin slide: full-bleed image with an optional white text panel for legibility. */
function ImageSlide({ slide, first }: { slide: SlideView; first: boolean }) {
  const hasText = Boolean(slide.title_ta || slide.title_en || slide.subtitle_ta || slide.subtitle_en);
  const alt = hasText ? "" : slide.title_en || slide.title_ta || "Muthamilarignar Pathipagam";
  const hasSeparateMobile = Boolean(
    slide.mobile_image_url && slide.mobile_image_url !== slide.image_url,
  );
  return (
    <div className="relative h-full w-full bg-brand-red-light">
      {hasSeparateMobile ? (
        <picture className="absolute inset-0 block h-full w-full">
          <source
            media="(min-width: 768px)"
            srcSet={`${cloudinaryImageUrl(slide.image_url, 1280)} 1280w, ${cloudinaryImageUrl(slide.image_url, 1920)} 1920w`}
            sizes="100vw"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryImageUrl(slide.mobile_image_url, 828)}
            srcSet={`${cloudinaryImageUrl(slide.mobile_image_url, 640)} 640w, ${cloudinaryImageUrl(slide.mobile_image_url, 828)} 828w`}
            sizes="100vw"
            alt={alt}
            loading={first ? "eager" : "lazy"}
            decoding={first ? "sync" : "async"}
            // @ts-expect-error React 18 lowercase fetchpriority attribute support
            fetchpriority={first ? "high" : undefined}
            className="h-full w-full object-cover"
          />
        </picture>
      ) : (
        <Img
          src={slide.image_url || ""}
          alt={alt}
          fill
          sizes="100vw"
          priority={first}
          className="object-cover"
        />
      )}
      {hasText ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent lg:via-white/50" aria-hidden="true" />
          <div className="container-site relative flex h-full items-center">
            <SlideText slide={slide} first={first} />
          </div>
        </>
      ) : (
        slide.href && (
          <div className="container-site relative flex h-full items-end pb-16">
            <SlideCta slide={slide} className="btn-red h-12 text-[15px]" />
          </div>
        )
      )}
    </div>
  );
}
