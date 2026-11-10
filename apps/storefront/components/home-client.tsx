"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import ProductCard from "@/components/product/product-card";
import NewsletterForm from "@/components/newsletter-form";

export default function HomeClient({
  tenant,
  products,
  categories,
  store,
}: {
  tenant: string;
  products: any[];
  categories: any[];
  store: any;
}) {
  const { t, localizeName } = useLanguage();
  const featuredBooks = products.slice(0, 8);
  const remainingBooks = products.slice(8);

  return (
    <div className="bg-white dark:bg-black">
      {/* HERO BANNER — Black & Red Dravidian Bookstore Theme */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950 text-white border-b border-red-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-600/20 border border-red-500/40 px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-red-300">
                <span>
                  {t(
                    "முத்தமிழறிஞர் பதிப்பகம் • அதிகாரப்பூர்வ இணைய நூலகம்",
                    "Muthamilarignar Pathipagam • Official Online Bookstore",
                  )}
                </span>
              </div>

              <h1 className="mt-4 text-[34px] sm:text-[52px] font-extrabold tracking-tight leading-[1.1] text-white">
                {t(
                  "முத்தமிழறிஞர் பதிப்பகம்",
                  "Muthamilarignar Pathipagam",
                )}
              </h1>
              <p className="mt-2 text-[18px] sm:text-[22px] font-semibold text-red-400">
                {t(
                  "திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள்",
                  "Dravidian History, Social Justice & Kalaignar Literature",
                )}
              </p>

              <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-neutral-300 max-w-xl">
                {t(
                  "காலத்தின் நிறம் கருப்பு சிவப்பு, திராவிட மாடல் அரசு, உடன் பிறப்பே, திராவிடப் போராளிகள் உள்ளிட்ட 27-க்கும் மேற்பட்ட வரலாற்றுச் சிறப்புமிக்க நூல்களை இணையம் வழியாக உடனே ஆர்டர் செய்யுங்கள்.",
                  "Explore and order all 27 official publications including Kaalatthin Niram Karuppu Sivappu, Dravida Model Arasu, Udan Pireppe, Dravida Poraligal, and the complete works on Muthamilarignar Kalaignar.",
                )}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/${tenant}/products`}
                  className="inline-flex h-12 px-7 items-center justify-center rounded-full text-[15px] font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/25"
                >
                  {t(
                    `அனைத்து நூல்களையும் காண்க (${products.length})`,
                    `Browse All Books (${products.length})`,
                  )}
                </Link>
                <a
                  href="#complete-collection"
                  className="inline-flex h-12 px-7 items-center justify-center rounded-full text-[15px] font-semibold border border-neutral-700 bg-neutral-900/60 text-white hover:bg-neutral-800 transition-colors"
                >
                  {t("சிறப்பு வெளியீடுகள்", "Featured Editions")}
                </a>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-800/80 grid grid-cols-3 gap-4 max-w-lg text-left">
                <div>
                  <p className="text-[22px] font-extrabold text-red-400">
                    {products.length}+
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {t("அதிகாரப்பூர்வ நூல்கள்", "Official Titles")}
                  </p>
                </div>
                <div>
                  <p className="text-[22px] font-extrabold text-red-400">
                    ₹40 – ₹750
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {t("எளிய மக்கள் விலை", "Accessible Pricing")}
                  </p>
                </div>
                <div>
                  <p className="text-[22px] font-extrabold text-red-400">
                    100%
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {t("அசல் பதிப்புகள்", "Original Editions")}
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Right — Official Publisher Logo & Flagship Book Showcase */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-neutral-900 to-black p-6 border border-red-500/30 shadow-2xl">
                <div className="flex items-center gap-4 pb-5 border-b border-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.jpg"
                    alt="Muthamilarignar Pathipagam Official Emblem"
                    className="h-20 w-20 rounded-2xl object-contain bg-white p-1 shadow-md flex-shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                      {t("அதிகாரப்பூர்வ இலச்சினை", "Official Publisher Emblem")}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-white">
                      முத்தமிழறிஞர் பதிப்பகம்
                    </p>
                    <p className="text-xs text-neutral-400">
                      Muthamilarignar Pathipagam
                    </p>
                  </div>
                </div>

                {/* Top 3 Flagship Covers Preview */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {products.slice(0, 3).map((b: any) => (
                    <Link
                      key={b.id}
                      href={`/${tenant}/products/${b.id}`}
                      className="group block rounded-xl overflow-hidden bg-neutral-800 p-1.5 border border-neutral-700 hover:border-red-500 transition-all"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={b.image_url || b.images?.[0]}
                          alt={localizeName(b.name)}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY PILLS SECTION */}
      {categories.length > 0 && (
        <section className="border-b border-gray-100 dark:border-neutral-900 bg-gray-50/70 dark:bg-neutral-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                {t("நூல் வகைகள் (Categories):", "Book Categories:")}
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/${tenant}/products`}
                    className="px-4 py-1.5 rounded-full text-[13px] font-semibold bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-neutral-200 hover:border-red-600 hover:text-red-600 transition-colors"
                  >
                    {localizeName(cat.name)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FEATURED BOOKS (FIRST 8) */}
      <section
        id="complete-collection"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
              {t("முத்தமிழறிஞர் பதிப்பகம்", "Muthamilarignar Pathipagam")}
            </p>
            <h2 className="mt-1.5 text-[28px] sm:text-[36px] font-extrabold tracking-tight text-gray-900 dark:text-neutral-100">
              {t(
                "முதன்மை வெளியீடுகள் (Featured Books)",
                "Featured Publications (முதன்மை வெளியீடுகள்)",
              )}
            </h2>
          </div>
          <Link
            href={`/${tenant}/products`}
            className="inline-flex items-center gap-1 text-[14px] font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            {t(
              `அனைத்து ${products.length} நூல்களையும் காண்க →`,
              `View All ${products.length} Books →`,
            )}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {featuredBooks.map((p: any) => (
            <ProductCard key={p.id} product={p} tenant={tenant} />
          ))}
        </div>
      </section>

      {/* COMPLETE CATALOG SECTION (REMAINING 19 BOOKS) */}
      {remainingBooks.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8 pt-8 border-t border-gray-100 dark:border-neutral-900">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
                {t("முழு நூல் பட்டியல்", "Complete Collection")}
              </p>
              <h2 className="mt-1.5 text-[24px] sm:text-[32px] font-extrabold tracking-tight text-gray-900 dark:text-neutral-100">
                {t(
                  "திராவிட இயக்க & கலைஞர் நூல்கள் வரிசை",
                  "More Titles from Muthamilarignar Pathipagam",
                )}
              </h2>
            </div>
            <Link
              href={`/${tenant}/products`}
              className="text-[14px] font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              {t("தேடல் & வடிகட்டுதல் →", "Search & Filter Catalog →")}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {remainingBooks.map((p: any) => (
              <ProductCard key={p.id} product={p} tenant={tenant} />
            ))}
          </div>
        </section>
      )}

      {/* WHY MUTHAMILARIGNAR PATHIPAGAM */}
      <section className="bg-gray-50 dark:bg-neutral-950 border-y border-gray-200/70 dark:border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
            {t(
              "முத்தமிழறிஞர் பதிப்பகம்",
              "Why Order From Muthamilarignar Pathipagam",
            )}
          </p>
          <h2 className="mt-2 text-[28px] sm:text-[36px] font-extrabold tracking-tight text-gray-900 dark:text-neutral-100">
            {t(
              "அறிவாற்றலும் சமூகநீதிச் சிந்தனையும்.",
              "Authentic Editions. Pan-India Delivery.",
            )}
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-white dark:bg-neutral-900 p-6 border border-gray-200/70 dark:border-neutral-800">
              <p className="text-[16px] font-bold text-gray-900 dark:text-neutral-100">
                {t(
                  "100% அதிகாரப்பூர்வப் பதிப்புகள்",
                  "100% Official Publisher Editions",
                )}
              </p>
              <p className="mt-2 text-[14px] text-gray-600 dark:text-neutral-400 leading-relaxed">
                {t(
                  "முத்தமிழறிஞர் பதிப்பகத்தின் நேரடி அச்சுப் பதிப்புகள் — உயர்தரத் தாள் மற்றும் நேர்த்தியான கட்டமைப்பு.",
                  "Every book is sourced directly from Muthamilarignar Pathipagam with original cover artwork and archival print quality.",
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-neutral-900 p-6 border border-gray-200/70 dark:border-neutral-800">
              <p className="text-[16px] font-bold text-gray-900 dark:text-neutral-100">
                {t("பாதுகாப்பான இணைய வழி கட்டணம்", "Secure Online & COD Checkout")}
              </p>
              <p className="mt-2 text-[14px] text-gray-600 dark:text-neutral-400 leading-relaxed">
                {t(
                  "UPI, கிரெடிட்/டெபிட் கார்டு (Razorpay / Stripe) மற்றும் புத்தகம் நேரில் வரும்போது பணம் செலுத்தும் வசதி (COD).",
                  "Pay seamlessly via UPI, Cards, NetBanking (Razorpay / Stripe), or Cash on Delivery (COD).",
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-neutral-900 p-6 border border-gray-200/70 dark:border-neutral-800">
              <p className="text-[16px] font-bold text-gray-900 dark:text-neutral-100">
                {t(
                  "தமிழ்நாடு மற்றும் இந்தியா முழுவதும் விநியோகம்",
                  "Fast Delivery Across Tamil Nadu & India",
                )}
              </p>
              <p className="mt-2 text-[14px] text-gray-600 dark:text-neutral-400 leading-relaxed">
                {t(
                  "உங்கள் ஆர்டர்களை உடனுக்குடன் டிராக் செய்யும் வசதி மற்றும் பாதுகாப்பான புத்தக பேக்கேஜிங்.",
                  "Protective book packaging with real-time shipment tracking from dispatch to doorstep.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-[28px] sm:text-[36px] font-extrabold tracking-tight text-gray-900 dark:text-neutral-100">
          {t(
            "புதிய நூல் வெளியீடுகளை உடனுக்குடன் அறிய",
            "Stay Updated on New Book Releases",
          )}
        </h2>
        <p className="mt-3 text-[15px] text-gray-500 dark:text-neutral-400">
          {t(
            "முத்தமிழறிஞர் பதிப்பகத்தின் புதிய பதிப்புகள் மற்றும் புத்தகக் கண்காட்சித் தள்ளுபடி அறிவிப்புகளைப் பெற பதிவு செய்யுங்கள்.",
            "Subscribe for updates on new publications, reprints, and book fair discounts from Muthamilarignar Pathipagam.",
          )}
        </p>
        <div className="mt-8">
          <NewsletterForm storeId={store?.id} themeColor="#dc2626" />
        </div>
      </section>
    </div>
  );
}
