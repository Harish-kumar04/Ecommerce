import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroSlider, { type SlideView } from "@/components/home/hero-slider";
import { CategoryStrip, TrustBar } from "@/components/home/highlights";
import BookGridSection from "@/components/home/book-grid-section";
import { NewsletterSection, WhySection } from "@/components/home/why-newsletter";
import { toCardProduct } from "@/components/product/product-card";
import {
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

const FEATURED_COUNT = 4;
const COLLECTION_COUNT = 12;

async function fetchTenantData(tenant: string) {
  const [products, store, categories] = await Promise.all([
    getBooksWithFallback(tenant),
    getStoreWithFallback(tenant),
    getCategoriesWithFallback(tenant),
  ]);
  return { products: products as any[], store, categories: categories as any[] };
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
  const { products, store, categories } = await fetchTenantData(tenant);

  const cards = products.map(toCardProduct);
  const withCovers = cards.filter((c) => c.image_url);

  // Hero slides: admin-configured, or built-in brand slides decorated with real covers.
  const { slides, isDefault } = getSlides(store);
  const slideViews: SlideView[] = slides.map((s, i) => {
    const href = resolveLink(tenant, s.link);
    return {
      image_url: s.image_url || null,
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

  const prices = cards.map((c) => c.sale_price_cents || c.price_cents).filter((p) => p > 0);
  const featured = cards.slice(0, FEATURED_COUNT);
  const collection = cards.slice(FEATURED_COUNT, FEATURED_COUNT + COLLECTION_COUNT);
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
      <HeroSlider slides={slideViews} />
      {prices.length > 0 && (
        <TrustBar count={total} minCents={Math.min(...prices)} maxCents={Math.max(...prices)} />
      )}
      <CategoryStrip tenant={tenant} categories={categories} />
      <BookGridSection
        tenant={tenant}
        books={featured}
        eyebrow={{ ta: BRAND.nameTa, en: BRAND.nameEn }}
        title={{ ta: "முதன்மை வெளியீடுகள்", en: "Featured publications" }}
      />
      <BookGridSection
        id="complete-collection"
        tenant={tenant}
        books={collection}
        columns="dense"
        divider
        eyebrow={{ ta: "முழு நூல் பட்டியல்", en: "Complete Collection" }}
        title={{ ta: "திராவிட இயக்க & கலைஞர் நூல்கள்", en: "Dravidian movement & Kalaignar titles" }}
        cta={{
          href: `/${tenant}/products`,
          ta: `அனைத்து ${total} நூல்களையும் காண்க`,
          en: `Show all ${total} books`,
        }}
      />
      <WhySection />
      <NewsletterSection storeId={store?.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}