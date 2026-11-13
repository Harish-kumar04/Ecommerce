"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import { notifyCartChanged } from "@/lib/cart-events";
import { useLanguage } from "@/components/language-provider";
import Sunburst from "@/components/brand/sunburst";
import { CartIcon, CloseIcon } from "@/components/brand/icons";
import Img from "@/components/ui/img";
import PenLoader from "@/components/ui/pen-loader";
import FreeShippingBar from "@/components/cart/free-shipping-bar";
import { cloudinaryImageUrl } from "@/lib/site-defaults";
import { toast } from "@/components/toaster";

interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string | null;
  name?: string | null;
  slug?: string | null;
  price_cents?: number;
  unit_price_cents?: number;
  original_price_cents?: number;
  sale_price_cents?: number | null;
  line_total_cents?: number;
  quantity: number;
  image_url?: string | null;
  stock?: number | null;
  inventory_quantity?: number | null;
  product?: {
    name?: string;
    price_cents?: number;
    sale_price_cents?: number | null;
    image_url?: string;
    images?: string[];
  };
}

interface AppliedCoupon {
  code: string;
  type: string;
  value: number;
  discount_cents: number;
}

function itemUnitPriceCents(item: CartItem): number {
  return (
    item.unit_price_cents ??
    item.price_cents ??
    item.product?.sale_price_cents ??
    item.product?.price_cents ??
    0
  );
}

function formatRupees(cents: number): string {
  const rs = (cents || 0) / 100;
  return `₹${rs.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rs) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function MiniCart({
  tenant,
  initialOpen = false,
}: {
  tenant: string;
  initialOpen?: boolean;
}) {
  const { t, localizeName, localizeSubName } = useLanguage();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cart, setCart] = useState<any>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const couponStorageKey = `store_applied_coupon_${tenant}`;

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await storefrontApi.getCart(tenant);
      const cartObj = res?.cart || res?.data || res;
      setCart(cartObj);
      const nextItems = Array.isArray(cartObj?.items) ? cartObj.items : [];
      setItems(nextItems);

      if (typeof window !== "undefined") {
        try {
          const savedRaw = localStorage.getItem(couponStorageKey);
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (saved?.code) {
              setCouponInput(saved.code);
              setAppliedCoupon(saved);
            }
          } else {
            setAppliedCoupon(null);
          }
        } catch {}
      }
    } catch {
      setCart(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenant, couponStorageKey]);

  useEffect(() => {
    if (initialOpen) {
      void fetchCart();
    }
  }, [initialOpen, fetchCart]);

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
    setUpdatingId(itemId);
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              quantity: newQty,
              line_total_cents: itemUnitPriceCents(it) * newQty,
            }
          : it,
      ),
    );
    try {
      await storefrontApi.updateCartItem(tenant, itemId, newQty);
      notifyCartChanged(tenant);
      await fetchCart();
    } catch (err: any) {
      toast({
        kind: "error",
        title: t("பிழை ஏற்பட்டது", "Could not update quantity"),
        description: err?.message || t("மீண்டும் முயற்சிக்கவும்", "Please try again"),
      });
      await fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdatingId(itemId);
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    try {
      await storefrontApi.removeCartItem(tenant, itemId);
      notifyCartChanged(tenant);
      await fetchCart();
    } catch (err: any) {
      toast({
        kind: "error",
        title: t("பிழை ஏற்பட்டது", "Could not remove item"),
        description: err?.message || t("மீண்டும் முயற்சிக்கவும்", "Please try again"),
      });
      await fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const computedItemsTotal = items.reduce(
    (acc, it) => acc + (it.line_total_cents ?? itemUnitPriceCents(it) * it.quantity),
    0,
  );
  const subtotalCents =
    typeof cart?.total_cents === "number" && cart.total_cents > 0
      ? cart.total_cents
      : computedItemsTotal;

  const discountCents = appliedCoupon
    ? Math.min(appliedCoupon.discount_cents || 0, subtotalCents)
    : 0;
  const netSubtotalCents = Math.max(0, subtotalCents - discountCents);

  const handleApplyCoupon = async () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) {
      setCouponError(t("கூப்பன் குறியீட்டை உள்ளிடவும்", "Enter a coupon code"));
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await storefrontApi.validateCoupon(tenant, clean, subtotalCents);
      const next: AppliedCoupon = {
        code: res.code,
        type: res.type,
        value: res.value,
        discount_cents: res.discount_cents ?? 0,
      };
      setAppliedCoupon(next);
      setCouponInput(res.code);
      try {
        localStorage.setItem(couponStorageKey, JSON.stringify(next));
      } catch {}
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.message || t("தவறான கூப்பன்", "Invalid coupon code"));
      try {
        localStorage.removeItem(couponStorageKey);
      } catch {}
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    try {
      localStorage.removeItem(couponStorageKey);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 transition-opacity"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("உங்கள் கூடை", "Shopping cart")}
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CartIcon className="h-5 w-5 text-brand-red" />
            <h2 className="text-[17px] font-bold text-black">
              {t("கூடை", "Cart")}
              {items.length > 0 && (
                <span className="ml-2 text-[13px] font-normal text-black/65">
                  ({items.reduce((s, i) => s + i.quantity, 0)} {t("நூல்கள்", "books")})
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-black/70 hover:bg-black/5 hover:text-black transition-colors"
            aria-label="Close cart"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Free-Shipping Progress Bar */}
        {items.length > 0 && (
          <div className="border-b border-black/[0.06] px-5 py-3">
            <FreeShippingBar subtotalCents={netSubtotalCents} />
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && items.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center gap-3 text-sm text-black/70">
              <PenLoader size="md" label={t("கூடை ஏற்றப்படுகிறது", "Loading cart")} />
              <span>{t("கூடை ஏற்றப்படுகிறது…", "Loading cart…")}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sunburst className="h-16 w-32 text-brand-red/15" />
              <p className="mt-4 text-[16px] font-bold text-black">
                {t("கூடை காலியாக உள்ளது", "Your cart is empty")}
              </p>
              <p className="mt-1 text-[13px] text-black/65">
                {t("நூல்களைத் தேர்வு செய்து கூடையில் சேர்க்கவும்", "Explore our books and add them to your cart")}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-red mt-6 h-11 px-6 text-[13.5px]"
              >
                {t("நூல்களைக் காண்க", "Browse books")}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] space-y-4">
              {items.map((item) => {
                const name = item.name || item.product?.name || "Book";
                const rawImg =
                  item.image_url || item.product?.image_url || item.product?.images?.[0] || null;
                const img = rawImg ? cloudinaryImageUrl(rawImg, 900) : null;
                const unitPrice = itemUnitPriceCents(item);
                const lineTotalCents = item.line_total_cents ?? unitPrice * item.quantity;
                const maxStock = item.stock ?? item.inventory_quantity;
                const atMaxStock = typeof maxStock === "number" && item.quantity >= maxStock;
                const isItemUpdating = updatingId === item.id;

                return (
                  <div key={item.id} className="flex gap-3.5 pt-4 first:pt-0">
                    <Link
                      href={`/${tenant}/products/${item.product_id}`}
                      onClick={() => setIsOpen(false)}
                      className="relative h-24 w-18 flex-shrink-0 overflow-hidden rounded-lg bg-[#FAFAFA] border border-black/[0.08]"
                    >
                      {img ? (
                        <Img
                          src={img}
                          alt={localizeName(name)}
                          fill
                          sizes="72px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-black/55">
                          {t("படம் இல்லை", "No cover")}
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/${tenant}/products/${item.product_id}`}
                            onClick={() => setIsOpen(false)}
                            className="line-clamp-2 text-[14px] font-bold text-black hover:text-brand-red-dark transition-colors"
                          >
                            {localizeName(name)}
                          </Link>
                          <p className="line-clamp-1 text-[12px] text-black/65">
                            {localizeSubName(name)}
                          </p>
                          <p className="mt-0.5 text-[12px] text-black/70">
                            {formatRupees(unitPrice)} {t("/ பிரதி", "each")}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isItemUpdating}
                          onClick={() => removeItem(item.id)}
                          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[18px] text-black/55 hover:bg-black/5 hover:text-brand-red-dark disabled:opacity-40 transition-colors"
                          aria-label={`Remove ${localizeName(name)}`}
                        >
                          ×
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/* >=44px Quantity Stepper */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-full border border-black/20 bg-white text-sm">
                            <button
                              type="button"
                              disabled={isItemUpdating}
                              onClick={() => updateQty(item.id, item.quantity - 1)}
                              className="h-11 w-11 rounded-l-full font-bold text-black hover:bg-black/5 disabled:opacity-40 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              –
                            </button>
                            <span className="w-8 text-center font-bold text-black">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={atMaxStock || isItemUpdating}
                              onClick={() => updateQty(item.id, item.quantity + 1)}
                              className="h-11 w-11 rounded-r-full font-bold text-black hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          {isItemUpdating && (
                            <PenLoader size="sm" label={t("புதுப்பிக்கப்படுகிறது", "Updating cart")} />
                          )}
                        </div>

                        <span className="text-[16px] font-extrabold text-brand-red">
                          {formatRupees(lineTotalCents)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Coupon Box & Totals */}
        {items.length > 0 && (
          <div className="border-t border-black/10 bg-white p-5 space-y-3">
            {/* Drawer Coupon Box */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-[12.5px]">
                  <div>
                    <span className="font-bold text-green-900">{appliedCoupon.code}</span>
                    <span className="ml-2 text-green-800">
                      {appliedCoupon.type === "free_shipping"
                        ? t("இலவச அஞ்சல்", "Free shipping")
                        : `−${formatRupees(discountCents)}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="min-h-[36px] px-2 font-bold text-brand-red-dark hover:underline"
                  >
                    {t("நீக்கு", "Remove")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label htmlFor="minicart-coupon" className="sr-only">
                    {t("கூப்பன் குறியீடு", "Coupon code")}
                  </label>
                  <input
                    id="minicart-coupon"
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      if (couponError) setCouponError(null);
                    }}
                    placeholder={t("கூப்பன் குறியீடு", "Coupon code")}
                    className="h-11 flex-1 rounded-full border border-black/20 bg-[#FAFAFA] px-4 text-[13px] text-black uppercase placeholder:normal-case placeholder:text-black/55 focus:border-brand-red focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={couponLoading}
                    onClick={handleApplyCoupon}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-black px-4 text-[12.5px] font-bold text-white hover:bg-brand-red-dark disabled:opacity-60"
                  >
                    {couponLoading ? (
                      <PenLoader size="sm" tone="light" label="Applying" />
                    ) : (
                      t("பயன்படுத்து", "Apply")
                    )}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="mt-1 text-[12px] font-semibold text-brand-red-dark">{couponError}</p>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-[14px] font-semibold text-black/80">
                {t("மொத்தத் தொகை", "Subtotal")}
              </span>
              <span className="text-[22px] font-extrabold text-brand-red">
                {formatRupees(netSubtotalCents)}
              </span>
            </div>
            <p className="text-[11.5px] text-black/65">
              {t("வரி மற்றும் விநியோகக் கட்டணம் கணக்கிடப்படும்", "Taxes and shipping calculated at checkout")}
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                href={`/${tenant}/cart`}
                onClick={() => setIsOpen(false)}
                className="btn-outline h-11 px-3 text-[13px] font-bold"
              >
                {t("கூடையைக் காண்க", "View cart")}
              </Link>
              <Link
                href={`/${tenant}/checkout`}
                onClick={() => setIsOpen(false)}
                className="btn-red h-11 px-3 text-[13.5px] font-bold"
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
