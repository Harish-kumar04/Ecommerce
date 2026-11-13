import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookDetailView from "@/components/product/book-detail-view";
import { fetchBookById, getBooksWithFallback } from "@/lib/catalog-fallback";
import { splitBilingual } from "@/lib/i18n";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";
import { absoluteUrl, bookCanonicalUrl, buildBookJsonLd } from "@/lib/seo-schema";

// ISR: book detail pages cached for 120 s and revalidated via /api/revalidate tags.
export const revalidate = 120;

export async function generateStaticParams() {
  const books = (await getBooksWithFallback(DEFAULT_TENANT)) as any[];
  return books.filter((b) => b?.id).map((b) => ({ tenant: DEFAULT_TENANT, id: String(b.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; id: string };
}): Promise<Metadata> {
  const lookup = await fetchBookById(params.tenant, params.id);
  if (lookup.status !== "ok") {
    return { title: `Book | ${BRAND.nameEn}`, robots: { index: false, follow: true } };
  }
  const product = lookup.product;
  const [ta, en] = splitBilingual(product.name, "|");
  const [descTa, descEn] = splitBilingual(product.description, "||");
  const title = product.meta_title || `${ta}${en && en !== ta ? ` | ${en}` : ""} — ${BRAND.nameTa}`;
  const description = (product.meta_description || descTa || descEn || `Buy ${en} from ${BRAND.nameEn}`).slice(0, 300);
  const canonical = bookCanonicalUrl(params.tenant, product);
  const image = absoluteUrl(product.image_url || product.images?.[0]) || `${SITE_URL}/logo.jpg`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "book",
      images: [{ url: image, alt: `${ta} — ${en}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProductDetailPage({ params }: { params: { tenant: string; id: string } }) {
  const [lookup, allBooks] = await Promise.all([
    fetchBookById(params.tenant, params.id),
    getBooksWithFallback(params.tenant),
  ]);

  if (lookup.status === "not_found") {
    notFound();
  }

  if (lookup.status === "gone") {
    return (
      <div className="container-site py-20 text-center">
        <div className="mx-auto max-w-lg rounded-2xl border border-black/15 bg-[#FAFAFA] p-8 shadow-card">
          <p className="eyebrow">410 • பதிப்பில் இல்லை / Edition Discontinued</p>
          <h1 className="mt-2 text-[26px] font-extrabold text-black">இந்த நூல் தற்போது பதிப்பில் இல்லை</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-black/70">
            This edition has been archived and is no longer available for purchase.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href={`/${params.tenant}/books`} className="btn-red h-12 px-7 text-[14.5px]">
              அனைத்து நூல்களையும் காண்க / Browse Active Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (lookup.status !== "ok") {
    return (
      <div className="container-site py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-white p-8 shadow-sm">
          <h1 className="text-[22px] font-extrabold text-[#111]">நூல் விவரம் ஏற்றப்படுகிறது</h1>
          <p className="mt-1 text-[15px] font-semibold text-brand-red-dark">Please Try Again in a Moment</p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-black/60">
            சேவையகம் தற்காலிகமாகப் பதிலளிக்கத் தாமதமாகிறது. சில நொடிகளில் மீண்டும் முயற்சிக்கவும்.
            <br />
            The catalog server took too long to respond{lookup.httpStatus ? ` (HTTP ${lookup.httpStatus})` : ""}. Please retry.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`/${params.tenant}/products/${encodeURIComponent(params.id)}`}
              className="btn-red h-11 px-6 text-[13.5px]"
            >
              மீண்டும் முயற்சி / Try Again
            </a>
            <Link
              href={`/${params.tenant}/books`}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 px-5 text-[13.5px] font-semibold text-black hover:border-brand-red-dark hover:text-brand-red-dark transition-colors"
            >
              அனைத்து நூல்கள் / All Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const product = lookup.product;
  const jsonLd = buildBookJsonLd({ tenant: params.tenant, product });

  const relatedBooks = (allBooks as any[])
    .filter(
      (b) =>
        b.id !== product.id &&
        (b.category_id === product.category_id || b.category === product.category),
    )
    .slice(0, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BookDetailView
        tenant={params.tenant}
        product={product}
        relatedBooks={relatedBooks}
      />
    </>
  );
}