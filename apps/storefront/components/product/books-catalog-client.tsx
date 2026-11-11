"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/product/product-card";
import { useLanguage } from "@/components/language-provider";

export default function BooksCatalogClient({
  tenant,
  products,
  categories,
}: {
  tenant: string;
  products: any[];
  categories: any[];
}) {
  const { t, localizeName } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">(
    "default",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const name = String(p.name || "").toLowerCase();
      const desc = String(p.description || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || sku.includes(q);
    });

    if (sortBy === "price-asc") {
      list = [...list].sort(
        (a, b) =>
          (a.sale_price_cents ?? a.price_cents) -
          (b.sale_price_cents ?? b.price_cents),
      );
    } else if (sortBy === "price-desc") {
      list = [...list].sort(
        (a, b) =>
          (b.sale_price_cents ?? b.price_cents) -
          (a.sale_price_cents ?? a.price_cents),
      );
    }
    return list;
  }, [products, search, selectedCategory, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-red-light border border-brand-red-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-red-dark">
          {t("முத்தமிழறிஞர் பதிப்பகம்", "Muthamilarignar Pathipagam")}
        </div>
        <h1 className="mt-3 text-[34px] sm:text-[46px] font-extrabold leading-[1.08] tracking-tight text-gray-900">
          {t(
            "அனைத்து நூல்கள் (Complete Book Catalog)",
            "Complete Book Catalog (அனைத்து நூல்கள்)",
          )}
        </h1>
        <p className="mt-2.5 text-[15px] text-gray-600 max-w-2xl">
          {t(
            `முத்தமிழறிஞர் பதிப்பகத்தின் ${products.length} அதிகாரப்பூர்வ வெளியீடுகள் — திராவிட இயக்க வரலாறு, சமூகநீதி, திராவிட மாடல் மற்றும் கலைஞர் படைப்புகள்.`,
            `Browse all ${products.length} official publications from Muthamilarignar Pathipagam — covering Dravidian history, social justice, the Dravidian Model, and Kalaignar's works.`,
          )}
        </p>
      </header>

      {/* Search + Sort Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "நூல் பெயர் (தமிழ் / English) அல்லது குறியீடு மூலம் தேடுக…",
              "Search books in Tamil or English (e.g., Kalaignar, Dravida, கலைஞர்)…",
            )}
            className="w-full h-11 rounded-full border border-gray-200 bg-white pl-10 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          aria-label={t("வரிசைப்படுத்து", "Sort books")}
          className="h-11 rounded-full border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red"
        >
          <option value="default">
            {t("வரிசை: சிறப்பு வெளியீடுகள்", "Sort: Featured")}
          </option>
          <option value="price-asc">
            {t("விலை: குறைந்த முதல் அதிகம்", "Price: Low to High")}
          </option>
          <option value="price-desc">
            {t("விலை: அதிகம் முதல் குறைந்த", "Price: High to Low")}
          </option>
        </select>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-brand-red text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t(`அனைத்தும் (${products.length})`, `All Books (${products.length})`)}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-brand-red text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {localizeName(cat.name)}
            </button>
          ))}
        </div>
      )}

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 px-6 text-center">
          <p className="text-gray-500">
            {t(
              "உங்கள் தேடலுக்குப் பொருந்தும் நூல்கள் எதுவும் கிடைக்கவில்லை.",
              "No books matched your search or filter.",
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
            }}
            className="mt-4 inline-flex h-9 px-5 items-center justify-center rounded-full bg-brand-red text-white text-[13px] font-semibold"
          >
            {t("அனைத்து நூல்களையும் காட்டு", "Show All Books")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((p: any) => (
            <ProductCard key={p.id} product={p} tenant={tenant} />
          ))}
        </div>
      )}
    </div>
  );
}
