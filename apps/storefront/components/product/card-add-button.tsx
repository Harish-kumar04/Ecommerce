"use client";

import { useState } from "react";
import { quickAddToCart } from "@/lib/cart-client";
import { notifyCartChanged, openMiniCart } from "@/lib/cart-events";
import { toast } from "@/components/toaster";
import { useLanguage } from "@/components/language-provider";
import { CartIcon } from "@/components/brand/icons";

export default function CardAddButton({
  tenant,
  productId,
  productName,
  inStock = true,
}: {
  tenant: string;
  productId: string;
  productName: string;
  inStock?: boolean;
}) {
  const { t, localizeName } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!inStock) {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-full bg-black/5 px-3 text-[11.5px] font-medium text-black/40 cursor-not-allowed">
        {t("கையிருப்பில் இல்லை", "Out of stock")}
      </span>
    );
  }

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    setSuccess(false);
    try {
      await quickAddToCart(tenant, productId, 1);
      setSuccess(true);
      notifyCartChanged(tenant);
      openMiniCart();
      toast({
        kind: "success",
        title: t("கூடையில் சேர்க்கப்பட்டது", "Added to cart"),
        description: localizeName(productName),
      });
      setTimeout(() => setSuccess(false), 1500);
    } catch {
      toast({
        kind: "error",
        title: t("பிழை ஏற்பட்டது", "Failed to add"),
        description: t("மீண்டும் முயற்சிக்கவும்", "Please try again"),
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
      aria-label={`${t("கூடையில் சேர்", "Add to cart")} — ${localizeName(productName)}`}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition-all ${
        success
          ? "bg-green-600 text-white"
          : "border border-brand-red bg-white text-brand-red hover:bg-brand-red hover:text-white"
      }`}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-red border-t-transparent" />
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
