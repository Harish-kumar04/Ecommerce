import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import BookDetailView from "@/components/product/book-detail-view";
import { fetchBookById, getBooksWithFallback } from "@/lib/catalog-fallback";
import { splitBilingual } from "@/lib/i18n";
import { BRAND, DEFAULT_TENANT, LOGO_ALT, SITE_URL, getShareLogoUrl } from "@/lib/site-defaults";
import {
  absoluteUrl,
  bookCanonicalUrl,
  bookSlugOrId,
  buildBookJsonLd,
} from "@/lib/seo-schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const revalidate = 120;

export async function generateStaticParams() {
  const books = (await getBooksWithFallback(DEFAULT_TENANT)) as any[];
  return books
    .filter((b) => b?.slug || b?.id)
    .map((b) => ({
      tenant: DEFAULT_TENANT,
      slug: String(b.slug || b.id),
    }));
}

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; slug: string };
}): Promise<Metadata> {
  const lookup = await fetchBookById(params.tenant, params.slug);
  if (lookup.status === "gone") {
    return {
      title: `நூல் பதிப்பில் இல்லை | Edition Unavailable — ${BRAND.nameEn}`,
      robots: { index: false, follow: true },
    };
  }
  if (lookup.status !== "ok") {
    return {
      title: `நூல் | Book — ${BRAND.nameEn}`,
      robots: { index: false, follow: true },
    };
  }

  const product = lookup.product;
  const [ta, en] = splitBilingual(product.name, "|");
  const [descTa, descEn] = splitBilingual(product.description, "||");
  const hasDistinctEn = Boolean(en && en !== ta);
  const title =
    product.meta_title ||
    `${ta}${hasDistinctEn ? ` | ${en}` : ""} — ${BRAND.nameTa} | ${BRAND.nameEn}`;
  const description = (
    product.meta_description ||
    (descTa && descEn && descTa !== descEn
      ? `${descTa.slice(0, 140)} — ${descEn.slice(0, 140)}`
      : descTa || descEn) ||
    `Buy ${hasDistinctEn ? `${ta} (${en})` : ta} published by ${BRAND.nameEn} (${BRAND.nameTa}).`
  ).slice(0, 300);

  const canonical = bookCanonicalUrl(params.tenant, product);
  const coverUrl = absoluteUrl(product.image_url || product.images?.[0]);
  const image = coverUrl || getShareLogoUrl();
  const alt = coverUrl ? (hasDistinctEn ? `${ta} — ${en}` : ta) : LOGO_ALT;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: `${BRAND.nameTa} | ${BRAND.nameEn}`,
      locale: "ta_IN",
      type: "book",
      images: [{ url: image, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt }],
    },
  };
}

export default async function BookSlugDetailPage({
  params,
}: {
  params: { tenant: string; slug: string };
}) {
  const [lookup, allBooks] = await Promise.all([
    fetchBookById(params.tenant, params.slug),
    getBooksWithFallback(params.tenant),
  ]);

  if (lookup.status === "not_found") {
    notFound();
  }

  // HTTP 410 Gone handling for discontinued / archived books
  if (lookup.status === "gone") {
    return (
      <div className="container-site py-20 text-center">
        <div className="mx-auto max-w-lg rounded-2xl border border-black/15 bg-[#FAFAFA] p-8 shadow-card">
          <p className="eyebrow">410 • பதிப்பில் இல்லை / Edition Discontinued</p>
          <h1 className="mt-2 text-[26px] font-extrabold text-black">
            இந்த நூல் தற்போது பதிப்பில் இல்லை
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-black/70">
            This edition has been archived and is no longer available for purchase. Explore our active Muthamilarignar Pathipagam catalog below.
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
          <h1 className="text-[22px] font-extrabold text-black">
            Store is temporarily unavailable, try again
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-black/65">
            சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும்.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`/${params.tenant}/books/${encodeURIComponent(params.slug)}`}
              className="btn-red h-11 px-6 text-[13.5px]"
            >
              மீண்டும் முயற்சி / Try Again
            </a>
            <Link
              href={`/${params.tenant}/books`}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/20 px-5 text-[13.5px] font-semibold text-black hover:border-brand-red-dark hover:text-brand-red-dark"
            >
              அனைத்து நூல்கள் / All Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const product = lookup.product;
  const canonicalSlug = bookSlugOrId(product);

  // Deduplicate: redirect raw UUID visits on /books/<uuid> to clean /books/<slug>
  if (UUID_RE.test(params.slug) && product.slug && params.slug !== canonicalSlug) {
    permanentRedirect(`/${params.tenant}/books/${encodeURIComponent(canonicalSlug)}`);
  }

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookDetailView
        tenant={params.tenant}
        product={product}
        relatedBooks={relatedBooks}
      />
    </>
  );
}
