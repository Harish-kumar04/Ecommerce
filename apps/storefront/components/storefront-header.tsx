"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LanguageToggle from "./language-toggle";
import { useLanguage } from "./language-provider";
import { T } from "./i18n/t";
import { CartIcon } from "./brand/icons";
import { CART_COUNT_KEY, readFromStorage } from "@/lib/cart-events";
import logo from "@/public/brand/logo-96.webp";

const NAV = [
  { path: "", ta: "முகப்பு", en: "Home" },
  { path: "/products", ta: "நூல்கள்", en: "Books" },
  { path: "/orders", ta: "ஆர்டர்கள்", en: "Orders" },
  { path: "/track", ta: "ஆர்டர் நிலை", en: "Track Order" },
  { path: "/account", ta: "கணக்கு", en: "Account" },
] as const;

/**
 * Storefront header: logo + wordmark, simplified bilingual nav, language toggle and
 * cart icon with a live count badge. Light, sticky, ~1440px container.
 */
export default function StorefrontHeader({ tenant }: { tenant: string }) {
  const pathname = usePathname() || `/${tenant}`;
  const { t } = useLanguage();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const sync = () => setCartCount(readFromStorage().count);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_COUNT_KEY) sync();
    };
    sync();
    window.addEventListener("infalette-cart-changed", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("infalette-cart-changed", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const home = `/${tenant}`;
  const isActive = (path: string) => {
    const href = `${home}${path}`;
    if (!path) return pathname === home || pathname === `${home}/`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const cartActive = isActive("/cart");
  const countLabel = cartCount > 99 ? "99+" : String(cartCount);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.07] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="h-[3px] w-full bg-brand-red" aria-hidden="true" />
      <div className="container-site flex h-16 items-center gap-4 lg:h-[76px]">
        <Link href={home} className="group flex min-w-0 items-center gap-3" aria-label={t("முத்தமிழறிஞர் பதிப்பகம் — முகப்பு", "Muthamilarignar Pathipagam — Home")}>
          <Image
            src={logo}
            alt=""
            width={48}
            height={48}
            priority
            sizes="48px"
            className="h-10 w-10 flex-shrink-0 rounded-lg lg:h-12 lg:w-12"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-bold text-brand-red sm:text-[17px] lg:text-[19px]">
              முத்தமிழறிஞர் பதிப்பகம்
            </span>
            <span className="hidden truncate text-[11.5px] font-medium tracking-wide text-black/60 sm:block">
              Muthamilarignar Pathipagam
            </span>
          </span>
        </Link>

        <nav aria-label={t("முதன்மை வழிசெலுத்தல்", "Primary")} className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={`${home}${item.path}`}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors ${
                  active ? "text-brand-red" : "text-black/75 hover:text-brand-red"
                }`}
              >
                <T ta={item.ta} en={item.en} />
                {active && <span className="absolute inset-x-3.5 -bottom-[17px] h-[3px] rounded-full bg-brand-red" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <Link
            href={`${home}/cart`}
            aria-label={
              cartCount > 0
                ? t(`கூடை — ${countLabel} பொருட்கள்`, `Cart — ${countLabel} items`)
                : t("கூடை", "Cart")
            }
            aria-current={cartActive ? "page" : undefined}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
              cartActive
                ? "border-brand-red bg-brand-red-light text-brand-red"
                : "border-black/10 text-black hover:border-brand-red hover:text-brand-red"
            }`}
          >
            <CartIcon className="h-[22px] w-[22px]" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
              >
                {countLabel}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile / tablet nav: one swipeable row, no JS menu */}
      <nav
        aria-label={t("முதன்மை வழிசெலுத்தல்", "Primary")}
        className="no-scrollbar flex snap-x gap-1 overflow-x-auto border-t border-black/[0.06] px-3 py-1.5 lg:hidden"
      >
        {NAV.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={`${home}${item.path}`}
              aria-current={active ? "page" : undefined}
              className={`snap-start whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13.5px] font-medium ${
                active ? "bg-brand-red text-white" : "text-black/75"
              }`}
            >
              <T ta={item.ta} en={item.en} />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}