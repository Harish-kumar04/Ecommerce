"use client";

import { useState } from "react";
import { isUuidProductId, quickAddToCart } from "@/lib/cart-client";
import {
  notifyCartChanged,
  openMiniCart,
  optimisticAdjustCart,
} from "@/lib/cart-events";
import { toast } from "@/components/toaster";
import { useLanguage } from "@/components/language-provider";
import { CartIcon } from "@/components/brand/icons";
import PenLoader from "@/components/ui/pen-loader";

export default function CardAddButton({
  tenant,
  productId,
  productName,
  unitPriceCents = 0,
  inStock = true,
  isFallback = false,
}: {
  tenant: string;
  productId: string;
  productName: string;
  unitPriceCents?: number;
  inStock?: boolean;
  isFallback?: boolean;
}) {
  const { t, localizeName } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const unavailable = Boolean(isFallback) || !isUuidProductId(productId);

  if (!inStock) {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-full bg-black/5 px-3 text-[11.5px] font-medium text-black/40 cursor-not-allowed">
        {t("கையிருப்பில் இல்லை", "Out of stock")}
      </span>
    );
  }

  if (unavailable) {
    return (
      <button
        type="button"
        disabled
        title="Store is temporarily unavailable, try again"
        className="inline-flex min-h-9 items-center justify-center rounded-lg bg-amber-50 border border-amber-300/70 px-2.5 py-1 text-[10.5px] leading-tight font-medium text-amber-900 cursor-not-allowed text-right"
      >
        {t(
          "சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும்",
          "Store is temporarily unavailable, try again",
        )}
      </button>
    );
  }

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading || unavailable) return;

    // Optimistic UI: update cart badge + button state immediately
    const rollback = optimisticAdjustCart(1, unitPriceCents);
    setLoading(true);
    setSuccess(true);
    try {
      await quickAddToCart(tenant, productId, 1);
      notifyCartChanged(tenant);
      openMiniCart();
      toast({
        kind: "success",
        title: t("கூடையில் சேர்க்கப்பட்டது", "Added to cart"),
        description: localizeName(productName),
      });
      setTimeout(() => setSuccess(false), 1500);
    } catch (err: any) {
      rollback();
      setSuccess(false);
      toast({
        kind: "error",
        title: t("பிழை ஏற்பட்டது", "Failed to add"),
        description:
          err?.message ||
          t(
            "சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும்",
            "Store is temporarily unavailable, try again",
          ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={loading}
      aria-busy={loading || undefined}
      aria-label={`${t("கூடையில் சேர்", "Add to cart")} — ${localizeName(productName)}`}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition-all ${
        success && !loading
          ? "bg-green-600 text-white"
          : "border border-brand-red bg-white text-brand-red hover:bg-brand-red hover:text-white"
      }`}
    >
      {loading ? (
        <PenLoader size="sm" label={t("சேர்க்கிறது", "Adding")} />
      ) : success ? (
        <span>✓ {t("சேர்க்கப்பட்டது", "Added")}</span>
      ) : (
        <>
          <CartIcon className="h-3.5 w-3.5" />
          <span>{t("சேர்", "Add")}</span>
        </>
      )}
    </button>
  );
}
