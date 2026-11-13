import type { Metadata } from "next";
import BooksCatalogClient from "@/components/product/books-catalog-client";
import {
  fetchBooksSafe,
  getBooksWithFallback,
  getCategoriesWithFallback,
} from "@/lib/catalog-fallback";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";
import { absoluteUrl, buildListingJsonLd, PUBLISHER_ENTITY } from "@/lib/seo-schema";

export const revalidate = 60;

export function generateStaticParams() {
  return [{ tenant: DEFAULT_TENANT }];
}

export async function generateMetadata({
  params,
}: {
  params: { tenant: string };
}): Promise<Metadata> {
  const books = await getBooksWithFallback(params.tenant);
  const title = `அனைத்து நூல்கள் | All Books — ${BRAND.nameTa} | ${BRAND.nameEn}`;
  const description = `முத்தமிழறிஞர் பதிப்பகத்தின் ${books.length} அதிகாரப்பூர்வ வெளியீடுகள் — திராவிட இயக்க வரலாறு, சமூகநீதி, திராவிட மாடல் மற்றும் கலைஞர் படைப்புகள். Browse all ${books.length} official Tamil & English books from ${BRAND.nameEn}.`;
  const url = `${SITE_URL}/${params.tenant}/books`;
  const leadCover =
    absoluteUrl((books[0] as any)?.image_url || (books[0] as any)?.images?.[0]) ||
    `${SITE_URL}/logo.jpg`;

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
      images: [{ url: leadCover, alt: `${BRAND.nameTa} | ${BRAND.nameEn}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [leadCover],
    },
  };
}

export default async function BooksCatalogPage({
  params,
}: {
  params: { tenant: string };
}) {
  const [booksRes, categories] = await Promise.all([
    fetchBooksSafe(params.tenant),
    getCategoriesWithFallback(params.tenant),
  ]);

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
  const cats = (categories as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  const pageUrl = `${SITE_URL}/${params.tenant}/books`;
  const jsonLd = buildListingJsonLd({
    tenant: params.tenant,
    url: pageUrl,
    listName: `அனைத்து நூல்கள் | All Books — ${PUBLISHER_ENTITY.nameEn}`,
    books: slim,
    breadcrumbs: [
      { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: `${SITE_URL}/${params.tenant}` },
      { name: "அனைத்து நூல்கள் | All Books", url: pageUrl },
    ],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {booksRes.isFallback && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-4 py-2 text-center text-xs font-medium">
          சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும் — Store is temporarily unavailable, try again.
        </div>
      )}
      <BooksCatalogClient tenant={params.tenant} products={slim} categories={cats} />
    </>
  );
}
