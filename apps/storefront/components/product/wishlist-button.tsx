"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/toaster";
import { isWishlisted, toggleWishlistId, WISHLIST_EVENT } from "@/lib/wishlist";

export default function WishlistButton({
  productId,
  productName,
  className = "",
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { t, localizeName } = useLanguage();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isWishlisted(productId));
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [productId]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleWishlistId(productId);
    setSaved(next);
    toast({
      kind: "success",
      title: next
        ? t("விருப்பப் பட்டியலில் சேர்க்கப்பட்டது", "Saved to wishlist")
        : t("விருப்பப் பட்டியலிலிருந்து நீக்கப்பட்டது", "Removed from wishlist"),
      description: localizeName(productName),
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={saved}
      aria-label={
        saved
          ? `${t("விருப்பப் பட்டியலிலிருந்து நீக்கு", "Remove from wishlist")} — ${localizeName(productName)}`
          : `${t("விருப்பப் பட்டியலில் சேர்", "Save to wishlist")} — ${localizeName(productName)}`
      }
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
        saved
          ? "border-brand-red/30 bg-brand-red-light text-brand-red shadow-sm"
          : "border-black/10 bg-white/95 text-black/65 hover:border-brand-red hover:text-brand-red shadow-sm"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
