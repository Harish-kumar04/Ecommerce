"use client";

import { toast } from "@/components/toaster";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/img";
import { storefrontApi } from "@/lib/api";
import { notifyCartChanged } from "@/lib/cart-events";
import { useLanguage } from "@/components/language-provider";

export default function CartPage({ params }: { params: { tenant: string } }) {
  const { t, localizeName } = useLanguage();
  const [cart, setCart] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storefrontApi.getCart(params.tenant);
      const c = data?.cart || data?.data || data;
      setCart(c);
      const list = c?.items || c?.cart_items || data?.items || [];
      setItems(list);
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
      (sum: number, it: any) => sum + (it.price_cents ?? 0) * (it.quantity ?? 1),
      0,
    );
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
                it.product?.name || it.name || it.product_name || "Book";
              return (
                <div key={it.id} className="flex gap-4 py-6 first:pt-0">
                  <Link
                    href={`/${params.tenant}/products/${it.product_id}`}
                    className="relative flex-shrink-0 w-20 h-28 sm:w-24 sm:h-32 rounded-xl bg-[#fafafa] overflow-hidden border border-black/[0.07]"
                  >
                    {it.image_url ? (
                      <Image
                        src={it.image_url}
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
                      ₹{((it.price_cents ?? 0) / 100).toFixed(2)}{" "}
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
                        disabled={!!updating}
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
                    ₹
                    {(
                      ((it.price_cents ?? 0) * (it.quantity ?? 1)) /
                      100
                    ).toFixed(2)}
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
            <div className="mt-4 space-y-2 text-[14px]">
              <div className="flex justify-between text-gray-600">
                <span>{t("நூல்களின் விலை", "Subtotal")}</span>
                <span>₹{(total / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t("அஞ்சல் / கூரியர் கட்டணம்", "Shipping")}</span>
                <span className="text-gray-500">
                  {t("அடுத்தப் பக்கத்தில்", "Calculated at checkout")}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-[16px] font-extrabold text-gray-900">
              <span>{t("மொத்தத் தொகை", "Total")}</span>
              <span>₹{(total / 100).toFixed(2)}</span>
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
                "பாதுகாப்பான கட்டணம் · Razorpay, Stripe அல்லது COD வசதி.",
                "Secure checkout · Razorpay, Stripe or COD.",
              )}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}