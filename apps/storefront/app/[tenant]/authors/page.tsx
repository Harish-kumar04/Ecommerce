import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/i18n/t";
import { AUTHORS } from "@/lib/aeo-data";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";
import { PUBLISHER_ENTITY, buildBreadcrumbNode } from "@/lib/seo-schema";

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ tenant: DEFAULT_TENANT }];
}

export function generateMetadata({ params }: { params: { tenant: string } }): Metadata {
  const title = `ஆசிரியர்கள் | Authors — ${BRAND.nameTa} | ${BRAND.nameEn}`;
  const description =
    "Explore authors published by Muthamilarignar Pathipagam, including Muthamilarignar Dr. Kalaignar M. Karunanidhi, M. K. Stalin, and Dravidian movement scholars.";
  const url = `${SITE_URL}/${params.tenant}/authors`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default function AuthorsIndexPage({ params }: { params: { tenant: string } }) {
  const url = `${SITE_URL}/${params.tenant}/authors`;
  const jsonLd = {
    "@context": "https://schema.org",
    ...buildBreadcrumbNode(
      [
        { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: `${SITE_URL}/${params.tenant}` },
        { name: "ஆசிரியர்கள் | Authors", url },
      ],
      `${url}#breadcrumb`,
    ),
  };

  return (
    <div className="container-site max-w-5xl py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-[13px] text-black/70">
        <Link href={`/${params.tenant}`} prefetch={false} className="hover:text-brand-red-dark">
          <T ta="முகப்பு" en="Home" />
        </Link>
        <span aria-hidden="true" className="opacity-40">/</span>
        <span className="font-semibold text-black">
          <T ta="ஆசிரியர்கள்" en="Authors" />
        </span>
      </nav>

      <p className="eyebrow">
        <T ta="படைப்பாளிகள் & அறிஞர்கள்" en="Published Authors" />
      </p>
      <h1 className="mt-2 text-[32px] font-extrabold tracking-tight text-black sm:text-[44px]">
        <T ta="முத்தமிழறிஞர் பதிப்பக ஆசிரியர்கள்" en="Authors & Contributors" />
      </h1>
      <div aria-hidden="true" className="mt-3 h-1 w-16 rounded-full bg-brand-red" />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {AUTHORS.map((author) => (
          <article key={author.slug} className="card-glow flex flex-col justify-between p-6">
            <div>
              <h2 className="text-[19px] font-extrabold text-black">
                <T ta={author.nameTa} en={author.nameEn} />
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-brand-red-dark">
                <T ta={author.honorificTa} en={author.honorificEn} />
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-black/75">
                <T ta={author.bioTa} en={author.bioEn} />
              </p>
            </div>
            <div className="mt-6">
              <Link
                href={`/${params.tenant}/authors/${author.slug}`}
                prefetch={false}
                className="btn-red h-11 px-5 text-[13.5px]"
              >
                <T ta="படைப்புகளைக் காண்க" en="View profile & books" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
