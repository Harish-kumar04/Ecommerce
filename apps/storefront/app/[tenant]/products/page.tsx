import type { Metadata } from "next";
import BooksCatalogClient from "@/components/product/books-catalog-client";
import { fetchBooksSafe, getBooksWithFallback, getCategoriesWithFallback } from "@/lib/catalog-fallback";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";

// ISR: the category filter is applied client-side from ?category=, so this page stays static.
export const revalidate = 60;

export function generateStaticParams() {
  return [{ tenant: DEFAULT_TENANT }];
}

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const books = await getBooksWithFallback(params.tenant);
  const title = `நூல்கள் | Books — ${BRAND.nameTa} | ${BRAND.nameEn}`;
  const description = `Browse all ${books.length} books published by ${BRAND.nameEn} (${BRAND.nameTa}) — Dravidian movement history, social justice and Kalaignar literature.`;
  const url = `${SITE_URL}/${params.tenant}/products`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: [{ url: "/logo.jpg", alt: BRAND.nameEn }] },
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

  return (
    <>
      {booksRes.isFallback && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-4 py-2 text-center text-xs font-medium">
          சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும் — Store is temporarily unavailable, try again.
        </div>
      )}
      <BooksCatalogClient tenant={params.tenant} products={slim} categories={cats} />
    </>
  );
}