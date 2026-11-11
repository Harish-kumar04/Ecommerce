"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import { notifyCartChanged, closeMiniCart } from "@/lib/cart-events";
import { splitBilingual } from "@/lib/i18n";
import { useLanguage } from "@/components/language-provider";
import Sunburst from "@/components/brand/sunburst";
import { CartIcon, CloseIcon } from "@/components/brand/icons";
import Img from "@/components/ui/img";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    name?: string;
    price_cents?: number;
    sale_price_cents?: number | null;
    image_url?: string;
    images?: string[];
  };
}

export default function MiniCart({ tenant }: { tenant: string }) {
  const { t, localizeName, localizeSubName } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<any>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await storefrontApi.getCart(tenant);
      setCart(res);
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch {
      // offline / fallback
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      void fetchCart();
    };
    const handleClose = () => setIsOpen(false);
    const handleCartChanged = () => {
      if (isOpen) void fetchCart();
    };

    window.addEventListener("infalette-open-mini-cart", handleOpen);
    window.addEventListener("infalette-close-mini-cart", handleClose);
    window.addEventListener("infalette-cart-changed", handleCartChanged);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("infalette-open-mini-cart", handleOpen);
      window.removeEventListener("infalette-close-mini-cart", handleClose);
      window.removeEventListener("infalette-cart-changed", handleCartChanged);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fetchCart, isOpen]);

  const updateQty = async (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      await removeItem(itemId);
      return;
    }
    // Optimistic update
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, quantity: newQty } : it))
    );
    try {
      await storefrontApi.updateCartItem(tenant, itemId, newQty);
      notifyCartChanged(tenant);
      void fetchCart();
    } catch {
      void fetchCart();
    }
  };

  const removeItem = async (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    try {
      await storefrontApi.removeCartItem(tenant, itemId);
      notifyCartChanged(tenant);
      void fetchCart();
    } catch {
      void fetchCart();
    }
  };

  const subtotalCents = items.reduce((acc, it) => {
    const price = it.product?.sale_price_cents ?? it.product?.price_cents ?? 0;
    return acc + price * it.quantity;
  }, 0);

  const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Mini Cart">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <CartIcon className="h-5 w-5 text-brand-red" />
            <h2 className="text-[17px] font-bold text-black">
              {t("கூடை", "Cart")}
              {items.length > 0 && (
                <span className="ml-2 text-[13px] font-normal text-black/50">
                  ({items.reduce((s, i) => s + i.quantity, 0)} {t("நூல்கள்", "books")})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-black/60 hover:bg-black/5 hover:text-black transition-colors"
            aria-label="Close cart"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && items.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-black/40">
              {t("ஏற்றுகிறது…", "Loading cart…")}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sunburst className="h-16 w-32 text-brand-red/15" />
              <p className="mt-4 text-[16px] font-bold text-black">
                {t("கூடை காலியாக உள்ளது", "Your cart is empty")}
              </p>
              <p className="mt-1 text-[13px] text-black/50">
                {t("நூல்களைத் தேர்வு செய்து கூடையில் சேர்க்கவும்", "Explore our books and add them to your cart")}
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-red mt-6 h-10 px-6 text-[13.5px]"
              >
                {t("நூல்களைக் காண்க", "Browse books")}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] space-y-4">
              {items.map((item) => {
                const name = item.product?.name || "Book";
                const img = item.product?.images?.[0] || item.product?.image_url;
                const price = item.product?.sale_price_cents ?? item.product?.price_cents ?? 0;
                return (
                  <div key={item.id} className="flex gap-4 pt-4 first:pt-0">
                    <div className="relative h-24 w-18 flex-shrink-0 overflow-hidden rounded-lg bg-[#fafafa] border border-black/[0.06]">
                      {img ? (
                        <Img
                          src={img}
                          alt={name}
                          fill
                          sizes="72px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-black/40">
                          {t("படம் இல்லை", "No cover")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h4 className="line-clamp-2 text-[14px] font-semibold text-black">
                          {localizeName(name)}
                        </h4>
                        <p className="line-clamp-1 text-[12px] text-black/50">
                          {localizeSubName(name)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-black/15 bg-white text-xs">
                          <button
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="h-7 w-7 rounded-l-full font-bold hover:bg-black/5 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            –
                          </button>
                          <span className="w-8 text-center font-semibold text-black">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="h-7 w-7 rounded-r-full font-bold hover:bg-black/5 transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[15px] font-bold text-brand-red">
                            {rupees(price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-[12px] text-black/40 hover:text-brand-red transition-colors"
                            aria-label="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-black/10 bg-white p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-medium text-black/70">
                {t("மொத்தத் தொகை", "Subtotal")}
              </span>
              <span className="text-[20px] font-extrabold text-brand-red">
                {rupees(subtotalCents)}
              </span>
            </div>
            <p className="text-[11px] text-black/50">
              {t("வரி மற்றும் விநியோகக் கட்டணம் கணக்கிடப்படும்", "Taxes and shipping calculated at checkout")}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="btn-outline h-11 text-[13px] font-medium"
              >
                {t("மேலும் வாங்க", "Continue shopping")}
              </button>
              <Link
                href={`/${tenant}/checkout`}
                onClick={() => setIsOpen(false)}
                className="btn-red h-11 text-[13.5px] font-bold"
              >
                {t("பணம் செலுத்த", "Checkout")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
