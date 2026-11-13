import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/brand/brand-logo";
import { T } from "@/components/i18n/t";
import {
  BRAND,
  DEFAULT_TENANT,
  LOGO_ALT,
  SITE_URL,
  getLogoUrl,
  getShareLogoUrl,
} from "@/lib/site-defaults";
import {
  PUBLISHER_ENTITY,
  buildBreadcrumbNode,
  buildOrganizationNodes,
} from "@/lib/seo-schema";
import { AUTHORS, POLICY_LAST_UPDATED_EN, POLICY_LAST_UPDATED_ISO, POLICY_LAST_UPDATED_TA } from "@/lib/aeo-data";
import { fetchBooksSafe, getStoreWithFallback } from "@/lib/catalog-fallback";

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ tenant: DEFAULT_TENANT }];
}

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const store = await getStoreWithFallback(params.tenant);
  const shareLogo = getShareLogoUrl(store);
  const title = `எங்களைப் பற்றி | About ${BRAND.nameTa} (${BRAND.nameEn})`;
  const description =
    "Official publisher profile for Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்), Anna Arivalayam Campus, Teynampet, Chennai — publishing Dravidian history, social justice, and Kalaignar's works.";
  const url = `${SITE_URL}/${params.tenant}/about`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: [{ url: shareLogo, alt: LOGO_ALT }] },
    twitter: { card: "summary_large_image", title, description, images: [{ url: shareLogo, alt: LOGO_ALT }] },
  };
}

export default async function AboutPublisherPage({
  params,
}: {
  params: { tenant: string };
}) {
  const [booksRes, store] = await Promise.all([
    fetchBooksSafe(params.tenant),
    getStoreWithFallback(params.tenant),
  ]);
  const logoUrl = getLogoUrl(store);
  const totalBooks = booksRes.books.length;
  const pageUrl = `${SITE_URL}/${params.tenant}/about`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      ...buildOrganizationNodes(params.tenant, logoUrl),
      buildBreadcrumbNode(
        [
          { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: `${SITE_URL}/${params.tenant}` },
          { name: "பதிப்பகம் பற்றி | About Publisher", url: pageUrl },
        ],
        `${pageUrl}#breadcrumb`,
      ),
    ],
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
          <T ta="பதிப்பகம் பற்றி" en="About Publisher" />
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">
            <T ta="அதிகாரப்பூர்வ பதிப்பக விவரம்" en="Official Publishing House" />
          </p>
          <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-black sm:text-[44px]">
            {PUBLISHER_ENTITY.nameTa} | {PUBLISHER_ENTITY.nameEn}
          </h1>
          <p className="mt-2 text-[13px] font-semibold text-black/60">
            <T ta="கடைசியாகப் புதுப்பிக்கப்பட்டது:" en="Last updated:" />{" "}
            <time dateTime={POLICY_LAST_UPDATED_ISO}>
              <T ta={POLICY_LAST_UPDATED_TA} en={POLICY_LAST_UPDATED_EN} />
            </time>
          </p>
          <div aria-hidden="true" className="mt-4 h-1 w-16 rounded-full bg-brand-red" />

          <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-black/80">
            <p>
              <strong>Muthamilarignar Pathipagam ({PUBLISHER_ENTITY.nameTa})</strong> is an official Tamil and English book publishing house based at Anna Arivalayam Campus, Teynampet, Chennai – 600018, Tamil Nadu, India. With {totalBooks}+ active print editions, the press preserves and distributes foundational works on Dravidian movement history, social justice, constitutional federalism, language rights, the Dravidian Model of governance, and the literary legacy of Muthamilarignar Dr. Kalaignar M. Karunanidhi.
            </p>
            <p>
              முத்தமிழறிஞர் பதிப்பகம் தமிழ் மொழி, சமூகநீதி, சுயமரியாதை இயக்கம், மாநில சுயாட்சி மற்றும் முத்தமிழறிஞர் கலைஞர் அவர்களின் காலத்தால் அழியாத படைப்புகளைத் தரமான அச்சிலும் எளிய விலையிலும் வாசகர்கள், மாணவர்கள் மற்றும் ஆய்வாளர்களிடம் கொண்டு சேர்க்கும் நோக்குடன் செயல்படுகிறது.
            </p>
          </div>

          <h2 className="mt-10 text-[22px] font-extrabold text-black">
            <T ta="முதன்மை ஆசிரியர்கள் & தொகுப்புகள்" en="Featured Authors & Editorial Collections" />
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {AUTHORS.map((author) => (
              <Link
                key={author.slug}
                href={`/${params.tenant}/authors/${author.slug}`}
                prefetch={false}
                className="card-glow flex flex-col justify-between p-5"
              >
                <div>
                  <h3 className="text-[15.5px] font-bold text-black">
                    <T ta={author.nameTa} en={author.nameEn} />
                  </h3>
                  <p className="mt-1.5 text-[12.5px] text-black/70">
                    <T ta={author.honorificTa} en={author.honorificEn} />
                  </p>
                </div>
                <span className="mt-4 text-[13px] font-bold text-brand-red-dark">
                  <T ta="நூல்களைக் காண்க →" en="View author page →" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Consistent Publisher Entity Card */}
        <aside className="lg:col-span-4">
          <div className="card-glow bg-[#FAFAFA] p-6">
            <div className="mb-4 inline-flex rounded-2xl border border-black/10 bg-white p-3">
              <BrandLogo
                src={logoUrl}
                sizes="88px"
                className="h-20"
                penSize="sm"
              />
            </div>
            <h2 className="text-[18px] font-extrabold text-black">
              <T ta="பதிப்பகத் தொடர்பு விவரம்" en="Verified Entity Facts" />
            </h2>
            <dl className="mt-4 space-y-3 text-[14px]">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-black/55">Name</dt>
                <dd className="font-semibold text-black">
                  {PUBLISHER_ENTITY.nameTa} ({PUBLISHER_ENTITY.nameEn})
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-black/55">Address</dt>
                <dd className="font-medium text-black/85">
                  <T ta={PUBLISHER_ENTITY.addressLineTa} en={PUBLISHER_ENTITY.addressLineEn} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-black/55">Phone / WhatsApp</dt>
                <dd className="font-semibold text-black">
                  <a href={`tel:${PUBLISHER_ENTITY.phoneE164}`} className="hover:text-brand-red-dark">
                    +91 {PUBLISHER_ENTITY.phoneDisplay}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-black/55">Email</dt>
                <dd className="font-semibold text-black break-all">
                  <a href={`mailto:${PUBLISHER_ENTITY.email}`} className="hover:text-brand-red-dark">
                    {PUBLISHER_ENTITY.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-black/55">Official Social</dt>
                <dd className="font-semibold text-brand-red-dark">
                  <a href={PUBLISHER_ENTITY.sameAs[0]} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Facebook — Muthamilarignar Pathipagam
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
