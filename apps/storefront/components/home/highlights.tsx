import Link from "next/link";
import { BiName, T } from "../i18n/t";

/** Quick trust facts under the hero, computed from the real catalogue (no "27+" guesswork). */
export function TrustBar({ count, minCents, maxCents }: { count: number; minCents: number; maxCents: number }) {
  const r = (c: number) => `₹${Math.round(c / 100).toLocaleString("en-IN")}`;
  const items = [
    { value: String(count), ta: "அதிகாரப்பூர்வ நூல்கள்", en: "Official titles" },
    { value: minCents === maxCents ? r(minCents) : `${r(minCents)} – ${r(maxCents)}`, ta: "எளிய மக்கள் விலை", en: "Accessible prices" },
    { value: "COD", ta: "வீட்டில் பணம் செலுத்தலாம்", en: "Cash on delivery" },
    { value: "India", ta: "நாடு முழுவதும் விநியோகம்", en: "Pan-India delivery" },
  ];
  return (
    <section aria-label="Highlights" className="border-y border-black/[0.06] bg-white">
      <dl className="container-site grid grid-cols-2 gap-y-5 py-6 sm:py-7 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.en} className="flex flex-col items-center text-center lg:border-r lg:border-black/[0.06] lg:last:border-r-0">
            <dt className="order-2 mt-1 text-[12.5px] text-black/60 sm:text-[13.5px]">
              <T ta={it.ta} en={it.en} />
            </dt>
            <dd className="order-1 text-[22px] font-extrabold text-brand-red sm:text-[26px]">{it.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Category pills: each links to the filtered catalogue (`/products?category=<slug>`). */
export function CategoryStrip({ tenant, categories }: { tenant: string; categories: { id: string; name: string; slug?: string }[] }) {
  if (categories.length === 0) return null;
  return (
    <nav aria-label="Categories" className="container-site pt-12 sm:pt-16">
      <div className="flex flex-wrap items-center gap-3">
        <span className="eyebrow mr-1">
          <T ta="நூல் வகைகள்" en="Categories" />
        </span>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/${tenant}/products?category=${encodeURIComponent(cat.slug || cat.id)}`}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-[14px] font-semibold text-black shadow-card transition-all hover:border-brand-red hover:text-brand-red hover:shadow-glow"
          >
            <BiName value={cat.name} />
          </Link>
        ))}
      </div>
    </nav>
  );
}
