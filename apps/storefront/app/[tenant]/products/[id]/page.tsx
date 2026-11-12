import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookDetailClient from "@/components/product/book-detail-client";
import { fetchBookById, getBooksWithFallback } from "@/lib/catalog-fallback";
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
  const lookup = await fetchBookById(params.tenant, params.id);
  if (lookup.status !== "ok") return { title: `Book | ${BRAND.nameEn}` };
  const product = lookup.product;
  const [ta, en] = splitBilingual(product.name, "|");
  const [descTa, descEn] = splitBilingual(product.description, "||");
  const title = product.meta_title || `${ta}${en && en !== ta ? ` | ${en}` : ""} — ${BRAND.nameTa}`;
  const description = (product.meta_description || descTa || descEn || `Buy ${en} from ${BRAND.nameEn}`).slice(0, 300);
  const url = `${SITE_URL}/${params.tenant}/products/${product.id}`;
  const image = absolute(product.image_url || product.images?.[0]) || `${SITE_URL}/logo.jpg`;
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
  const lookup = await fetchBookById(params.tenant, params.id);

  // Only call notFound() when the API explicitly answered 404
  if (lookup.status === "not_found") {
    notFound();
  }

  // Timeout or 5xx after retry -> friendly "try again" state (not 404)
  if (lookup.status !== "ok") {
    return (
      <div className="container-site py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </div>
          <h1 className="text-[22px] font-extrabold text-[#111]">
            நூல் விவரம் ஏற்றப்படுகிறது
          </h1>
          <p className="mt-1 text-[15px] font-semibold text-brand-red">
            Please Try Again in a Moment
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-black/60">
            சேவையகம் தற்காலிகமாகப் பதிலளிக்கத் தாமதமாகிறது. சில நொடிகளில் மீண்டும் முயற்சிக்கவும்.
            <br />
            The catalog server took too long to respond{lookup.httpStatus ? ` (HTTP ${lookup.httpStatus})` : ""}. Please retry.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`/${params.tenant}/products/${encodeURIComponent(params.id)}`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand-red px-6 text-[13.5px] font-bold text-white hover:bg-brand-red-dark transition-colors shadow-sm"
            >
              மீண்டும் முயற்சி / Try Again
            </a>
            <Link
              href={`/${params.tenant}/products`}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 px-5 text-[13.5px] font-semibold text-black hover:border-brand-red hover:text-brand-red transition-colors"
            >
              அனைத்து நூல்கள் / All Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const product = lookup.product;
  const price = product.sale_price_cents || product.price_cents;
  const [nameTa, nameEn] = splitBilingual(product.name, "|");
  const [descTa, descEn] = splitBilingual(product.description, "||");
  const url = `${SITE_URL}/${params.tenant}/products/${product.id}`;
  const image = absolute(product.image_url || product.images?.[0]);
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

  const allBooks = (await getBooksWithFallback(params.tenant)) as any[];
  const relatedBooks = allBooks
    .filter(
      (b) =>
        b.id !== product.id &&
        (b.category_id === product.category_id || b.category === product.category)
    )
    .slice(0, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BookDetailClient
        tenant={params.tenant}
        product={product}
        relatedBooks={relatedBooks}
      />
    </>
  );
}