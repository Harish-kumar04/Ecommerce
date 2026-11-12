import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroSlider, { type SlideView } from "@/components/home/hero-slider";
import { CategoryStrip, TrustBar } from "@/components/home/highlights";
import BookGridSection from "@/components/home/book-grid-section";
import OffersBand from "@/components/home/offers-band";
import { NewsletterSection } from "@/components/home/why-newsletter";
import { toCardProduct } from "@/components/product/product-card";
import {
  fetchBooksSafe,
  getBooksWithFallback,
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

// ISR: static HTML, refreshed in the background at most once a minute.
export const revalidate = 60;

export function generateStaticParams() {
  return [{ tenant: DEFAULT_TENANT }];
}

async function fetchTenantData(tenant: string) {
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
}

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const { store } = await fetchTenantData(params.tenant);
  const title = `${BRAND.nameTa} | ${BRAND.nameEn} — Official Bookstore`;
  const description =
    store?.description ||
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam";
  const url = `${SITE_URL}/${params.tenant}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: "/logo.jpg", width: 1024, height: 1021, alt: BRAND.nameEn }],
    },
    twitter: { card: "summary", title, description, images: ["/logo.jpg"] },
  };
}

export default async function TenantHomePage({ params }: { params: { tenant: string } }) {
  const { tenant } = params;
  if (!tenant) notFound();
  const { products, isFallback, store, categories } = await fetchTenantData(tenant);

  const cards = products.map((p) =>
    toCardProduct(isFallback ? { ...p, is_fallback: true } : p),
  );
  const withCovers = cards.filter((c) => c.image_url);

  // Hero slides: admin-configured, or built-in brand slides decorated with real covers.
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

  // Section division
  const featured = cards.slice(0, 8); // 8 featured books
  const saleBooks = cards.filter((c) => c.sale_price_cents && c.sale_price_cents < c.price_cents);
  const offersList = saleBooks.length > 0 ? saleBooks.slice(0, 4) : cards.slice(0, 4);
  const newArrivals = cards.slice(8, 12);
  const collection = cards.slice(0, 12); // 12 books for complete collection preview
  const total = cards.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BookStore",
    name: `${BRAND.nameEn} | ${BRAND.nameTa}`,
    url: `${SITE_URL}/${tenant}`,
    logo: `${SITE_URL}/logo.jpg`,
    image: `${SITE_URL}/logo.jpg`,
  };

  return (
    <>
      {/* Fallback Notice Banner */}
      {Boolean(isFallback) && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-4 py-2 text-center text-xs font-medium">
          சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும் — Store is temporarily unavailable, try again.
        </div>
      )}

      {/* 1. Offer Slider (reads theme_config.home_slides) */}
      <HeroSlider slides={slideViews} />

      {/* 2. Trust Strip (real features: COD, Secure payment) */}
      <TrustBar />

      {/* 3. Category Chips (horizontal scroll) */}
      <CategoryStrip tenant={tenant} categories={categories} />

      {/* 4. Featured (8 Books) */}
      <BookGridSection
        tenant={tenant}
        books={featured}
        eyebrow={{ ta: BRAND.nameTa, en: BRAND.nameEn }}
        title={{ ta: "முதன்மை வெளியீடுகள்", en: "Featured Publications" }}
      />

      {/* 5. Black Offers Band (books on sale) */}
      <OffersBand tenant={tenant} books={offersList} />

      {/* 6. New Arrivals */}
      {newArrivals.length > 0 && (
        <BookGridSection
          tenant={tenant}
          books={newArrivals}
          eyebrow={{ ta: "புதிய வெளியீடுகள்", en: "Fresh Off the Press" }}
          title={{ ta: "புதிய வரவுகள்", en: "New Arrivals" }}
        />
      )}

      {/* 7. Complete Collection (12 + Show all, #complete-collection anchor) */}
      <BookGridSection
        id="complete-collection"
        tenant={tenant}
        books={collection}
        columns="dense"
        divider
        eyebrow={{ ta: "முழு நூல் பட்டியல்", en: "Complete Collection" }}
        title={{ ta: "திராவிட இயக்க & கலைஞர் நூல்கள்", en: "Dravidian Movement & Kalaignar Titles" }}
        cta={{
          href: `/${tenant}/products`,
          ta: `அனைத்து ${total} நூல்களையும் காண்க`,
          en: `Show all ${total} books`,
        }}
      />

      {/* 8. Newsletter */}
      <NewsletterSection storeId={store?.id} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}