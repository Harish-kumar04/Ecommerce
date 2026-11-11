"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { T } from "../i18n/t";
import { CartIcon } from "../brand/icons";
import { useLanguage } from "../language-provider";
import { CART_COUNT_KEY, readFromStorage, openMiniCart } from "@/lib/cart-events";

export interface NavItem {
  path: string;
  ta: string;
  en: string;
}

function useIsActive(tenant: string) {
  const pathname = usePathname() || `/${tenant}`;
  const home = `/${tenant}`;
  return (path: string) => {
    const href = `${home}${path}`;
    if (!path) return pathname === home || pathname === `${home}/`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

/** Primary nav links with active-route highlighting (desktop row or mobile swipe row). */
export function HeaderNav({ tenant, items, variant }: { tenant: string; items: NavItem[]; variant: "desktop" | "mobile" }) {
  const isActive = useIsActive(tenant);
  const { t } = useLanguage();
  const desktop = variant === "desktop";
  return (
    <nav
      aria-label={t("முதன்மை வழிசெலுத்தல்", "Primary")}
      className={
        desktop
          ? "ml-6 hidden items-center gap-1 lg:flex"
          : "no-scrollbar flex snap-x gap-1 overflow-x-auto border-t border-black/[0.06] px-3 py-1.5 lg:hidden"
      }
    >
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            href={`/${tenant}${item.path}`}
            aria-current={active ? "page" : undefined}
            className={
              desktop
                ? `relative rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors ${active ? "text-brand-red" : "text-black/75 hover:text-brand-red"}`
                : `snap-start whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13.5px] font-medium ${active ? "bg-brand-red text-white" : "text-black/75"}`
            }
          >
            <T ta={item.ta} en={item.en} />
            {desktop && active && (
              <span className="absolute inset-x-3.5 -bottom-[17px] h-[3px] rounded-full bg-brand-red" aria-hidden="true" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Cart icon with a live item-count badge. */
export function CartButton({ tenant }: { tenant: string }) {
  const isActive = useIsActive(tenant);
  const { t } = useLanguage();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readFromStorage().count);
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

  const active = isActive("/cart");
  const label = count > 99 ? "99+" : String(count);
  return (
    <button
      type="button"
      onClick={() => openMiniCart()}
      aria-label={count > 0 ? t(`கூடை — ${label} பொருட்கள்`, `Cart — ${label} items`) : t("கூடை", "Cart")}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
        active ? "border-brand-red bg-brand-red-light text-brand-red" : "border-black/10 text-black hover:border-brand-red hover:text-brand-red"
      }`}
    >
      <CartIcon className="h-[22px] w-[22px]" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
        >
          {label}
        </span>
      )}
    </button>
  );
}
