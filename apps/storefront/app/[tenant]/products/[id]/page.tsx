import type { Metadata } from "next";
import Link from "next/link";
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
  if (!product) {
    return (
      <div className="container-site py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-brand-red">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
          <h1 className="text-[22px] font-extrabold text-[#111]">
            நூல் கிடைக்கவில்லை
          </h1>
          <p className="mt-1 text-[15px] font-semibold text-brand-red">
            Book Not Found
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-black/60">
            மன்னிக்கவும், நீங்கள் தேடும் நூல் தற்போது கிடைக்கவில்லை அல்லது நீக்கப்பட்டிருக்கலாம்.
            <br />
            The book you are looking for is currently unavailable or may have been moved.
          </p>
          <div className="mt-6">
            <Link
              href={`/${params.tenant}/products`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand-red px-6 text-[13.5px] font-bold text-white hover:bg-brand-red-dark transition-colors shadow-sm"
            >
              நூல்களைப் பார்வையிடுக / Browse All Books &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

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