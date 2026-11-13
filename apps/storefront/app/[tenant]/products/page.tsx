import type { Metadata } from "next";
import BooksCatalogClient from "@/components/product/books-catalog-client";
import { fetchBooksSafe, getBooksWithFallback, getCategoriesWithFallback } from "@/lib/catalog-fallback";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";
import { buildListingJsonLd, PUBLISHER_ENTITY } from "@/lib/seo-schema";

// ISR: the category filter is applied client-side from ?category=, so this page stays static.
export const revalidate = 60;

export function generateStaticParams() {
  return [{ tenant: DEFAULT_TENANT }];
}

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const books = await getBooksWithFallback(params.tenant);
  const title = `நூல்கள் | Books — ${BRAND.nameTa} | ${BRAND.nameEn}`;
  const description = `Browse all ${books.length} books published by ${BRAND.nameEn} (${BRAND.nameTa}) — Dravidian movement history, social justice and Kalaignar literature.`;
  const canonicalUrl = `${SITE_URL}/${params.tenant}/books`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: canonicalUrl, type: "website", images: [{ url: `${SITE_URL}/logo.jpg`, alt: BRAND.nameEn }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/logo.jpg`] },
  };
}

export default async function ProductsPage({ params }: { params: { tenant: string } }) {
  const [booksRes, categories] = await Promise.all([
    fetchBooksSafe(params.tenant),
    getCategoriesWithFallback(params.tenant),
  ]);

  // Send the client only what filtering, search and the cards need.
  const slim = (booksRes.books as any[]).map((p) => ({
    id: p.id,
    slug: p.slug ?? null,
    name: p.name,
    sku: p.sku,
    category_id: p.category_id,
    description: p.description,
    price_cents: p.price_cents,
    sale_price_cents: p.sale_price_cents ?? null,
    inventory: p.inventory_quantity ?? p.inventory,
    inventory_quantity: p.inventory_quantity ?? p.inventory,
    image_url: p.image_url || p.images?.[0] || null,
    is_fallback: Boolean(booksRes.isFallback || p.is_fallback),
  }));
  const cats = (categories as any[]).map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  const canonicalUrl = `${SITE_URL}/${params.tenant}/books`;
  const jsonLd = buildListingJsonLd({
    tenant: params.tenant,
    url: canonicalUrl,
    listName: `அனைத்து நூல்கள் | All Books — ${PUBLISHER_ENTITY.nameEn}`,
    books: slim,
    breadcrumbs: [
      { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: `${SITE_URL}/${params.tenant}` },
      { name: "அனைத்து நூல்கள் | All Books", url: canonicalUrl },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {booksRes.isFallback && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-4 py-2 text-center text-xs font-medium">
          சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும் — Store is temporarily unavailable, try again.
        </div>
      )}
      <BooksCatalogClient
        tenant={params.tenant}
        products={slim}
        categories={cats}
        apiUnavailable={booksRes.isFallback}
      />
    </>
  );
}