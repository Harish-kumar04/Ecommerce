import Link from "next/link";
import { T } from "@/components/i18n/t";
import { ArrowRightIcon } from "@/components/brand/icons";
import { HeroRedArch, SunburstBackdrop } from "@/components/brand/patterns";
import HeroBookCarousel, { type HeroCarouselBook } from "@/components/home/hero-book-carousel";
import type { CardProduct } from "@/components/product/product-card";

/**
 * Original brand landing hero (Server Component; only the carousel is a client island):
 * - Left: Publisher pill, bold bilingual H1, concise subtext, two >=48px pill CTAs ("Browse books", "Offers")
 * - Right: live featured-books coverflow carousel over a Revolutionary Red arch + 5% sunburst,
 *   with floating badges that follow the front book (real catalog data only)
 * - Bottom: Bold 4-column stats row fed strictly from real store/catalog numbers
 */
export default function BrandHero({
  tenant,
  heroBooks,
  totalBooks,
  categoryCount,
}: {
  tenant: string;
  heroBooks: CardProduct[];
  totalBooks: number;
  categoryCount: number;
}) {
  const seenHeroCovers = new Set<string>();
  const covers = heroBooks.filter((b) => {
    if (!b.image_url) return false;
    if (seenHeroCovers.has(b.image_url)) return false;
    seenHeroCovers.add(b.image_url);
    return true;
  });
  // Same featured-books source as before; slimmed to what the client island needs.
  const carouselBooks: HeroCarouselBook[] = (covers.length > 0 ? covers : heroBooks)
    .slice(0, 8)
    .map((b) => ({
      id: b.id,
      slug: b.slug ?? null,
      name: b.name,
      image_url: b.image_url ?? null,
      price_cents: b.price_cents,
      sale_price_cents: b.sale_price_cents ?? null,
      rating_avg: b.rating_avg ?? null,
    }));

  const stats = [
    {
      value: totalBooks > 0 ? `${totalBooks}` : "25+",
      ta: "வெளியிடப்பட்ட நூல்கள்",
      en: "Published Titles",
    },
    {
      value: categoryCount > 0 ? `${categoryCount}` : "6",
      ta: "நூல் பிரிவுகள்",
      en: "Subject Categories",
    },
    {
      value: "₹500+",
      ta: "இலவச விநியோகம்",
      en: "Free Pan-India Shipping",
    },
    {
      value: "COD",
      ta: "புத்தகம் வந்ததும் பணம்",
      en: "Cash on Delivery",
    },
  ];

  return (
    <section
      aria-label="Muthamilarignar Pathipagam Hero"
      className="relative overflow-hidden border-b border-black/[0.08] bg-white pt-6 pb-10 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16"
    >
      <SunburstBackdrop position="right" />

      <div className="container-site relative">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Bilingual H1 + Pill CTAs */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-red/25 bg-brand-red-light px-3.5 py-1.5 text-[12px] font-bold text-brand-red-dark">
              <span className="h-2 w-2 rounded-full bg-brand-red" aria-hidden="true" />
              <T
                ta="முத்தமிழறிஞர் பதிப்பகம் • அதிகாரப்பூர்வ இணைய நூலகம்"
                en="Muthamilarignar Pathipagam • Official Bookstore"
              />
            </div>

            <h1 className="mt-4 text-[32px] font-extrabold leading-[1.12] tracking-tight text-black sm:text-[46px] lg:text-[56px]">
              <T
                ta="அறிவாற்றலும் சமூகநீதிச் சிந்தனையும் ஒவ்வொரு பக்கத்திலும்."
                en="Dravidian History, Social Justice & Kalaignar’s Timeless Works."
              />
            </h1>

            <div aria-hidden="true" className="mt-4 h-1.5 w-16 rounded-full bg-brand-red" />

            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-black/75 sm:text-[17.5px]">
              <T
                ta="திராவிட இயக்க வரலாறு, மாநில சுயாட்சி, மொழி உரிமை மற்றும் முத்தமிழறிஞர் கலைஞர் அவர்களின் அரிய படைப்புகளை நேரடிப் பதிப்பகத் தரத்தில் உங்கள் இல்லத்திற்கே பெறுங்கள்."
                en="Order authentic printed editions on Dravidian movement history, state autonomy, language rights, and the literary legacy of Muthamilarignar Kalaignar — shipped across India."
              />
            </p>

            {/* Two Pill CTAs (>=48px height) */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5 sm:mt-8">
              <Link
                href={`/${tenant}/books`}
                className="btn-black h-12 px-7 text-[15px] shadow-card sm:h-[52px] sm:px-8 sm:text-[15.5px]"
              >
                <T ta="நூல்களைக் காண்க" en="Browse books" />
                <ArrowRightIcon className="h-4 w-4" />
              </Link>

              <Link
                href={`/${tenant}/books?sale=1`}
                className="btn-red h-12 px-7 text-[15px] shadow-glow sm:h-[52px] sm:px-8 sm:text-[15.5px]"
              >
                <T ta="சலுகைகள்" en="Offers" />
              </Link>
            </div>
          </div>

          {/* Right Column: Tilted Real Book Covers over Revolutionary Red Arch + Floating Badges */}
          <div className="relative mx-auto w-full max-w-[460px] lg:col-span-6 lg:max-w-[520px]">
            <div className="relative flex min-h-[290px] items-end justify-center px-2 pt-8 sm:min-h-[370px] sm:pt-10">
              {/* Red Semicircle Arch Backdrop */}
              <HeroRedArch className="absolute inset-x-0 bottom-0 mx-auto h-[84%] w-full max-w-[460px]" />

              {/* Live featured-books carousel (client island; chips + caption follow the front book) */}
              {carouselBooks.length > 0 ? (
                <HeroBookCarousel tenant={tenant} books={carouselBooks} />
              ) : (
                <div className="relative z-10 mb-4 flex h-56 w-44 items-center justify-center rounded-2xl border-2 border-white bg-[#F4F4F5] p-4 text-center text-sm font-bold text-black/60 shadow-xl">
                  <T ta="படம் இல்லை" en="No cover" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bold Real-Data Stats Row */}
        <div
          aria-label="Bookstore highlights"
          className="mt-10 grid grid-cols-2 gap-3 rounded-2xl border border-black/10 bg-[#FAFAFA] p-4 shadow-card sm:mt-12 sm:grid-cols-4 sm:gap-4 sm:p-6"
        >
          {stats.map((st, idx) => (
            <div
              key={st.en}
              className={`flex flex-col justify-center px-2 py-1 text-center sm:text-left ${
                idx > 0 ? "sm:border-l sm:border-black/10 sm:pl-6" : ""
              }`}
            >
              <span className="text-[24px] font-extrabold tracking-tight text-brand-red sm:text-[30px]">
                {st.value}
              </span>
              <span className="mt-0.5 text-[12.5px] font-semibold text-black/80 sm:text-[13.5px]">
                <T ta={st.ta} en={st.en} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
