"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartIcon } from "@/components/brand/icons";
import { useLanguage } from "@/components/language-provider";
import { CART_COUNT_KEY, readFromStorage, openMiniCart } from "@/lib/cart-events";

export default function MobileBottomBar({ tenant }: { tenant: string }) {
  const pathname = usePathname() || `/${tenant}`;
  const home = `/${tenant}`;
  const { t } = useLanguage();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readFromStorage().count);
    sync();
    window.addEventListener("infalette-cart-changed", sync);
    window.addEventListener("infalette-cart-optimistic", sync);
    return () => {
      window.removeEventListener("infalette-cart-changed", sync);
      window.removeEventListener("infalette-cart-optimistic", sync);
    };
  }, []);

  const isActive = (path: string) => {
    const href = `${home}${path}`;
    if (!path) return pathname === home || pathname === `${home}/`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const tabs = [
    {
      path: "",
      ta: "முகப்பு",
      en: "Home",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: "/products",
      ta: "நூல்கள்",
      en: "Books",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      path: "/products?search=1",
      action: "search",
      ta: "தேடல்",
      en: "Search",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      path: "/cart",
      action: "cart",
      ta: "கூடை",
      en: "Cart",
      icon: (
        <div className="relative">
          <CartIcon className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-red px-1 text-[9.5px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </div>
      ),
    },
    {
      path: "/account",
      ta: "கணக்கு",
      en: "Account",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-black/10 bg-white/[0.98] px-2 lg:hidden"
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        if (tab.action === "cart") {
          return (
            <button
              key={tab.en}
              onClick={() => openMiniCart()}
              className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors text-black/65 hover:text-brand-red"
              aria-label={t(tab.ta, tab.en)}
            >
              {tab.icon}
              <span>{t(tab.ta, tab.en)}</span>
            </button>
          );
        }
        if (tab.action === "search") {
          return (
            <button
              key={tab.en}
              onClick={() => {
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors text-black/65 hover:text-brand-red"
              aria-label={t(tab.ta, tab.en)}
            >
              {tab.icon}
              <span>{t(tab.ta, tab.en)}</span>
            </button>
          );
        }
        return (
          <Link
            key={tab.path}
            href={`${home}${tab.path}`}
            prefetch={false}
            className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              active ? "text-brand-red font-bold" : "text-black/65 hover:text-brand-red"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {tab.icon}
            <span>{t(tab.ta, tab.en)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
