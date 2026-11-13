"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { ArrowRightIcon } from "@/components/brand/icons";

export type BookTabKey = "new" | "bestsellers" | "offers" | "kalaignar";

/**
 * Tiny (<1 KB) client tab controller. Each tab's ProductCard grid is rendered on the
 * server and passed in `panels`, keeping `next/image` and `ProductCard` out of the
 * Home client JS bundle while mounting only the active tab's DOM nodes.
 */
export default function TabbedBooks({
  tenant,
  totalCount,
  heading,
  backdrop,
  panels,
}: {
  tenant: string;
  totalCount: number;
  heading: ReactNode;
  backdrop?: ReactNode;
  panels: Record<BookTabKey, ReactNode>;
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<BookTabKey>("new");

  const tabs: { key: BookTabKey; ta: string; en: string; href: string }[] = [
    {
      key: "new",
      ta: "புதிய வரவுகள்",
      en: "New Arrivals",
      href: `/${tenant}/products?sort=newest`,
    },
    {
      key: "bestsellers",
      ta: "சிறந்த விற்பனை",
      en: "Best Sellers",
      href: `/${tenant}/products`,
    },
    {
      key: "offers",
      ta: "சலுகைகள்",
      en: "Offers",
      href: `/${tenant}/products?sale=1`,
    },
    {
      key: "kalaignar",
      ta: "கலைஞர் படைப்புகள்",
      en: "Kalaignar Works",
      href: `/${tenant}/products?category=kalaignar-works`,
    },
  ];

  const current = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  return (
    <section
      id="curated-books"
      className="relative overflow-hidden bg-white py-14 sm:py-20"
    >
      {backdrop}

      <div className="container-site relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {heading}

          {/* Accessible Pill Tablist (>=44px touch targets) */}
          <div
            role="tablist"
            aria-label={t("நூல் தொகுப்புகள்", "Book collections")}
            className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
          >
            {tabs.map((tab) => {
              const selected = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex min-h-[44px] flex-shrink-0 items-center rounded-full px-5 py-2 text-[13.5px] font-bold transition-all ${
                    selected
                      ? "bg-black text-white shadow-card"
                      : "border border-black/15 bg-[#FAFAFA] text-black/80 hover:border-brand-red-dark hover:text-brand-red-dark"
                  }`}
                >
                  {t(tab.ta, tab.en)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Server-Rendered Tab Panel */}
        <div
          role="tabpanel"
          id={`panel-${current.key}`}
          aria-labelledby={`tab-${current.key}`}
          className="mt-8 sm:mt-10"
        >
          {panels[current.key]}

          <div className="mt-10 flex justify-center">
            <Link
              href={current.href}
              prefetch={false}
              className="btn-outline h-12 px-7 text-[14.5px]"
            >
              {t(
                `அனைத்து ${totalCount} நூல்களையும் காண்க`,
                `Explore all ${totalCount} books`,
              )}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
