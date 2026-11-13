import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard, { toCardProduct } from "@/components/product/product-card";
import { BiName, BiSubName, T } from "@/components/i18n/t";
import { splitBilingual } from "@/lib/i18n";
import {
  fetchBooksSafe,
  getCategoriesWithFallback,
  getStoreWithFallback,
} from "@/lib/catalog-fallback";
import { BRAND, DEFAULT_TENANT, LOGO_ALT, SITE_URL, getShareLogoUrl } from "@/lib/site-defaults";
import { absoluteUrl, buildListingJsonLd, PUBLISHER_ENTITY } from "@/lib/seo-schema";

export const revalidate = 60;

export async function generateStaticParams() {
  const categories = (await getCategoriesWithFallback(DEFAULT_TENANT)) as any[];
  return categories
    .filter((c) => c?.slug)
    .map((c) => ({ tenant: DEFAULT_TENANT, slug: String(c.slug) }));
}

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; slug: string };
}): Promise<Metadata> {
  const [categories, store] = await Promise.all([
    getCategoriesWithFallback(params.tenant) as Promise<any[]>,
    getStoreWithFallback(params.tenant),
  ]);
  const cat = categories.find(
    (c) => String(c.slug || "").toLowerCase() === params.slug.toLowerCase(),
  );
  if (!cat) {
    return { title: `நூல் வகை | Category — ${BRAND.nameEn}`, robots: { index: false } };
  }
  const [ta, en] = splitBilingual(cat.name, "|");
  const title = `${ta}${en && en !== ta ? ` | ${en}` : ""} — ${BRAND.nameTa} | ${BRAND.nameEn}`;
  const description =
    cat.description ||
    `Explore ${en || ta} publications from ${BRAND.nameEn} (${BRAND.nameTa}).`;
  const url = `${SITE_URL}/${params.tenant}/categories/${cat.slug}`;
  const shareLogo = getShareLogoUrl(store);
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
      images: [{ url: shareLogo, alt: LOGO_ALT }],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: shareLogo, alt: LOGO_ALT }] },
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: { tenant: string; slug: string };
}) {
  const [booksRes, categories] = await Promise.all([
    fetchBooksSafe(params.tenant),
    getCategoriesWithFallback(params.tenant),
  ]);
  const cat = (categories as any[]).find(
    (c) => String(c.slug || "").toLowerCase() === params.slug.toLowerCase(),
  );
  if (!cat) notFound();

  const catBooks = (booksRes.books as any[]).filter(
    (b) => String(b.category_id || "") === String(cat.id),
  );
  const [ta, en] = splitBilingual(cat.name, "|");
  const hasDistinctSub = Boolean(en && en !== ta);
  const pageUrl = `${SITE_URL}/${params.tenant}/categories/${cat.slug}`;

  const jsonLd = buildListingJsonLd({
    tenant: params.tenant,
    url: pageUrl,
    listName: `${ta}${hasDistinctSub ? ` | ${en}` : ""}`,
    books: catBooks,
    breadcrumbs: [
      { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: `${SITE_URL}/${params.tenant}` },
      { name: "நூல்கள் | Books", url: `${SITE_URL}/${params.tenant}/books` },
      { name: hasDistinctSub ? `${ta} | ${en}` : ta, url: pageUrl },
    ],
  });

  return (
    <div className="container-site py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-black/70"
      >
        <Link href={`/${params.tenant}`} prefetch={false} className="hover:text-brand-red-dark">
          <T ta="முகப்பு" en="Home" />
        </Link>
        <span aria-hidden="true" className="opacity-40">/</span>
        <Link href={`/${params.tenant}/books`} prefetch={false} className="hover:text-brand-red-dark">
          <T ta="நூல்கள்" en="Books" />
        </Link>
        <span aria-hidden="true" className="opacity-40">/</span>
        <span className="font-semibold text-black">
          <BiName value={cat.name} />
        </span>
      </nav>

      <header className="mb-10">
        <p className="eyebrow">
          <T ta="நூல் வகை" en="Book Category" />
        </p>
        <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-black sm:text-[44px]">
          <BiName value={cat.name} />
        </h1>
        {hasDistinctSub && (
          <p className="mt-1 text-[17px] font-medium text-black/65">
            <BiSubName value={cat.name} />
          </p>
        )}
        <div aria-hidden="true" className="mt-3 h-1 w-14 rounded-full bg-brand-red" />
        {cat.description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/70">
            {cat.description}
          </p>
        )}
      </header>

      <h2 className="sr-only">
        <T ta={`${catBooks.length} நூல்கள்`} en={`${catBooks.length} books in this category`} />
      </h2>

      {booksRes.isFallback ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-16 text-center">
          <p className="text-[16px] font-bold text-black">
            <T ta="சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும்" en="Store is temporarily unavailable, try again" />
          </p>
        </div>
      ) : catBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-[#FAFAFA] px-6 py-16 text-center">
          <p className="text-[15px] text-black/70">
            <T
              ta="இந்தப் பிரிவில் நூல்கள் விரைவில் சேர்க்கப்படும்."
              en="Books in this category will be added shortly."
            />
          </p>
          <Link href={`/${params.tenant}/books`} className="btn-red mt-5 h-11 px-6 text-[14px]">
            <T ta="அனைத்து நூல்களையும் காண்க" en="Browse all books" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {catBooks.map((p) => (
            <ProductCard
              key={p.id}
              product={toCardProduct({ ...p, is_fallback: booksRes.isFallback })}
              tenant={params.tenant}
            />
          ))}
        </div>
      )}
    </div>
  );
}
