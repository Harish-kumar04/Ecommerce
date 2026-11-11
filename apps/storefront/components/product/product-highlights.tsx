"use client";

import { useLanguage } from "@/components/language-provider";

/**
 * ProductHighlights — four-up icon row summarizing key book attributes.
 */
export default function ProductHighlights({ product }: { product: any }) {
  const { t } = useLanguage();

  const items = [
    {
      label: t("பதிப்பகம்", "Publisher"),
      value: t("முத்தமிழறிஞர் பதிப்பகம்", "Muthamilarignar Pathipagam"),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      label: t("மொழி", "Language"),
      value: t("தமிழ் (Tamil)", "Tamil (தமிழ்)"),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      label: t("நூல் குறியீடு", "Book Code / SKU"),
      value: product.sku || "MP-BOOK",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M4 4h12l4 4v12H4z" />
          <path d="M16 4v4h4M9 12h6M9 16h4" />
        </svg>
      ),
    },
    {
      label: t("விநியோகம்", "Delivery"),
      value: t("இந்தியா முழுவதும் · 2-5 நாட்கள்", "Pan-India · 2-5 Days"),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <rect x="1" y="6" width="14" height="11" rx="2" />
          <path d="M15 9h4l3 4v4h-7M5.5 19.5a2 2 0 1 0 0-.4M18.5 19.5a2 2 0 1 0 0-.4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="bg-gray-50 border-y border-gray-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-brand-red-soft flex items-center justify-center text-brand-red">
                {it.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                  {it.label}
                </p>
                <p className="mt-1 text-[14px] font-semibold text-gray-900">
                  {it.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}