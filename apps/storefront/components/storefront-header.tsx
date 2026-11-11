"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LanguageToggle from "./language-toggle";
import { useLanguage } from "./language-provider";
import { CART_COUNT_KEY, readFromStorage } from "@/lib/cart-events";

/**
 * Storefront chrome (top bar) — Muthamilarignar Pathipagam Bookstore Header.
 *
 *  - Publisher logo (/logo.jpg) + bilingual brand title.
 *  - Bilingual navigation (முகப்பு / Home, நூல்கள் / Books, ஆர்டர்கள் / Orders, கணக்கு / Account).
 *  - Prominent Tamil / English toggle button (தமிழ் | English).
 *  - Cart icon with live count badge.
 */
export default function StorefrontHeader({
  tenant,
  storeName,
  logoUrl,
}: {
  tenant: string;
  storeName?: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname() || `/${tenant}`;
  const onHome = pathname === `/${tenant}` || pathname === `/${tenant}/`;
  const [cartCount, setCartCount] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    setCartCount(readFromStorage().count);
    const onChange = () => setCartCount(readFromStorage().count);
    window.addEventListener("infalette-cart-changed", onChange);
    window.addEventListener("storage", (e) => {
      if (e.key === CART_COUNT_KEY) onChange();
    });
    return () => window.removeEventListener("infalette-cart-changed", onChange);
  }, []);

  const handleBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) router.back();
    else router.push(`/${tenant}`);
  };

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (pathname === `/${tenant}` || pathname === `/${tenant}/`) return false;
    return pathname.startsWith(href + "/") || pathname.startsWith(href);
  };

  const linkBase =
    "relative inline-flex h-16 items-center text-[13.5px] transition-colors whitespace-nowrap";
  const linkColor = "text-gray-700";
  const linkColorActive = "text-red-600 font-semibold";
  const linkHover = "hover:text-red-600";
  const underline =
    "after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-red-600 after:rounded-full";

  const resolvedLogo = logoUrl || "/logo.jpg";
  const displayTitle = t(
    "முத்தமிழறிஞர் பதிப்பகம்",
    storeName || "Muthamilarignar Pathipagam",
  );
  const displaySubtitle = t(
    "Muthamilarignar Pathipagam",
    "முத்தமிழறிஞர் பதிப்பகம்",
  );

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-white/90 border-b border-gray-200/80">
      {/* Top Black & Red Dravidian accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-black via-red-600 to-black" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        {/* Back / Brand logo & wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          {!onHome && (
            <button
              type="button"
              onClick={handleBack}
              aria-label={t("பின்செல்", "Go back")}
              title={t("பின்செல்", "Go back")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <Link
            href={`/${tenant}`}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedLogo}
              alt="Muthamilarignar Pathipagam Logo"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg object-contain bg-white border border-gray-200 p-0.5 flex-shrink-0 shadow-sm"
            />
            <div className="min-w-0">
              <p className="text-[14px] sm:text-[16px] font-bold tracking-tight text-gray-900 truncate group-hover:text-red-600 transition-colors">
                {displayTitle}
              </p>
              <p className="text-[11px] text-gray-500 truncate hidden sm:block">
                {displaySubtitle}
              </p>
            </div>
          </Link>
        </div>

        {/* Primary nav (desktop) */}
        <nav className="hidden lg:flex items-center gap-6 ml-6">
          <Link
            href={`/${tenant}`}
            aria-current={onHome ? "page" : undefined}
            className={`${linkBase} ${
              onHome ? `${linkColorActive} ${underline}` : `${linkColor} ${linkHover}`
            }`}
          >
            {t("முகப்பு", "Home")}
          </Link>
          <Link
            href={`/${tenant}/products`}
            aria-current={isActive(`/${tenant}/products`) ? "page" : undefined}
            className={`${linkBase} ${
              isActive(`/${tenant}/products`)
                ? `${linkColorActive} ${underline}`
                : `${linkColor} ${linkHover}`
            }`}
          >
            {t("நூல்கள் (27)", "Books (27)")}
          </Link>
          <Link
            href={`/${tenant}/orders`}
            aria-current={isActive(`/${tenant}/orders`) ? "page" : undefined}
            className={`${linkBase} ${
              isActive(`/${tenant}/orders`)
                ? `${linkColorActive} ${underline}`
                : `${linkColor} ${linkHover}`
            }`}
          >
            {t("ஆர்டர்கள்", "Orders")}
          </Link>
          <Link
            href={`/${tenant}/track`}
            aria-current={isActive(`/${tenant}/track`) ? "page" : undefined}
            className={`${linkBase} ${
              isActive(`/${tenant}/track`)
                ? `${linkColorActive} ${underline}`
                : `${linkColor} ${linkHover}`
            }`}
          >
            {t("ஆர்டர் நிலை", "Track Order")}
          </Link>
          <Link
            href={`/${tenant}/account`}
            aria-current={isActive(`/${tenant}/account`) ? "page" : undefined}
            className={`${linkBase} ${
              isActive(`/${tenant}/account`)
                ? `${linkColorActive} ${underline}`
                : `${linkColor} ${linkHover}`
            }`}
          >
            {t("கணக்கு", "Account")}
          </Link>
        </nav>

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <Link
            href={`/${tenant}/cart`}
            aria-label={t("கூடை", "Cart")}
            title={t("கூடை", "Cart")}
            aria-current={isActive(`/${tenant}/cart`) ? "page" : undefined}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              isActive(`/${tenant}/cart`)
                ? "bg-red-50 text-red-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="17" cy="20" r="1.5" />
              <path d="M3 4h2l2.4 9.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.5L21 8H6" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold bg-red-600 text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Secondary Nav Bar */}
      <div className="flex lg:hidden items-center justify-around border-t border-gray-100 px-3 py-2 text-[12px] font-medium bg-gray-50/70">
        <Link
          href={`/${tenant}`}
          className={onHome ? "text-red-600 font-semibold" : "text-gray-600"}
        >
          {t("முகப்பு", "Home")}
        </Link>
        <Link
          href={`/${tenant}/products`}
          className={
            isActive(`/${tenant}/products`)
              ? "text-red-600 font-semibold"
              : "text-gray-600"
          }
        >
          {t("நூல்கள்", "Books")}
        </Link>
        <Link
          href={`/${tenant}/orders`}
          className={
            isActive(`/${tenant}/orders`)
              ? "text-red-600 font-semibold"
              : "text-gray-600"
          }
        >
          {t("ஆர்டர்கள்", "Orders")}
        </Link>
        <Link
          href={`/${tenant}/account`}
          className={
            isActive(`/${tenant}/account`)
              ? "text-red-600 font-semibold"
              : "text-gray-600"
          }
        >
          {t("கணக்கு", "Account")}
        </Link>
      </div>
    </header>
  );
}