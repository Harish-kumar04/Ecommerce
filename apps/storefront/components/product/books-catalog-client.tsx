"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductCard, { toCardProduct } from "@/components/product/product-card";
import { useLanguage } from "@/components/language-provider";
import { T } from "@/components/i18n/t";

type Category = { id: string; name: string; slug?: string };

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
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">("default");

  // Sync the category filter with the URL (?category=<slug>) without making the page dynamic.
  useEffect(() => {
    const apply = () => {
      const key = new URLSearchParams(window.location.search).get("category");
      setSelectedCategory(findCategory(categories, key)?.id ?? "all");
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [categories]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) return false;
      if (!q) return true;
      const name = String(p.name || "").toLowerCase();
      const desc = String(p.description || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || sku.includes(q);
    });
    const priceOf = (p: any) => p.sale_price_cents ?? p.price_cents;
    if (sortBy === "price-asc") list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    else if (sortBy === "price-desc") list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    return list;
  }, [products, search, selectedCategory, sortBy]);

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
      active
        ? "bg-brand-red text-white shadow-glow"
        : "border border-black/10 bg-white text-black hover:border-brand-red hover:text-brand-red"
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
        <p className="mt-3 max-w-2xl text-[15px] text-black/65 sm:text-[16px]">
          <T
            ta={`முத்தமிழறிஞர் பதிப்பகத்தின் ${products.length} அதிகாரப்பூர்வ வெளியீடுகள் — திராவிட இயக்க வரலாறு, சமூகநீதி, திராவிட மாடல் மற்றும் கலைஞர் படைப்புகள்.`}
            en={`All ${products.length} official publications from Muthamilarignar Pathipagam — Dravidian history, social justice, the Dravidian Model and Kalaignar's works.`}
          />
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="catalog-search" className="sr-only">
            {t("நூல்களைத் தேடுக", "Search books")}
          </label>
          <input
            id="catalog-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "நூல் பெயர் (தமிழ் / English) அல்லது குறியீடு மூலம் தேடுக…",
              "Search in Tamil or English (e.g. Kalaignar, கலைஞர்)…",
            )}
            className="h-12 w-full rounded-full border border-black/15 bg-white pl-11 pr-4 text-[15px] focus:border-brand-red focus:outline-none"
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label={t("வரிசைப்படுத்து", "Sort books")}
          className="h-12 rounded-full border border-black/15 bg-white px-5 text-[14px] font-medium text-black focus:border-brand-red focus:outline-none"
        >
          <option value="default">{t("வரிசை: சிறப்பு வெளியீடுகள்", "Sort: Featured")}</option>
          <option value="price-asc">{t("விலை: குறைந்தது முதல்", "Price: Low to High")}</option>
          <option value="price-desc">{t("விலை: அதிகம் முதல்", "Price: High to Low")}</option>
        </select>
      </div>

      {categories.length > 0 && (
        <div role="group" aria-label={t("நூல் வகைகள்", "Categories")} className="no-scrollbar mb-8 flex items-center gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => selectCategory("all")} aria-pressed={selectedCategory === "all"} className={pill(selectedCategory === "all")}>
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

      <p className="sr-only" role="status" aria-live="polite">
        {t(`${filtered.length} நூல்கள்`, `${filtered.length} books`)}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-6 py-20 text-center">
          <p className="text-black/60">
            {t("உங்கள் தேடலுக்குப் பொருந்தும் நூல்கள் எதுவும் கிடைக்கவில்லை.", "No books matched your search or filter.")}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              selectCategory("all");
            }}
            className="btn-red mt-5 h-10 text-[14px]"
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
              priority={i < 2}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 270px"
            />
          ))}
        </div>
      )}
    </div>
  );
}
