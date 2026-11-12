"use client";

import { toast } from "@/components/toaster";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/img";
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

  if (loading)
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center text-[15px] text-gray-500">
        {t("உங்கள் கூடை ஏற்றப்படுகிறது…", "Loading your cart…")}
      </div>
    );
  if (error)
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-[14px] text-brand-red">
        {error}
      </div>
    );

  const isEmpty = !cart || items.length === 0;
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
      <header className="mb-10">
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand-red">
          {t("உங்கள் புத்தகக் கூடை", "Your Book Cart")}
        </p>
        <h1 className="mt-2 text-[32px] sm:text-[42px] font-extrabold tracking-tight text-gray-900">
          {isEmpty
            ? t("உங்கள் கூடை காலியாக உள்ளது.", "Your cart is empty.")
            : t(
                `கூடை — ${itemCount} நூல்கள்`,
                `Cart — ${itemCount} book${itemCount === 1 ? "" : "s"}.`,
              )}
        </h1>
        {!isEmpty && (
          <p className="mt-2 text-[15px] text-gray-500">
            {t(
              "ஆர்டரை உறுதி செய்யும் முன் தேர்ந்தெடுத்த நூல்களைச் சரிபார்க்கவும்.",
              "Review your selected books before checkout.",
            )}
          </p>
        )}
      </header>

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 px-6 text-center">
          <p className="text-[15px] text-gray-500">
            {t(
              "நீங்கள் தேர்ந்தெடுக்கும் நூல்கள் இங்கே தோன்றும்.",
              "Once you add books, they'll appear here.",
            )}
          </p>
          <Link
            href={`/${params.tenant}/products`}
            className="mt-6 inline-flex h-11 px-6 items-center justify-center rounded-full bg-brand-red text-white text-[14px] font-semibold hover:bg-brand-red-dark transition-colors"
          >
            {t("நூல்களைப் பார்வையிடுக", "Browse Books")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 rounded-2xl bg-white divide-y divide-gray-100">
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
                <div key={it.id} className="flex gap-4 py-6 first:pt-0">
                  <Link
                    href={`/${params.tenant}/products/${it.product_id}`}
                    className="relative flex-shrink-0 w-20 h-28 sm:w-24 sm:h-32 rounded-xl bg-[#fafafa] overflow-hidden border border-black/[0.07]"
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
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        {t("படம் இல்லை", "No cover")}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${params.tenant}/products/${it.product_id}`}
                      className="text-[15px] font-bold text-gray-900 hover:text-brand-red hover:underline block"
                    >
                      {localizeName(rawName)}
                    </Link>
                    <p className="mt-1 text-[12px] text-gray-500">
                      ₹{(unitPrice / 100).toFixed(2)}{" "}
                      {t("/ பிரதி", "each")}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        disabled={!!updating}
                        onClick={() => updateQty(it.id, (it.quantity || 1) - 1)}
                        className="w-7 h-7 border border-gray-200 rounded-full text-sm disabled:opacity-40 hover:bg-gray-50"
                      >
                        −
                      </button>
                      <span className="text-[14px] font-semibold w-6 text-center">
                        {it.quantity}
                      </span>
                      <button
                        disabled={!!updating || (typeof maxStock === "number" && it.quantity >= maxStock)}
                        onClick={() => updateQty(it.id, (it.quantity || 1) + 1)}
                        className="w-7 h-7 border border-gray-200 rounded-full text-sm disabled:opacity-40 hover:bg-gray-50"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="ml-3 text-[12px] text-gray-500 hover:text-brand-red hover:underline"
                      >
                        {t("நீக்குக", "Remove")}
                      </button>
                    </div>
                  </div>
                  <p className="text-[15px] font-bold text-gray-900 whitespace-nowrap">
                    ₹{(lineTotalCents / 100).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <aside className="rounded-2xl bg-gray-50 border border-gray-200/70 p-6 h-fit lg:sticky lg:top-24">
            <h2 className="text-[16px] font-bold text-gray-900">
              {t("ஆர்டர் சுருக்கம்", "Order Summary")}
            </h2>

            {/* Coupon Box */}
            <div className="mt-4 pb-4 border-b border-gray-200">
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                {t("தள்ளுபடி கூப்பன்", "Coupon Code")}
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-[13px]">
                  <div>
                    <span className="font-bold text-green-800">{appliedCoupon.code}</span>
                    <span className="ml-2 text-green-700">
                      {appliedCoupon.type === "free_shipping"
                        ? t("இலவச அஞ்சல்", "Free shipping")
                        : `-₹${(discountCents / 100).toFixed(2)}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[12px] font-semibold text-brand-red hover:underline"
                  >
                    {t("நீக்கு", "Remove")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      if (couponError) setCouponError(null);
                    }}
                    placeholder={t("குறியீடு (எ.கா. SAVE10)", "Enter coupon code")}
                    className="flex-1 h-9 px-3 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-900 uppercase focus:border-brand-red focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={couponLoading}
                    onClick={() => handleApplyCoupon(total)}
                    className="h-9 px-3.5 rounded-lg bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-800 disabled:opacity-50"
                  >
                    {couponLoading ? "…" : t("பயன்படுத்து", "Apply")}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="mt-1.5 text-[12px] text-brand-red">{couponError}</p>
              )}
            </div>

            <div className="mt-4 space-y-2 text-[14px]">
              <div className="flex justify-between text-gray-600">
                <span>{t("நூல்களின் விலை", "Subtotal")}</span>
                <span>₹{(total / 100).toFixed(2)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-green-700 font-medium">
                  <span>
                    {t("கூப்பன் தள்ளுபடி", "Discount")} ({appliedCoupon?.code})
                  </span>
                  <span>−₹{(discountCents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>{t("அஞ்சல் / கூரியர் கட்டணம்", "Shipping")}</span>
                <span className="text-gray-500">
                  {appliedCoupon?.type === "free_shipping"
                    ? t("இலவசம்", "Free")
                    : t("அடுத்தப் பக்கத்தில்", "Calculated at checkout")}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-[16px] font-extrabold text-gray-900">
              <span>{t("மொத்தத் தொகை", "Total")}</span>
              <span>₹{(finalTotal / 100).toFixed(2)}</span>
            </div>
            <Link
              href={`/${params.tenant}/checkout`}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-brand-red text-white text-[14px] font-semibold hover:bg-brand-red-dark transition-colors"
            >
              {t("ஆர்டர் செய்யத் தொடர்க →", "Proceed to Checkout →")}
            </Link>
            <Link
              href={`/${params.tenant}/products`}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-white border border-gray-200 text-[14px] font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            >
              {t("மேலும் நூல்களைத் தேர்ந்தெடுக்க", "Continue Shopping")}
            </Link>
            <p className="mt-4 text-[12px] text-gray-500 text-center">
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