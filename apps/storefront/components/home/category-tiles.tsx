import Link from "next/link";
import { BiName, T } from "@/components/i18n/t";
import { ArrowRightIcon } from "@/components/brand/icons";
import { SectionHeading } from "@/components/brand/patterns";

function CategorySvgIcon({ index }: { index: number }) {
  const kind = index % 6;
  if (kind === 0) {
    // Fountain Pen / Literary Works
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l7-7 3 3-7 7-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l7.586 7.586" />
      </svg>
    );
  }
  if (kind === 1) {
    // Scales of Social Justice
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-4l3-8 3 8a4 4 0 01-6 0zm11 0l3-8 3 8a4 4 0 01-6 0zM5 7h14" />
      </svg>
    );
  }
  if (kind === 2) {
    // Open Book / History
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
  }
  if (kind === 3) {
    // Torch / Awakening
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c2.5 2.5 3.5 5 1.5 7.5-.8 1-2.2 1-3 0C8.5 7 9.5 4.5 12 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6l-1 10h-4L9 11z" />
      </svg>
    );
  }
  if (kind === 4) {
    // Podium / Speeches
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    );
  }
  // Columns / State Autonomy & Governance
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 5H3l9-5z" />
    </svg>
  );
}

/**
 * Category tiles with custom SVG icons (Server Component, zero client JS).
 */
export default function CategoryTiles({
  tenant,
  categories,
}: {
  tenant: string;
  categories: { id: string; name: string; slug?: string }[];
}) {
  if (!categories || categories.length === 0) return null;

  return (
    <section
      aria-label="Categories"
      className="border-b border-black/[0.06] bg-[#FAFAFA] py-12 sm:py-16"
    >
      <div className="container-site">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow={{ ta: "துறை வாரியான நூல்கள்", en: "Browse by Subject" }}
            title={{ ta: "நூல் பிரிவுகள்", en: "Explore Categories" }}
          />
          <Link
            href={`/${tenant}/books`}
            prefetch={false}
            className="btn-outline h-11 px-5 text-[14px]"
          >
            <T ta="அனைத்து நூல்களும்" en="All categories" />
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {categories.slice(0, 12).map((cat, idx) => (
            <Link
              key={cat.id}
              href={
                cat.slug
                  ? `/${tenant}/categories/${encodeURIComponent(cat.slug)}`
                  : `/${tenant}/books?category=${encodeURIComponent(cat.id)}`
              }
              prefetch={false}
              className="card-glow group flex min-h-[108px] flex-col justify-between p-4"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red-light text-brand-red-dark transition-colors group-hover:bg-[#D11D1A] group-hover:text-white">
                <CategorySvgIcon index={idx} />
              </span>
              <span className="mt-3 line-clamp-2 text-[14px] font-bold leading-snug text-black group-hover:text-brand-red-dark">
                <BiName value={cat.name} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
