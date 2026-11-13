"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "@/components/ui/img";
import { useLanguage } from "@/components/language-provider";
import { isUuidProductId, quickAddToCart } from "@/lib/cart-client";
import {
  notifyCartChanged,
  openMiniCart,
  optimisticAdjustCart,
} from "@/lib/cart-events";
import { toast } from "@/components/toaster";
import { CartIcon } from "@/components/brand/icons";
import { cloudinaryImageUrl } from "@/lib/site-defaults";

function formatPrice(cents?: number | null) {
  return `₹${Math.round((cents || 0) / 100).toLocaleString("en-IN")}`;
}

export function BookGalleryIsland({
  images,
  alt,
  onSale,
}: {
  images: string[];
  alt: string;
  onSale: boolean;
}) {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string>(images[0] || "");

  useEffect(() => {
    setSelectedImage(images[0] || "");
  }, [images]);

  return (
    <div>
      <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-2xl bg-[#fafafa] border border-black/[0.08] overflow-hidden shadow-glow">
        {onSale && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-brand-red px-3 py-1 text-[11.5px] font-bold text-white shadow-sm">
            {t("தள்ளுபடி", "SALE")}
          </span>
        )}
        {selectedImage ? (
          <Image
            src={selectedImage}
            alt={alt}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 448px"
            className="object-contain p-6"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-black/40">
            {t("படம் இல்லை", "No image")}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 justify-center overflow-x-auto py-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedImage(img)}
              aria-label={`View image ${i + 1}`}
              className={`relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 bg-[#fafafa] transition-all ${
                selectedImage === img
                  ? "border-brand-red shadow-glow"
                  : "border-black/10 hover:border-black/30"
              }`}
            >
              <Image
                src={cloudinaryImageUrl(img, 160)}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookPurchaseIslands({
  tenant,
  productId,
  productName,
  unitPriceCents,
  inStock,
  isFallback,
}: {
  tenant: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  inStock: boolean;
  isFallback: boolean;
}) {
  const router = useRouter();
  const { t, localizeName } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  const unavailable = Boolean(isFallback) || !isUuidProductId(productId);
  const primaryTitle = localizeName(productName);

  // Idle-deferred product.viewed beacon so TBT/LCP stay 100% clear
  useEffect(() => {
    if (unavailable) return;
    const send = () => {
      fetch("/api/v1/public/track", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant": tenant },
        body: JSON.stringify({
          event_type: "product.viewed",
          product_id: productId,
          source: "storefront",
        }),
        keepalive: true,
      }).catch(() => undefined);
    };
    const timer = window.setTimeout(send, 4500);
    return () => window.clearTimeout(timer);
  }, [tenant, productId, unavailable]);

  const handleAddToCart = async () => {
    if (!inStock || adding || unavailable) return;
    const rollback = optimisticAdjustCart(quantity, unitPriceCents * quantity);
    setAdding(true);
    try {
      await quickAddToCart(tenant, productId, quantity);
      notifyCartChanged(tenant);
      openMiniCart();
      toast({
        kind: "success",
        title: t("கூடையில் சேர்க்கப்பட்டது", "Added to cart"),
        description: `${primaryTitle} × ${quantity}`,
      });
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
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!inStock || buying || unavailable) return;
    const rollback = optimisticAdjustCart(quantity, unitPriceCents * quantity);
    setBuying(true);
    try {
      await quickAddToCart(tenant, productId, quantity);
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
    <>
      {inStock && unavailable && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[14px] font-semibold text-amber-900">
          {t(
            "சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை, மீண்டும் முயற்சிக்கவும்",
            "Store is temporarily unavailable, try again",
          )}
        </div>
      )}

      {inStock && !unavailable && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center rounded-full border border-black/20 bg-white">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-11 w-11 rounded-l-full text-[16px] font-bold hover:bg-black/5 transition-colors"
              aria-label="Decrease quantity"
            >
              –
            </button>
            <span className="w-10 text-center font-bold text-black">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-11 w-11 rounded-r-full text-[16px] font-bold hover:bg-black/5 transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || unavailable}
            className="btn-outline h-12 px-7 text-[15px] font-bold"
          >
            <CartIcon className="h-4 w-4" />
            {adding ? t("சேர்க்கிறது…", "Adding…") : t("கூடையில் சேர்", "Add to cart")}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={buying || unavailable}
            className="btn-red h-12 px-8 text-[15px] font-bold shadow-glow"
          >
            {buying ? t("தயாராகிறது…", "Processing…") : t("இப்போதே வாங்குக", "Buy now")}
          </button>
        </div>
      )}

      {/* Sticky Bottom Bar on Mobile */}
      <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between gap-3 border-t border-black/10 bg-white/[0.98] px-4 py-3 shadow-2xl sm:hidden">
        <div>
          <span className="block text-[11px] text-black/50 leading-tight">
            {t("மொத்த விலை", "Price")}
          </span>
          <span className="text-[20px] font-extrabold text-brand-red leading-none">
            {formatPrice(unitPriceCents)}
          </span>
        </div>
        {unavailable ? (
          <span className="text-[11px] font-semibold text-amber-900 text-right">
            {t(
              "சேவையகம் தற்காலிகமாகக் கிடைக்கவில்லை",
              "Store is temporarily unavailable, try again",
            )}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || adding}
              className="btn-outline h-11 px-4 text-[13px] font-bold"
            >
              {adding ? "…" : t("கூடை", "Cart")}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock || buying}
              className="btn-red h-11 px-5 text-[13.5px] font-bold"
            >
              {buying ? "…" : t("வாங்க", "Buy now")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
