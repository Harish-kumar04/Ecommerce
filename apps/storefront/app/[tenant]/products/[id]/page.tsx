import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookDetailClient from "@/components/product/book-detail-client";
import { getBookByIdWithFallback, getBooksWithFallback } from "@/lib/catalog-fallback";
import { splitBilingual } from "@/lib/i18n";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";

// ISR: book pages are pre-rendered for the default tenant and refreshed every minute;
// other ids render on first request and are then cached.
export const revalidate = 60;

export async function generateStaticParams() {
  const books = (await getBooksWithFallback(DEFAULT_TENANT)) as any[];
  return books.filter((b) => b?.id).map((b) => ({ tenant: DEFAULT_TENANT, id: String(b.id) }));
}

const absolute = (src?: string | null) => (!src ? undefined : src.startsWith("http") ? src : `${SITE_URL}${src}`);

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; id: string };
}): Promise<Metadata> {
  const product = await getBookByIdWithFallback(params.tenant, params.id);
  if (!product) return { title: `Book | ${BRAND.nameEn}` };
  const [ta, en] = splitBilingual(product.name, "|");
  const [descTa, descEn] = splitBilingual(product.description, "||");
  const title = product.meta_title || `${ta}${en && en !== ta ? ` | ${en}` : ""} — ${BRAND.nameTa}`;
  const description = (product.meta_description || descTa || descEn || `Buy ${en} from ${BRAND.nameEn}`).slice(0, 300);
  const url = `${SITE_URL}/${params.tenant}/products/${product.id}`;
  const image = absolute(product.images?.[0] || product.image_url) || `${SITE_URL}/logo.jpg`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "book",
      images: [{ url: image, alt: `${ta} — ${en}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProductDetailPage({ params }: { params: { tenant: string; id: string } }) {
  const product = await getBookByIdWithFallback(params.tenant, params.id);
  if (!product) notFound();

  const price = product.sale_price_cents || product.price_cents;
  const [nameTa, nameEn] = splitBilingual(product.name, "|");
  const [descTa, descEn] = splitBilingual(product.description, "||");
  const url = `${SITE_URL}/${params.tenant}/products/${product.id}`;
  const image = absolute(product.images?.[0] || product.image_url);
  const inStock = (product.inventory_quantity ?? product.inventory ?? 1) > 0;

  // Note: the old per-render analytics ping (POST /public/track) was removed; it made
  // every product view a server request and blocked ISR. Views can be tracked client-side.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": url,
    url,
    name: nameTa,
    alternateName: nameEn !== nameTa ? nameEn : undefined,
    description: descTa || descEn || undefined,
    image: image ? [image] : undefined,
    sku: product.sku,
    inLanguage: "ta",
    bookFormat: "https://schema.org/Paperback",
    publisher: { "@type": "Organization", name: `${BRAND.nameTa} | ${BRAND.nameEn}`, url: SITE_URL },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: (price / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: BRAND.nameEn },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BookDetailClient tenant={params.tenant} product={product} />
    </>
  );
}