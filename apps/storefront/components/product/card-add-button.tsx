"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { t, localizeName } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);

  const unavailable = Boolean(isFallback) || !isUuidProductId(productId);
  const busy = adding || buying;

  if (!inStock) {
    return (
      <div className="mt-3">
        <span className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 bg-black/[0.04] px-3 text-[12.5px] font-semibold text-black/55 cursor-not-allowed">
          {t("கையிருப்பில் இல்லை", "Out of stock")}
        </span>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="mt-3">
        <button
          type="button"
          disabled
          title="Store is temporarily unavailable, try again"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11.5px] font-semibold leading-snug text-amber-900 cursor-not-allowed text-center"
        >
          {t(
            "சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும்",
            "Store is temporarily unavailable, try again",
          )}
        </button>
      </div>
    );
  }

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || unavailable) return;

    const rollback = optimisticAdjustCart(1, unitPriceCents);
    setAdding(true);
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
      setTimeout(() => setSuccess(false), 1600);
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
      setAdding(false);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || unavailable) return;

    const rollback = optimisticAdjustCart(1, unitPriceCents);
    setBuying(true);
    try {
      await quickAddToCart(tenant, productId, 1);
      notifyCartChanged(tenant);
      router.push(`/${tenant}/checkout`);
    } catch (err: any) {
      rollback();
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
      setBuying(false);
    }
  };

  return (
    <div className="mt-3 grid grid-cols-1 gap-2">
      <button
        type="button"
        onClick={handleAdd}
        disabled={busy}
        aria-busy={adding || undefined}
        aria-label={`${t("கூடையில் சேர்", "Add to cart")} — ${localizeName(productName)}`}
        className={`inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold transition-colors ${
          success && !adding
            ? "bg-green-700 text-white"
            : "border border-black/20 bg-white text-black hover:border-brand-red-dark hover:text-brand-red-dark disabled:opacity-60"
        }`}
      >
        {adding ? (
          <PenLoader size="sm" label={t("சேர்க்கிறது", "Adding")} />
        ) : success ? (
          <span>✓ {t("சேர்க்கப்பட்டது", "Added to cart")}</span>
        ) : (
          <>
            <CartIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{t("கூடையில் சேர்", "Add to cart")}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleBuyNow}
        disabled={busy}
        aria-busy={buying || undefined}
        aria-label={`${t("இப்போதே வாங்கு", "Buy now")} — ${localizeName(productName)}`}
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-black px-3 text-[12.5px] font-bold text-white transition-colors hover:bg-[#D11D1A] disabled:opacity-60"
      >
        {buying ? (
          <PenLoader size="sm" tone="light" label={t("வாங்குகிறது", "Buying now")} />
        ) : (
          <span className="truncate">{t("இப்போதே வாங்கு", "Buy now")}</span>
        )}
      </button>
    </div>
  );
}
