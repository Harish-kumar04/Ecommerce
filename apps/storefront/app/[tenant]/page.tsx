import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrandHero from "@/components/home/brand-hero";
import HeroSlider, { type SlideView } from "@/components/home/hero-slider";
import { TrustBar } from "@/components/home/highlights";
import CategoryTiles from "@/components/home/category-tiles";
import TabbedBooks from "@/components/home/tabbed-books";
import PublisherStory from "@/components/home/publisher-story";
import Testimonials from "@/components/home/testimonials";
import { NewsletterSection } from "@/components/home/why-newsletter";
import {
  DiagonalStripeDivider,
  SectionHeading,
  SunburstBackdrop,
} from "@/components/brand/patterns";
import ProductCard, { toCardProduct, type CardProduct } from "@/components/product/product-card";
import {
  fetchBooksSafe,
  getCategoriesWithFallback,
  getStoreWithFallback,
} from "@/lib/catalog-fallback";
import { splitBilingual } from "@/lib/i18n";
import {
  BRAND,
  DEFAULT_TENANT,
  SITE_URL,
  getSlides,
  isExternal,
  resolveLink,
} from "@/lib/site-defaults";
import { buildHomeJsonLd } from "@/lib/seo-schema";

// ISR: static HTML, refreshed in the background every 60 seconds.
export const revalidate = 60;

export function generateStaticParams() {
  return [{ tenant: DEFAULT_TENANT }];
}

const fetchTenantData = cache(async (tenant: string) => {
  const [booksRes, store, categories] = await Promise.all([
    fetchBooksSafe(tenant),
    getStoreWithFallback(tenant),
    getCategoriesWithFallback(tenant),
  ]);
  return {
    products: booksRes.books as any[],
    isFallback: booksRes.isFallback,
    store,
    categories: categories as any[],
  };
});

export async function generateMetadata({
  params,
}: {
  params: { tenant: string };
}): Promise<Metadata> {
  const store = await getStoreWithFallback(params.tenant);
  const title = `${BRAND.nameTa} | ${BRAND.nameEn} — Official Tamil & English Bookstore`;
  const description =
    store?.description ||
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam with Pan-India COD & online delivery.";
  const url = `${SITE_URL}/${params.tenant}`;
  const ogImg = `${SITE_URL}/logo.jpg`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: `${BRAND.nameTa} | ${BRAND.nameEn}`,
      locale: "ta_IN",
      type: "website",
      images: [{ url: ogImg, width: 1024, height: 1021, alt: `${BRAND.nameTa} | ${BRAND.nameEn}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImg] },
  };
}

function renderTabGrid(tenant: string, list: CardProduct[]) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {list.map((book) => (
        <ProductCard
          key={book.id}
          product={book}
          tenant={tenant}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 45vw, 310px"
        />
      ))}
    </div>
  );
}

export default async function TenantHomePage({ params }: { params: { tenant: string } }) {
  const { tenant } = params;
  if (!tenant) notFound();
  const { products, isFallback, store, categories } = await fetchTenantData(tenant);

  const cards = products.map((p) =>
    toCardProduct(isFallback ? { ...p, is_fallback: true } : p),
  );
  const withCovers = cards.filter((c) => c.image_url);
  const total = cards.length;

  // Admin-configured 3-image Offer Slider (or built-in brand slides decorated with real covers)
  const { slides, isDefault } = getSlides(store);
  const slideViews: SlideView[] = slides.map((s, i) => {
    const href = resolveLink(tenant, s.link);
    return {
      image_url: s.image_url || null,
      mobile_image_url: s.mobile_image_url || null,
      title_ta: s.title_ta || "",
      title_en: s.title_en || "",
      subtitle_ta: s.subtitle_ta || "",
      subtitle_en: s.subtitle_en || "",
      button_ta: s.button_ta || "",
      button_en: s.button_en || "",
      href,
      external: href ? isExternal(href) : false,
      covers: isDefault
        ? withCovers.slice(i * 3, i * 3 + 3).map((c) => ({
            src: c.image_url as string,
            alt: splitBilingual(c.name, "|").join(" — "),
          }))
        : undefined,
    };
  });

  // Tabbed product groups from real catalog data
  const newArrivals = [...cards].reverse().slice(0, 8);
  const bestSellers = cards.slice(0, 8);
  const saleBooks = cards.filter(
    (c) => c.sale_price_cents && c.price_cents > 0 && c.sale_price_cents < c.price_cents,
  );
  const offers = (saleBooks.length > 0 ? saleBooks : cards).slice(0, 8);

  const kalaignarCatIds = new Set(
    categories
      .filter((cat: any) =>
        /kalaignar|karunanidhi|கலைஞர்/i.test(`${cat.name || ""} ${cat.slug || ""}`),
      )
      .map((cat: any) => String(cat.id)),
  );
  const kalaignarMatches = cards.filter(
    (c) =>
      (c.category_id && kalaignarCatIds.has(c.category_id)) ||
      /kalaignar|karunanidhi|கலைஞர்/i.test(`${c.name} ${c.author || ""}`),
  );
  const kalaignarWorks = (kalaignarMatches.length > 0 ? kalaignarMatches : cards).slice(0, 8);

  const jsonLd = buildHomeJsonLd(tenant);

  return (
    <>
      {/* Fallback Notice Banner when API is temporarily unreachable */}
      {Boolean(isFallback) && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-950">
          சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும் — Store is temporarily unavailable, try again.
        </div>
      )}

      {/* 1. Brand Landing Hero (Red Arch + Tilted Covers + Floating Real Badges + Real Stats Row) */}
      <BrandHero
        tenant={tenant}
        heroBooks={withCovers.length > 0 ? withCovers : cards}
        totalBooks={total}
        categoryCount={categories.length}
      />

      {/* 2. Trust Badges (COD, Razorpay Secure, Official Publisher, Pan-India Delivery) */}
      <TrustBar />

      {/* 3. Category Tiles with Custom Icons (#FAFAFA) */}
      <CategoryTiles tenant={tenant} categories={categories} />

      {/* 4. Tabbed Product Rows (New Arrivals | Best Sellers | Offers | Kalaignar Works) */}
      <TabbedBooks
        tenant={tenant}
        totalCount={total}
        backdrop={<SunburstBackdrop position="top-right" />}
        heading={
          <SectionHeading
            eyebrow={{ ta: "முத்தமிழறிஞர் பதிப்பகம்", en: "Curated Shelf" }}
            title={{ ta: "தேர்ந்தெடுக்கப்பட்ட வெளியீடுகள்", en: "Featured & Essential Titles" }}
          />
        }
        panels={{
          new: renderTabGrid(tenant, newArrivals),
          bestsellers: renderTabGrid(tenant, bestSellers),
          offers: renderTabGrid(tenant, offers),
          kalaignar: renderTabGrid(tenant, kalaignarWorks),
        }}
      />

      <DiagonalStripeDivider />

      {/* 5. Admin-Controlled 3-Image Offer Slider */}
      <HeroSlider slides={slideViews} />

      {/* 6. Author & Publisher Story (#FAFAFA) */}
      <PublisherStory tenant={tenant} totalBooks={total} />

      <DiagonalStripeDivider />

      {/* 7. Reader Testimonials (#FFFFFF) */}
      <Testimonials />

      {/* 8. Newsletter with Visible Inline Success (#FAFAFA) */}
      <NewsletterSection storeId={store?.id} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}