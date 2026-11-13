"use client";

import { toast } from "@/components/toaster";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/img";
import PenLoader from "@/components/ui/pen-loader";
import FreeShippingBar from "@/components/cart/free-shipping-bar";
import { storefrontApi } from "@/lib/api";
import { notifyCartChanged } from "@/lib/cart-events";
import { useLanguage } from "@/components/language-provider";
import { cloudinaryImageUrl } from "@/lib/site-defaults";

export default function CartPage({ params }: { params: { tenant: string } }) {
  const { t, localizeName } = useLanguage();
  const [cart, setCart] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: number;
    discount_cents: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const couponStorageKey = `store_applied_coupon_${params.tenant}`;

  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storefrontApi.getCart(params.tenant);
      const c = data?.cart || data?.data || data;
      setCart(c);
      const list = c?.items || c?.cart_items || data?.items || [];
      setItems(list);
      const sub =
        c?.total_cents ??
        list.reduce(
          (sum: number, it: any) =>
            sum +
            (it.line_total_cents ??
              (it.unit_price_cents ?? it.price_cents ?? 0) * (it.quantity ?? 1)),
          0,
        );
      if (typeof window !== "undefined" && sub > 0) {
        try {
          const savedRaw = localStorage.getItem(couponStorageKey);
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (saved?.code) {
              const verified = await storefrontApi.validateCoupon(params.tenant, saved.code, sub);
              const nextCoupon = {
                code: verified.code,
                type: verified.type,
                value: verified.value,
                discount_cents: verified.discount_cents ?? 0,
              };
              setAppliedCoupon(nextCoupon);
              setCouponInput(verified.code);
              localStorage.setItem(couponStorageKey, JSON.stringify(nextCoupon));
            }
          }
        } catch {
          setAppliedCoupon(null);
          try {
            localStorage.removeItem(couponStorageKey);
          } catch {}
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant]);

  const handleApplyCoupon = async (subtotalCents: number) => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) {
      setCouponError(t("கூப்பன் குறியீட்டை உள்ளிடவும்", "Please enter a coupon code"));
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await storefrontApi.validateCoupon(params.tenant, clean, subtotalCents);
      const nextCoupon = {
        code: res.code,
        type: res.type,
        value: res.value,
        discount_cents: res.discount_cents ?? 0,
      };
      setAppliedCoupon(nextCoupon);
      setCouponInput(res.code);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(couponStorageKey, JSON.stringify(nextCoupon));
        } catch {}
      }
    } catch (e: any) {
      setAppliedCoupon(null);
      setCouponError(e?.message || t("தவறான கூப்பன்", "Invalid coupon code"));
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(couponStorageKey);
        } catch {}
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(couponStorageKey);
      } catch {}
    }
  };

  const updateQty = async (itemId: string, qty: number) => {
    if (qty < 1) return;
    setUpdating(itemId);
    try {
      await storefrontApi.updateCartItem(params.tenant, itemId, qty);
      await fetchCart();
      notifyCartChanged(params.tenant);
    } catch (e: any) {
      toast({
        kind: "error",
        title: t("பிழை ஏற்பட்டது", "Something went wrong"),
        description: e.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await storefrontApi.removeCartItem(params.tenant, itemId);
      await fetchCart();
      notifyCartChanged(params.tenant);
    } catch (e: any) {
      toast({
        kind: "error",
        title: t("பிழை ஏற்பட்டது", "Something went wrong"),
        description: e.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  const isInitialLoading = loading && items.length === 0;
  const isEmpty = !isInitialLoading && (!cart || items.length === 0);
  const total =
    cart?.total_cents ??
    items.reduce(
      (sum: number, it: any) =>
        sum +
        (it.line_total_cents ??
          (it.unit_price_cents ?? it.price_cents ?? 0) * (it.quantity ?? 1)),
      0,
    );
  const discountCents = appliedCoupon ? Math.min(appliedCoupon.discount_cents || 0, total) : 0;
  const finalTotal = Math.max(total - discountCents, 0);
  const itemCount = items.reduce(
    (sum: number, it: any) => sum + (it.quantity ?? 1),
    0,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-8">
        <p className="eyebrow">
          {t("உங்கள் புத்தகக் கூடை", "Your Book Cart")}
        </p>
        <h1 className="mt-2 text-[32px] sm:text-[42px] font-extrabold tracking-tight text-black">
          {isInitialLoading
            ? t("உங்கள் புத்தகக் கூடை", "Your Book Cart")
            : isEmpty
              ? t("உங்கள் கூடை காலியாக உள்ளது.", "Your cart is empty.")
              : t(
                  `கூடை — ${itemCount} நூல்கள்`,
                  `Cart — ${itemCount} book${itemCount === 1 ? "" : "s"}.`,
                )}
        </h1>
        <div aria-hidden="true" className="mt-3 h-1 w-14 rounded-full bg-brand-red" />
        {!isInitialLoading && !isEmpty && (
          <p className="mt-3 text-[15px] text-black/70">
            {t(
              "ஆர்டரை உறுதி செய்யும் முன் தேர்ந்தெடுத்த நூல்களைச் சரிபார்க்கவும்.",
              "Review your selected books before checkout.",
            )}
          </p>
        )}
      </header>

      {error ? (
        <div className="rounded-2xl border border-brand-red/25 bg-brand-red-light py-16 px-6 text-center text-[14px] font-medium text-brand-red-dark">
          {error}
        </div>
      ) : isInitialLoading ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-[#FAFAFA] py-20 px-6 flex flex-col items-center justify-center gap-3 text-center text-[15px] text-black/70">
          <PenLoader size="lg" label={t("உங்கள் கூடை ஏற்றப்படுகிறது", "Loading your cart")} />
          <span>{t("உங்கள் கூடை ஏற்றப்படுகிறது…", "Loading your cart…")}</span>
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-[#FAFAFA] py-20 px-6 text-center">
          <p className="text-[15.5px] font-medium text-black/75">
            {t(
              "நீங்கள் தேர்ந்தெடுக்கும் நூல்கள் இங்கே தோன்றும்.",
              "Once you add books, they'll appear here.",
            )}
          </p>
          <Link
            href={`/${params.tenant}/products`}
            className="btn-red mt-6 h-12 px-7 text-[14.5px]"
          >
            {t("நூல்களைப் பார்வையிடுக", "Browse Books")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items + Free-Shipping Progress */}
          <div className="lg:col-span-2 space-y-6">
            <FreeShippingBar subtotalCents={finalTotal} />

            <div className="rounded-2xl border border-black/[0.08] bg-white px-5 divide-y divide-black/[0.08] shadow-card">
              {items.map((it: any) => {
                const rawName =
                  it.name || it.product?.name || it.product_name || "Book";
                const rawImg =
                  it.image_url || it.product?.image_url || it.product?.images?.[0] || null;
                const coverSrc = rawImg ? cloudinaryImageUrl(rawImg, 900) : null;
                const unitPrice =
                  it.unit_price_cents ??
                  it.price_cents ??
                  it.product?.sale_price_cents ??
                  it.product?.price_cents ??
                  0;
                const lineTotalCents =
                  it.line_total_cents ?? unitPrice * (it.quantity ?? 1);
                const maxStock = it.stock ?? it.inventory_quantity;

                return (
                  <div key={it.id} className="flex gap-4 py-6">
                    <Link
                      href={`/${params.tenant}/products/${it.product_id}`}
                      className="relative flex-shrink-0 w-20 h-28 sm:w-24 sm:h-32 rounded-xl bg-[#FAFAFA] overflow-hidden border border-black/[0.08]"
                    >
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt={localizeName(rawName)}
                          fill
                          sizes="96px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-black/55">
                          {t("படம் இல்லை", "No cover")}
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${params.tenant}/products/${it.product_id}`}
                        className="text-[15.5px] font-bold text-black hover:text-brand-red-dark hover:underline block"
                      >
                        {localizeName(rawName)}
                      </Link>
                      <p className="mt-1 text-[13px] text-black/70">
                        ₹{(unitPrice / 100).toFixed(2)} {t("/ பிரதி", "each")}
                      </p>

                      {/* >=44px Quantity Stepper + Remove */}
                      <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center rounded-full border border-black/20 bg-white">
                          <button
                            type="button"
                            disabled={!!updating}
                            onClick={() => updateQty(it.id, (it.quantity || 1) - 1)}
                            aria-label="Decrease quantity"
                            className="w-11 h-11 rounded-l-full text-sm font-bold text-black disabled:opacity-40 hover:bg-black/5"
                          >
                            −
                          </button>
                          <span className="text-[14.5px] font-bold w-8 text-center text-black">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={!!updating || (typeof maxStock === "number" && it.quantity >= maxStock)}
                            onClick={() => updateQty(it.id, (it.quantity || 1) + 1)}
                            aria-label="Increase quantity"
                            className="w-11 h-11 rounded-r-full text-sm font-bold text-black disabled:opacity-40 hover:bg-black/5"
                          >
                            +
                          </button>
                        </div>

                        {updating === it.id && (
                          <PenLoader size="sm" label={t("புதுப்பிக்கப்படுகிறது", "Updating cart")} />
                        )}

                        <button
                          type="button"
                          disabled={!!updating}
                          onClick={() => removeItem(it.id)}
                          className="inline-flex min-h-[44px] items-center px-3 text-[13px] font-semibold text-black/70 hover:text-brand-red-dark hover:underline disabled:opacity-40"
                        >
                          {t("நீக்குக", "Remove")}
                        </button>
                      </div>
                    </div>

                    <p className="text-[18px] font-extrabold text-brand-red whitespace-nowrap">
                      ₹{(lineTotalCents / 100).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <aside className="rounded-2xl bg-[#FAFAFA] border border-black/10 p-6 h-fit lg:sticky lg:top-24 shadow-card">
            <h2 className="text-[17px] font-extrabold text-black">
              {t("ஆர்டர் சுருக்கம்", "Order Summary")}
            </h2>

            {/* Coupon Box */}
            <div className="mt-4 pb-4 border-b border-black/10">
              <label htmlFor="cart-coupon-input" className="block text-[12.5px] font-bold text-black/80 mb-1.5">
                {t("தள்ளுபடி கூப்பன்", "Coupon Code")}
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3.5 py-2.5 text-[13px]">
                  <div>
                    <span className="font-bold text-green-900">{appliedCoupon.code}</span>
                    <span className="ml-2 text-green-800">
                      {appliedCoupon.type === "free_shipping"
                        ? t("இலவச அஞ்சல்", "Free shipping")
                        : `−₹${(discountCents / 100).toFixed(2)}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="min-h-[36px] px-2 text-[12.5px] font-bold text-brand-red-dark hover:underline"
                  >
                    {t("நீக்கு", "Remove")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    id="cart-coupon-input"
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      if (couponError) setCouponError(null);
                    }}
                    placeholder={t("குறியீடு (எ.கா. SAVE10)", "Enter coupon code")}
                    className="flex-1 h-11 px-4 rounded-full border border-black/20 bg-white text-[13px] text-black uppercase placeholder:normal-case placeholder:text-black/55 focus:border-brand-red focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={couponLoading}
                    onClick={() => handleApplyCoupon(total)}
                    className="h-11 px-5 rounded-full bg-black text-white text-[13px] font-bold hover:bg-brand-red-dark disabled:opacity-50 inline-flex items-center justify-center"
                  >
                    {couponLoading ? (
                      <PenLoader size="sm" tone="light" label={t("சரிபார்க்கப்படுகிறது", "Applying coupon")} />
                    ) : (
                      t("பயன்படுத்து", "Apply")
                    )}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="mt-1.5 text-[12.5px] font-semibold text-brand-red-dark">{couponError}</p>
              )}
            </div>

            <div className="mt-4 space-y-2.5 text-[14px]">
              <div className="flex justify-between text-black/75">
                <span>{t("நூல்களின் விலை", "Subtotal")}</span>
                <span className="font-semibold text-black">₹{(total / 100).toFixed(2)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-green-800 font-semibold">
                  <span>
                    {t("கூப்பன் தள்ளுபடி", "Discount")} ({appliedCoupon?.code})
                  </span>
                  <span>−₹{(discountCents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-black/75">
                <span>{t("அஞ்சல் / கூரியர் கட்டணம்", "Shipping")}</span>
                <span className="font-semibold text-black/75">
                  {appliedCoupon?.type === "free_shipping" || finalTotal >= 50000
                    ? t("இலவசம் (₹0)", "FREE (₹0)")
                    : t("அடுத்தப் பக்கத்தில்", "Calculated at checkout")}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-black/10 flex justify-between text-[18px] font-extrabold text-black">
              <span>{t("மொத்தத் தொகை", "Total")}</span>
              <span className="text-brand-red">₹{(finalTotal / 100).toFixed(2)}</span>
            </div>
            <Link
              href={`/${params.tenant}/checkout`}
              className="btn-red mt-6 h-12 w-full text-[14.5px] font-bold shadow-glow"
            >
              {t("ஆர்டர் செய்யத் தொடர்க →", "Proceed to Checkout →")}
            </Link>
            <Link
              href={`/${params.tenant}/products`}
              className="btn-outline mt-3 h-11 w-full text-[14px] font-semibold"
            >
              {t("மேலும் நூல்களைத் தேர்ந்தெடுக்க", "Continue Shopping")}
            </Link>
            <p className="mt-4 text-[12px] text-black/70 text-center">
              {t(
                "பாதுகாப்பான கட்டணம் · ஆன்லைன் அல்லது COD வசதி.",
                "Secure checkout · Online payment or COD.",
              )}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}