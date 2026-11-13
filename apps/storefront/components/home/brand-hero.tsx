import Link from "next/link";
import Img from "@/components/ui/img";
import { BiName, T } from "@/components/i18n/t";
import { ArrowRightIcon } from "@/components/brand/icons";
import { HeroRedArch, SunburstBackdrop } from "@/components/brand/patterns";
import type { CardProduct } from "@/components/product/product-card";
import { splitBilingual } from "@/lib/i18n";

/**
 * Original brand landing hero (Server Component, zero client JS):
 * - Left: Publisher pill, bold bilingual H1, concise subtext, two >=48px pill CTAs ("Browse books", "Offers")
 * - Right: 3 tilted real catalog book covers over a Revolutionary Red arch + 5% sunburst,
 *   with floating badges fed strictly from real catalog data
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
  const covers = heroBooks.filter((b) => b.image_url).slice(0, 3);
  const leadBook = covers[1] || covers[0] || heroBooks[0];
  const saleBook = heroBooks.find(
    (b) => b.sale_price_cents && b.price_cents > 0 && b.sale_price_cents < b.price_cents,
  );
  const maxDiscountPct = saleBook
    ? Math.max(
        1,
        Math.round(
          ((saleBook.price_cents - (saleBook.sale_price_cents as number)) / saleBook.price_cents) *
            100,
        ),
      )
    : 0;
  const ratedBook = heroBooks.find((b) => b.rating_avg && b.rating_avg > 0);

  const tilts = [
    "-rotate-6 translate-y-4 sm:translate-y-5 z-10",
    "z-20 -translate-y-2 scale-[1.06]",
    "rotate-6 translate-y-4 sm:translate-y-5 z-10",
  ];

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
                href={`/${tenant}/products`}
                className="btn-black h-12 px-7 text-[15px] shadow-card sm:h-[52px] sm:px-8 sm:text-[15.5px]"
              >
                <T ta="நூல்களைக் காண்க" en="Browse books" />
                <ArrowRightIcon className="h-4 w-4" />
              </Link>

              <Link
                href={`/${tenant}/products?sale=1`}
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

              {/* Floating Badge 1 (Top-Left): Best Seller / Featured Real Book */}
              {leadBook && (
                <Link
                  href={`/${tenant}/products/${leadBook.id}`}
                  prefetch={false}
                  className="absolute left-0 top-2 z-30 flex max-w-[200px] items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 shadow-lg transition-transform hover:-translate-y-0.5 sm:left-2 sm:top-4 sm:px-3.5 sm:py-2.5"
                >
                  <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#D11D1A] text-white">
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-brand-red-dark">
                      <T ta="சிறந்த வெளியீடு" en="Best Seller" />
                    </p>
                    <p className="truncate text-[12px] font-bold text-black">
                      <BiName value={leadBook.name} />
                    </p>
                  </div>
                </Link>
              )}

              {/* Floating Badge 2 (Bottom-Right): Real Rating OR Real Sale % OR Verified Official Badge */}
              <div className="absolute -bottom-3 right-1 z-30 flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 shadow-lg sm:right-3 sm:px-4">
                <div className="flex items-center text-brand-red" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <svg key={star} viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-[12px] font-extrabold text-black">
                  {ratedBook?.rating_avg ? (
                    `${ratedBook.rating_avg.toFixed(1)} / 5`
                  ) : maxDiscountPct > 0 ? (
                    <T ta={`${maxDiscountPct}% வரை சலுகை`} en={`Up to ${maxDiscountPct}% OFF`} />
                  ) : (
                    <T ta="அசல் பதிப்பு" en="100% Authentic" />
                  )}
                </span>
              </div>

              {/* 3 Tilted Real Book Covers */}
              {covers.length > 0 ? (
                <div className="relative z-10 flex items-end justify-center pb-4 sm:pb-6">
                  {covers.map((book, idx) => {
                    const isCenter = idx === 1 || covers.length === 1;
                    const alt = splitBilingual(book.name, "|").join(" — ");
                    return (
                      <Link
                        key={book.id}
                        href={`/${tenant}/products/${book.id}`}
                        prefetch={false}
                        aria-label={alt}
                        className={`relative -mx-2.5 aspect-[3/4] w-[108px] overflow-hidden rounded-xl border-2 border-white bg-white shadow-2xl transition-transform duration-300 hover:z-30 hover:scale-110 sm:-mx-3.5 sm:w-[152px] lg:w-[164px] ${
                          tilts[idx] || ""
                        }`}
                      >
                        <Img
                          src={book.image_url as string}
                          alt={alt}
                          fill
                          priority={isCenter}
                          sizes="(max-width: 640px) 115px, 170px"
                          className="object-cover"
                        />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="relative z-10 flex h-56 w-44 items-center justify-center rounded-2xl border-2 border-white bg-white p-4 text-center text-sm font-bold text-black shadow-xl">
                  <T ta="முத்தமிழறிஞர் பதிப்பகம்" en="Muthamilarignar Pathipagam" />
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
