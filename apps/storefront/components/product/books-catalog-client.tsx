"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductCard, { toCardProduct } from "@/components/product/product-card";
import { useLanguage } from "@/components/language-provider";
import { T } from "@/components/i18n/t";

type Category = { id: string; name: string; slug?: string };
type SortKey = "default" | "newest" | "price-asc" | "price-desc";
const VALID_SORTS: readonly SortKey[] = ["default", "newest", "price-asc", "price-desc"];

/** `?category=` may hold a category slug (preferred) or id. */
function findCategory(categories: Category[], key: string | null): Category | undefined {
  if (!key) return undefined;
  const k = key.toLowerCase();
  return categories.find((c) => (c.slug || "").toLowerCase() === k || String(c.id).toLowerCase() === k);
}

export default function BooksCatalogClient({
  tenant,
  products,
  categories,
}: {
  tenant: string;
  products: any[];
  categories: Category[];
}) {
  const { t, localizeName } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);

  const sortOptions: { value: SortKey; label: string }[] = useMemo(
    () => [
      { value: "default", label: t("பரிந்துரை", "Featured") },
      { value: "newest", label: t("புதிய வரவுகள்", "Newest First") },
      { value: "price-asc", label: t("விலை: குறைந்தது முதல்", "Price: Low to High") },
      { value: "price-desc", label: t("விலை: அதிகம் முதல்", "Price: High to Low") },
    ],
    [t],
  );

  const selectedSortLabel =
    sortOptions.find((opt) => opt.value === sortBy)?.label ?? sortOptions[0].label;

  // Sync category, sale, sort, and search from URL params without making the page dynamic
  useEffect(() => {
    const apply = () => {
      const params = new URLSearchParams(window.location.search);
      const catKey = params.get("category");
      setSelectedCategory(findCategory(categories, catKey)?.id ?? "all");

      const sortParam = params.get("sort") as SortKey | null;
      if (sortParam && VALID_SORTS.includes(sortParam)) {
        setSortBy(sortParam);
      }
      if (params.get("sale") === "1") setSaleOnly(true);
      const q = params.get("q") || params.get("search");
      if (q && q !== "1") setSearch(q);
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [categories]);

  useEffect(() => {
    if (!sortOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sortOpen]);

  const selectSort = (value: SortKey) => {
    setSortBy(value);
    setSortOpen(false);
    const url = new URL(window.location.href);
    if (value !== "default") url.searchParams.set("sort", value);
    else url.searchParams.delete("sort");
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const selectCategory = useCallback(
    (id: string) => {
      setSelectedCategory(id);
      const url = new URL(window.location.href);
      const cat = categories.find((c) => c.id === id);
      if (cat) url.searchParams.set("category", cat.slug || cat.id);
      else url.searchParams.delete("category");
      window.history.replaceState(window.history.state, "", url.toString());
    },
    [categories],
  );

  const toggleSale = () => {
    const next = !saleOnly;
    setSaleOnly(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("sale", "1");
    else url.searchParams.delete("sale");
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) return false;
      if (inStockOnly && (p.inventory !== undefined ? p.inventory <= 0 : p.inventory_quantity <= 0)) {
        return false;
      }
      if (saleOnly && !(p.sale_price_cents && p.sale_price_cents < p.price_cents)) {
        return false;
      }
      if (!q) return true;
      const name = String(p.name || "").toLowerCase();
      const desc = String(p.description || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      const author = String(p.author || p.dimensions_json?.book?.author || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || sku.includes(q) || author.includes(q);
    });

    const priceOf = (p: any) => p.sale_price_cents ?? p.price_cents;
    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    } else if (sortBy === "newest") {
      list = [...list].reverse();
    }
    return list;
  }, [products, search, selectedCategory, sortBy, inStockOnly, saleOnly]);

  const pill = (active: boolean) =>
    `inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-semibold transition-all ${
      active
        ? "bg-[#D11D1A] text-white shadow-glow"
        : "border border-black/15 bg-white text-black hover:border-brand-red-dark hover:text-brand-red-dark"
    }`;

  return (
    <div className="container-site py-10 sm:py-14">
      <header className="mb-8">
        <p className="eyebrow">
          <T ta="முத்தமிழறிஞர் பதிப்பகம்" en="Muthamilarignar Pathipagam" />
        </p>
        <h1 className="mt-2 text-[32px] font-extrabold leading-[1.1] tracking-tight text-black sm:text-[44px] lg:text-[52px]">
          <T ta="அனைத்து நூல்கள்" en="All books" />
        </h1>
        <div aria-hidden="true" className="mt-3 h-1 w-14 rounded-full bg-brand-red" />
        <p className="mt-3 max-w-2xl text-[15px] text-black/70 sm:text-[16px]">
          <T
            ta={`முத்தமிழறிஞர் பதிப்பகத்தின் ${products.length} அதிகாரப்பூர்வ வெளியீடுகள் — திராவிட இயக்க வரலாறு, சமூகநீதி, திராவிட மாடல் மற்றும் கலைஞர் படைப்புகள்.`}
            en={`All ${products.length} official publications from Muthamilarignar Pathipagam — Dravidian history, social justice, the Dravidian Model and Kalaignar's works.`}
          />
        </p>
      </header>

      {/* Search and Sort Row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row items-center">
        <div className="relative flex-1 w-full">
          <label htmlFor="catalog-search" className="sr-only">
            {t("நூல்களைத் தேடுக", "Search books")}
          </label>
          <input
            id="catalog-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "நூல் பெயர் அல்லது ஆசிரியர் மூலம் தேடுக…",
              "Search in Tamil or English by title or author…",
            )}
            className="h-12 w-full rounded-full border border-black/20 bg-white pl-11 pr-4 text-[14.5px] text-black placeholder:text-black/55 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/55"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        {/* Sort selector showing selected option */}
        <div ref={sortRef} className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            className={`flex h-12 w-full sm:w-auto items-center justify-between gap-2.5 rounded-full border px-5 text-[14px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red/20 ${
              sortBy !== "default"
                ? "border-brand-red bg-brand-red/5 text-brand-red-dark"
                : "border-black/20 bg-white text-black hover:border-black/40"
            }`}
          >
            <span className="truncate">
              <span className="text-black/65 font-medium mr-1">
                {t("வரிசை:", "Sort:")}
              </span>
              <span>{selectedSortLabel}</span>
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className={`h-4 w-4 flex-shrink-0 transition-transform ${sortOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {sortOpen && (
            <ul
              role="listbox"
              aria-label={t("வரிசைப்படுத்து", "Sort options")}
              className="absolute right-0 z-30 mt-2 w-full sm:w-64 overflow-hidden rounded-2xl border border-black/10 bg-white py-1.5 shadow-xl"
            >
              {sortOptions.map((opt) => {
                const active = opt.value === sortBy;
                return (
                  <li key={opt.value} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => selectSort(opt.value)}
                      className={`flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-left text-[13.5px] transition-colors ${
                        active
                          ? "bg-brand-red/10 font-bold text-brand-red-dark"
                          : "font-medium text-black/80 hover:bg-black/[0.04]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {active && (
                        <span aria-hidden="true" className="text-brand-red-dark font-extrabold">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Category Chips and Toggles Row */}
      <div className="mb-8 space-y-3">
        {/* Category Pills */}
        {categories.length > 0 && (
          <div
            role="group"
            aria-label={t("நூல் வகைகள்", "Categories")}
            className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
          >
            <button
              type="button"
              onClick={() => selectCategory("all")}
              aria-pressed={selectedCategory === "all"}
              className={pill(selectedCategory === "all")}
            >
              {t(`அனைத்தும் (${products.length})`, `All (${products.length})`)}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                aria-pressed={selectedCategory === cat.id}
                className={pill(selectedCategory === cat.id)}
              >
                {localizeName(cat.name)}
              </button>
            ))}
          </div>
        )}

        {/* Filters: In-stock and Sale */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={toggleSale}
            aria-pressed={saleOnly}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
              saleOnly
                ? "bg-[#D11D1A] text-white shadow-glow"
                : "border border-black/20 bg-white text-black/80 hover:border-brand-red-dark hover:text-brand-red-dark"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {t("சலுகை நூல்கள் மட்டும்", "On Sale Only")}
          </button>

          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            aria-pressed={inStockOnly}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
              inStockOnly
                ? "bg-black text-white"
                : "border border-black/20 bg-white text-black/80 hover:border-black/50"
            }`}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-green-600" />
            {t("கையிருப்பில் உள்ளவை மட்டும்", "In Stock Only")}
          </button>
        </div>
      </div>

      <h2 className="sr-only" role="status" aria-live="polite">
        {t(`${filtered.length} நூல்கள்`, `${filtered.length} books`)}
      </h2>

      {/* Book Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-6 py-20 text-center">
          <p className="text-black/60 text-[16px]">
            {t("உங்கள் தேடலுக்குப் பொருந்தும் நூல்கள் எதுவும் கிடைக்கவில்லை.", "No books matched your search or filter.")}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setSaleOnly(false);
              setInStockOnly(false);
            }}
            className="btn-red mt-5 h-11 text-[14px]"
          >
            {t("அனைத்து நூல்களையும் காட்டு", "Show all books")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p: any, i: number) => (
            <ProductCard
              key={p.id}
              product={toCardProduct(p)}
              tenant={tenant}
              priority={i === 0}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
            />
          ))}
        </div>
      )}
    </div>
  );
}
