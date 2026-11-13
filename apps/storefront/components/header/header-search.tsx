"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import Img from "@/components/ui/img";
import { cloudinaryImageUrl } from "@/lib/site-defaults";

export interface SearchBookItem {
  id: string;
  slug?: string | null;
  name: string;
  author?: string | null;
  price_cents: number;
  sale_price_cents?: number | null;
  image_url?: string | null;
}

const searchCatalogCache = new Map<string, SearchBookItem[]>();

function resolveSearchApiBase(): string {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const trimmed = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
      return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
    }
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "/api/v1";
    }
  }
  return "http://localhost:8000/api/v1";
}

export default function HeaderSearch({
  tenant,
  books = [],
}: {
  tenant: string;
  books?: SearchBookItem[];
}) {
  const { t, localizeName, localizeSubName } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [lazyBooks, setLazyBooks] = useState<SearchBookItem[]>(
    () => searchCatalogCache.get(tenant) || [],
  );
  const loadingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeBooks = books.length > 0 ? books : lazyBooks;

  const ensureCatalogLoaded = () => {
    if (books.length > 0 || searchCatalogCache.has(tenant) || loadingRef.current) return;
    loadingRef.current = true;
    fetch(`${resolveSearchApiBase()}/public/products`, {
      headers: { "X-Tenant": tenant },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        const mapped: SearchBookItem[] = list.map((b: any) => ({
          id: String(b.id),
          slug: b.slug ? String(b.slug) : null,
          name: String(b.name || ""),
          author: b.author || b.dimensions_json?.book?.author || null,
          price_cents: Number(b.price_cents) || 0,
          sale_price_cents: b.sale_price_cents ?? null,
          image_url: b.image_url || b.images?.[0] || null,
        }));
        searchCatalogCache.set(tenant, mapped);
        setLazyBooks(mapped);
      })
      .catch(() => {})
      .finally(() => {
        loadingRef.current = false;
      });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return activeBooks
      .filter((b) => {
        const nameMatch = b.name.toLowerCase().includes(q);
        const authorMatch = b.author ? b.author.toLowerCase().includes(q) : false;
        return nameMatch || authorMatch;
      })
      .slice(0, 6);
  }, [query, activeBooks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    router.push(`/${tenant}/books?q=${encodeURIComponent(query.trim())}`);
  };

  const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
      <form onSubmit={handleSubmit} role="search" className="relative flex items-center">
        <input
          type="search"
          aria-label={t("நூல் அல்லது ஆசிரியர் தேடுக", "Search books or author")}
          value={query}
          onChange={(e) => {
            ensureCatalogLoaded();
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            ensureCatalogLoaded();
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder={t("நூல் அல்லது ஆசிரியர் தேடுக…", "Search books or author…")}
          className="h-11 w-full rounded-full border border-black/20 bg-[#FAFAFA] pl-10 pr-4 text-[13.5px] text-black placeholder:text-black/55 focus:border-brand-red focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 transition-all"
        />
        <svg
          className="pointer-events-none absolute left-3.5 h-4 w-4 text-black/55"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </form>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-glow">
          {results.length === 0 ? (
            <div className="p-4 text-center text-[13px] text-black/50">
              {t("நூல்கள் எதுவும் கிடைக்கவில்லை", "No books found")}
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {results.map((book) => {
                const onSale = Boolean(book.sale_price_cents && book.sale_price_cents < book.price_cents);
                const price = onSale ? (book.sale_price_cents as number) : book.price_cents;
                return (
                  <Link
                    key={book.id}
                    href={`/${tenant}/books/${encodeURIComponent(book.slug || book.id)}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/[0.04] transition-colors"
                  >
                    <div className="relative h-14 w-11 flex-shrink-0 overflow-hidden rounded bg-[#fafafa] border border-black/[0.06]">
                      {book.image_url ? (
                        <Img
                          src={cloudinaryImageUrl(book.image_url, 128)}
                          alt={book.name}
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] text-black/30">
                          {t("படம்", "Cover")}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-black">
                        {localizeName(book.name)}
                      </p>
                      <p className="truncate text-[11.5px] text-black/55">
                        {book.author || localizeSubName(book.name)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[13.5px] font-extrabold text-brand-red">
                        {rupees(price)}
                      </span>
                      {onSale && (
                        <span className="block text-[11px] text-black/40 line-through">
                          {rupees(book.price_cents)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="text-[12px] font-semibold text-brand-red hover:underline"
                >
                  {t("அனைத்து முடிவுகளையும் காண்க", "View all results")} →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
