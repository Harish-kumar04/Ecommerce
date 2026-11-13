import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/components/i18n/t";
import ProductCard, { toCardProduct } from "@/components/product/product-card";
import { AUTHORS, buildPersonJsonLd } from "@/lib/aeo-data";
import { fetchBooksSafe } from "@/lib/catalog-fallback";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";
import { PUBLISHER_ENTITY } from "@/lib/seo-schema";

export const revalidate = 3600;

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ tenant: DEFAULT_TENANT, slug: a.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { tenant: string; slug: string };
}): Metadata {
  const author = AUTHORS.find((a) => a.slug === params.slug);
  if (!author) return { title: `Author — ${BRAND.nameEn}`, robots: { index: false } };
  const title = `${author.nameTa} | ${author.nameEn} — ${BRAND.nameTa}`;
  const description = author.bioEn.slice(0, 280);
  const url = `${SITE_URL}/${params.tenant}/authors/${author.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile" },
  };
}

export default async function AuthorDetailPage({
  params,
}: {
  params: { tenant: string; slug: string };
}) {
  const author = AUTHORS.find((a) => a.slug === params.slug);
  if (!author) notFound();

  const booksRes = await fetchBooksSafe(params.tenant);
  const allBooks = booksRes.books as any[];
  const matched = allBooks.filter((b) =>
    author.keywords.test(
      `${b.name || ""} ${b.description || ""} ${b.author || ""} ${b.dimensions_json?.book?.author || ""}`,
    ),
  );
  const displayBooks = matched.length > 0 ? matched : allBooks.slice(0, 8);
  const jsonLd = buildPersonJsonLd(params.tenant, author);

  return (
    <div className="container-site py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-black/70">
        <Link href={`/${params.tenant}`} prefetch={false} className="hover:text-brand-red-dark">
          <T ta="முகப்பு" en="Home" />
        </Link>
        <span aria-hidden="true" className="opacity-40">/</span>
        <Link href={`/${params.tenant}/authors`} prefetch={false} className="hover:text-brand-red-dark">
          <T ta="ஆசிரியர்கள்" en="Authors" />
        </Link>
        <span aria-hidden="true" className="opacity-40">/</span>
        <span className="font-semibold text-black">{author.nameEn}</span>
      </nav>

      <header className="rounded-3xl border border-black/10 bg-[#FAFAFA] p-6 sm:p-10">
        <p className="eyebrow">
          <T ta={author.honorificTa} en={author.honorificEn} />
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-black sm:text-[42px]">
          {author.nameTa}
        </h1>
        <p className="mt-1 text-[18px] font-semibold text-black/70">{author.nameEn}</p>
        <div aria-hidden="true" className="mt-4 h-1 w-16 rounded-full bg-brand-red" />

        <p className="mt-5 max-w-3xl text-[15.5px] leading-relaxed text-black/80">
          <T ta={author.bioTa} en={author.bioEn} />
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-black/10 pt-4 text-[13px] text-black/75">
          <span>
            <strong>Publisher:</strong> {PUBLISHER_ENTITY.nameTa} ({PUBLISHER_ENTITY.nameEn})
          </span>
          <span>
            <strong>Address:</strong> {PUBLISHER_ENTITY.addressLineEn}
          </span>
          <span>
            <strong>Contact:</strong> +91 {PUBLISHER_ENTITY.phoneDisplay} • {PUBLISHER_ENTITY.email}
          </span>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="mb-6 text-[24px] font-extrabold text-black">
          <T ta="வெளியிடப்பட்ட நூல்கள்" en="Available Editions in Our Catalog" />
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {displayBooks.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={toCardProduct({ ...p, is_fallback: booksRes.isFallback })}
              tenant={params.tenant}
              priority={idx === 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
