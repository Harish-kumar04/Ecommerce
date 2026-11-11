import Link from "next/link";
import { BiName, T } from "../i18n/t";

/** Trust strip showing only real features: Cash on Delivery, Secure online payment. */
export function TrustBar() {
  const items = [
    {
      icon: (
        <svg className="h-6 w-6 text-brand-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      ta: "ரொக்கப் பணம் செலுத்தும் வசதி (COD)",
      en: "Cash on Delivery Available",
      sub_ta: "நூல் கிடைத்தவுடன் பணம் செலுத்தலாம்",
      sub_en: "Pay safely when your book arrives",
    },
    {
      icon: (
        <svg className="h-6 w-6 text-brand-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      ta: "பாதுகாப்பான இணையப் பரிவர்த்தனை",
      en: "Secure Online Payment",
      sub_ta: "UPI, ஜிபே, வங்கி அட்டை & நெட் பேங்கிங்",
      sub_en: "UPI, Cards, Net Banking via Razorpay",
    },
    {
      icon: (
        <svg className="h-6 w-6 text-brand-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      ta: "நேரடி பதிப்பக வெளியீடுகள்",
      en: "Official Publisher Editions",
      sub_ta: "முத்தமிழறிஞர் பதிப்பகம் அசல் நூல்கள்",
      sub_en: "Authentic, original printed editions",
    },
    {
      icon: (
        <svg className="h-6 w-6 text-brand-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      ta: "இந்தியா முழுவதும் விரைவு விநியோகம்",
      en: "Fast Pan-India Delivery",
      sub_ta: "நம்பகமான கூரியர் மற்றும் தபால் சேவை",
      sub_en: "Delivered securely to your doorstep",
    },
  ];

  return (
    <section aria-label="Trust Strip" className="border-y border-black/[0.08] bg-white py-5 sm:py-6">
      <div className="container-site">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.en} className="flex items-center gap-3.5 p-2 rounded-xl bg-black/[0.02] border border-black/[0.04]">
              {it.icon}
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-black leading-snug">
                  <T ta={it.ta} en={it.en} />
                </p>
                <p className="text-[11.5px] text-black/60 leading-tight mt-0.5">
                  <T ta={it.sub_ta} en={it.sub_en} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Category chips with horizontal scroll on mobile and desktop wrap. */
export function CategoryStrip({
  tenant,
  categories,
}: {
  tenant: string;
  categories: { id: string; name: string; slug?: string }[];
}) {
  if (categories.length === 0) return null;
  return (
    <nav aria-label="Categories" className="container-site pt-8 sm:pt-12">
      <div className="flex items-center justify-between pb-3">
        <span className="eyebrow">
          <T ta="நூல் பிரிவுகள்" en="Categories" />
        </span>
        <Link
          href={`/${tenant}/products`}
          className="text-[13px] font-semibold text-brand-red hover:underline"
        >
          <T ta="அனைத்தும்" en="View all" /> →
        </Link>
      </div>
      <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto pb-2 scroll-smooth">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/${tenant}/products?category=${encodeURIComponent(cat.slug || cat.id)}`}
            className="flex-shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 text-[13.5px] font-semibold text-black shadow-card transition-all hover:border-brand-red hover:text-brand-red hover:shadow-glow"
          >
            <BiName value={cat.name} />
          </Link>
        ))}
      </div>
    </nav>
  );
}
