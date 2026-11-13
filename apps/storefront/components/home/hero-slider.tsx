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
  covers?: { src: string; alt: string }[];
}

/**
 * Admin-controlled 3-image Offer Slider (Server Component).
 * Uses H2 headings because BrandHero owns the single page H1.
 */
export default function HeroSlider({ slides }: { slides: SlideView[] }) {
  if (slides.length === 0) return null;
  return (
    <HeroCarousel>
      {slides.slice(0, 6).map((s, i) =>
        s.image_url ? <ImageSlide key={i} slide={s} /> : <BrandSlide key={i} slide={s} />,
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
    <Link href={slide.href} prefetch={false} className={className}>
      {label}
    </Link>
  );
}

function SlideText({ slide }: { slide: SlideView }) {
  return (
    <div className="max-w-xl">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D11D1A] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
        <T ta="சிறப்புச் சலுகை" en="Publisher Highlight" />
      </span>
      {(slide.title_ta || slide.title_en) && (
        <h2 className="mt-3 text-[26px] font-extrabold leading-[1.15] tracking-tight text-black sm:text-[36px] lg:text-[44px]">
          <T ta={slide.title_ta || slide.title_en} en={slide.title_en || slide.title_ta} />
        </h2>
      )}
      {(slide.subtitle_ta || slide.subtitle_en) && (
        <p className="mt-3 text-[15px] leading-relaxed text-black/75 sm:text-[17px]">
          <T ta={slide.subtitle_ta || slide.subtitle_en} en={slide.subtitle_en || slide.subtitle_ta} />
        </p>
      )}
      <SlideCta slide={slide} className="btn-black mt-6 h-12 px-7 text-[14.5px]" />
    </div>
  );
}

function BrandSlide({ slide }: { slide: SlideView }) {
  const covers = slide.covers ?? [];
  const tilt = ["-rotate-6 translate-y-4", "z-10 scale-105", "rotate-6 translate-y-4"];
  return (
    <div className="pattern-red-dots relative h-full w-full bg-[#FAFAFA]">
      <Sunburst className="pointer-events-none absolute -bottom-2 right-[5%] w-[640px] max-w-none opacity-[0.06]" />
      <div className="container-site relative flex h-full items-center pb-10">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SlideText slide={slide} />
          </div>
          {covers.length > 0 && (
            <div className="hidden items-end justify-center lg:col-span-6 lg:flex">
              {covers.slice(0, 3).map((c, i) => (
                <div
                  key={c.src}
                  className={`relative -mx-3 aspect-[3/4] w-[165px] overflow-hidden rounded-xl border-2 border-white bg-white shadow-glow-lg ${tilt[i] ?? ""}`}
                >
                  <Img
                    src={c.src}
                    alt={c.alt}
                    fill
                    sizes="170px"
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

function ImageSlide({ slide }: { slide: SlideView }) {
  const hasText = Boolean(slide.title_ta || slide.title_en || slide.subtitle_ta || slide.subtitle_en);
  const alt = hasText ? "" : slide.title_en || slide.title_ta || "Muthamilarignar Pathipagam Offer";
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
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </picture>
      ) : (
        <Img
          src={slide.image_url || ""}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover"
        />
      )}
      {hasText ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-transparent lg:via-white/55" aria-hidden="true" />
          <div className="container-site relative flex h-full items-center pb-10">
            <SlideText slide={slide} />
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
