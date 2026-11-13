import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/components/i18n/t";
import {
  POLICIES,
  POLICY_LAST_UPDATED_EN,
  POLICY_LAST_UPDATED_ISO,
  POLICY_LAST_UPDATED_TA,
  type PolicyDoc,
} from "@/lib/aeo-data";
import { BRAND, DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";
import { PUBLISHER_ENTITY, buildBreadcrumbNode } from "@/lib/seo-schema";

export const revalidate = 3600;

const POLICY_SLUGS: PolicyDoc["slug"][] = ["shipping", "returns", "privacy", "terms"];

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ tenant: DEFAULT_TENANT, slug }));
}

export function generateMetadata({
  params,
}: {
  params: { tenant: string; slug: string };
}): Metadata {
  const doc = POLICIES[params.slug as PolicyDoc["slug"]];
  if (!doc) return { title: `Policy — ${BRAND.nameEn}`, robots: { index: false } };
  const title = `${doc.titleTa} | ${doc.titleEn} — ${BRAND.nameTa}`;
  const url = `${SITE_URL}/${params.tenant}/policies/${doc.slug}`;
  return {
    title,
    description: doc.summaryEn,
    alternates: { canonical: url },
    openGraph: { title, description: doc.summaryEn, url, type: "article" },
  };
}

export default function PolicyPage({
  params,
}: {
  params: { tenant: string; slug: string };
}) {
  const doc = POLICIES[params.slug as PolicyDoc["slug"]];
  if (!doc) notFound();

  const url = `${SITE_URL}/${params.tenant}/policies/${doc.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    ...buildBreadcrumbNode(
      [
        { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: `${SITE_URL}/${params.tenant}` },
        { name: `${doc.titleTa} | ${doc.titleEn}`, url },
      ],
      `${url}#breadcrumb`,
    ),
  };

  return (
    <div className="container-site max-w-4xl py-10 sm:py-16">
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
          <T ta={doc.titleTa} en={doc.titleEn} />
        </span>
      </nav>

      {/* Policy Switcher Pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        {POLICY_SLUGS.map((slug) => {
          const p = POLICIES[slug];
          const active = slug === doc.slug;
          return (
            <Link
              key={slug}
              href={`/${params.tenant}/policies/${slug}`}
              prefetch={false}
              className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                active
                  ? "bg-black text-white"
                  : "border border-black/15 bg-[#FAFAFA] text-black hover:border-brand-red-dark hover:text-brand-red-dark"
              }`}
            >
              <T ta={p.titleTa} en={p.titleEn} />
            </Link>
          );
        })}
      </div>

      <header className="border-b border-black/10 pb-6">
        <p className="eyebrow">
          <T ta="அதிகாரப்பூர்வக் கொள்கை" en="Official Storefront Policy" />
        </p>
        <h1 className="mt-2 text-[30px] font-extrabold tracking-tight text-black sm:text-[40px]">
          <T ta={doc.titleTa} en={doc.titleEn} />
        </h1>
        <p className="mt-2 text-[13px] font-semibold text-black/65">
          <T ta="கடைசியாகப் புதுப்பிக்கப்பட்டது:" en="Last updated:" />{" "}
          <time dateTime={POLICY_LAST_UPDATED_ISO}>
            <T ta={POLICY_LAST_UPDATED_TA} en={POLICY_LAST_UPDATED_EN} />
          </time>
        </p>
        <p className="mt-4 rounded-2xl border border-brand-red/20 bg-brand-red-light p-4 text-[14.5px] font-medium leading-relaxed text-black">
          <T ta={doc.summaryTa} en={doc.summaryEn} />
        </p>
      </header>

      <div className="mt-8 space-y-8">
        {doc.sections.map((sec) => (
          <section key={sec.hEn}>
            <h2 className="text-[19px] font-bold text-black">
              <T ta={sec.hTa} en={sec.hEn} />
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-black/80">
              <T ta={sec.pTa} en={sec.pEn} />
            </p>
          </section>
        ))}
      </div>

      <footer className="mt-12 rounded-2xl border border-black/10 bg-[#FAFAFA] p-6 text-[14px] text-black/80">
        <h2 className="text-[16px] font-extrabold text-black">
          <T ta="தொடர்பு முகவரி" en="Publisher Contact & Grievance Redressal" />
        </h2>
        <p className="mt-2">
          <strong>{PUBLISHER_ENTITY.nameTa} ({PUBLISHER_ENTITY.nameEn})</strong>
          <br />
          {PUBLISHER_ENTITY.addressLineEn}
          <br />
          Phone / WhatsApp: +91 {PUBLISHER_ENTITY.phoneDisplay} • Email: {PUBLISHER_ENTITY.email}
        </p>
      </footer>
    </div>
  );
}
