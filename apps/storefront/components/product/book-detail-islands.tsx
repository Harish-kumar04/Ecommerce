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
import { CartIcon, CloseIcon, WhatsAppIcon, FacebookIcon } from "@/components/brand/icons";
import PenLoader from "@/components/ui/pen-loader";
import WishlistButton from "@/components/product/wishlist-button";
import { cloudinaryImageUrl } from "@/lib/site-defaults";

function formatPrice(cents?: number | null) {
  return `₹${Math.round((cents || 0) / 100).toLocaleString("en-IN")}`;
}

function LightboxModal({
  images,
  initialIndex = 0,
  alt,
  onClose,
}: {
  images: string[];
  initialIndex?: number;
  alt: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && images.length > 1) setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft" && images.length > 1) setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  const activeSrc = images[idx] || images[0] || "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("நூல் அட்டைப் படம் பெரிதாக்கம்", "Book cover zoom view")}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Top Toolbar */}
      <div
        className="mb-3 flex w-full max-w-3xl items-center justify-between gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-bold text-white hover:bg-white/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
          </svg>
          {zoomed ? t("இயல்பு அளவு (1×)", "Reset zoom (1×)") : t("பெரிதாக்கு (1.6×)", "Zoom in (1.6×)")}
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("மூடுக", "Close zoom")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white hover:bg-[#D11D1A]"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Main Zoom Stage */}
      <div
        className="relative flex h-[72vh] w-full max-w-3xl items-center justify-center overflow-auto rounded-2xl bg-white p-4"
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
      >
        {activeSrc && (
          <div
            className={`relative h-full w-full transition-transform duration-200 ${
              zoomed ? "scale-[1.6] cursor-zoom-out" : "scale-100 cursor-zoom-in"
            }`}
          >
            <Image
              src={cloudinaryImageUrl(activeSrc, 1200)}
              alt={alt}
              fill
              sizes="(max-width: 1024px) 95vw, 800px"
              className="object-contain p-4"
            />
          </div>
        )}
      </div>

      {/* Multi-image Thumbnails */}
      {images.length > 1 && (
        <div
          className="mt-4 flex items-center gap-2.5 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setIdx(i);
                setZoomed(false);
              }}
              aria-label={`Image ${i + 1}`}
              className={`relative h-14 w-12 overflow-hidden rounded-lg border-2 bg-white ${
                i === idx ? "border-brand-red" : "border-white/30 opacity-75"
              }`}
            >
              <Image
                src={cloudinaryImageUrl(src, 160)}
                alt=""
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tiny 44x44px overlay zoom trigger used when the primary book cover is pure SSR HTML,
 * preserving zero-hydration LCP while enabling full-screen zoom/lightbox on every book.
 */
export function CoverLightboxTrigger({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!images || images.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 text-[12.5px] font-bold text-black shadow-sm transition-colors hover:border-brand-red-dark hover:text-brand-red-dark"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
        </svg>
        <span>{t("அட்டைப் படத்தைப் பெரிதாக்கு", "Zoom cover")}</span>
      </button>
      {open && (
        <LightboxModal images={images} initialIndex={0} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export function BookGalleryIsland({
  images,
  alt,
  discountPct = 0,
}: {
  images: string[];
  alt: string;
  discountPct?: number;
}) {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setSelectedIndex(0);
  }, [images]);

  const selectedImage = images[selectedIndex] || images[0] || "";

  return (
    <div>
      <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-2xl bg-[#FAFAFA] border border-black/[0.08] overflow-hidden shadow-glow">
        {discountPct > 0 && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-[#D11D1A] px-3 py-1 text-[11.5px] font-extrabold text-white shadow-sm">
            {discountPct}% OFF
          </span>
        )}
        {selectedImage ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={t("அட்டைப் படத்தைப் பெரிதாக்கிப் பார்க்க", "Zoom book cover")}
            className="block h-full w-full cursor-zoom-in"
          >
            <Image
              src={selectedImage}
              alt={alt}
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 448px"
              className="object-contain p-6"
            />
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-black/55">
            {t("படம் இல்லை", "No image")}
          </div>
        )}

        {selectedImage && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={t("பெரிதாக்கு", "Zoom cover")}
            className="absolute bottom-3 right-3 z-20 inline-flex h-11 items-center gap-1.5 rounded-full border border-black/15 bg-white/95 px-3.5 text-[12px] font-bold text-black shadow-md hover:border-brand-red-dark hover:text-brand-red-dark"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
            </svg>
            <span>{t("பெரிதாக்கு", "Zoom")}</span>
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 justify-center overflow-x-auto py-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 bg-[#FAFAFA] transition-all ${
                selectedIndex === i
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

      {lightboxOpen && (
        <LightboxModal
          images={images}
          initialIndex={selectedIndex}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
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
  maxStock,
  isFallback,
}: {
  tenant: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  inStock: boolean;
  maxStock?: number;
  isFallback: boolean;
}) {
  const router = useRouter();
  const { t, localizeName } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  const unavailable = Boolean(isFallback) || !isUuidProductId(productId);
  const primaryTitle = localizeName(productName);
  const cap = typeof maxStock === "number" && maxStock > 0 ? maxStock : 99;

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
        <div className="mt-6 flex flex-wrap items-center gap-3.5">
          {/* >=44px Quantity Stepper */}
          <div className="flex items-center rounded-full border border-black/20 bg-white">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-12 w-12 rounded-l-full text-[16px] font-bold text-black hover:bg-black/5 transition-colors"
              aria-label="Decrease quantity"
            >
              –
            </button>
            <span className="w-10 text-center text-[15px] font-bold text-black">{quantity}</span>
            <button
              type="button"
              disabled={quantity >= cap}
              onClick={() => setQuantity((q) => Math.min(cap, q + 1))}
              className="h-12 w-12 rounded-r-full text-[16px] font-bold text-black hover:bg-black/5 disabled:opacity-40 transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || unavailable}
            aria-busy={adding || undefined}
            className="btn-outline h-12 px-6 text-[15px] font-bold"
          >
            {adding ? (
              <>
                <PenLoader size="sm" label={t("சேர்க்கிறது", "Adding")} />
                {t("சேர்க்கிறது…", "Adding…")}
              </>
            ) : (
              <>
                <CartIcon className="h-4 w-4" />
                {t("கூடையில் சேர்", "Add to cart")}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={buying || unavailable}
            aria-busy={buying || undefined}
            className="btn-red h-12 px-7 text-[15px] font-bold shadow-glow"
          >
            {buying ? (
              <>
                <PenLoader size="sm" tone="light" label={t("தயாராகிறது", "Processing")} />
                {t("தயாராகிறது…", "Processing…")}
              </>
            ) : (
              t("இப்போதே வாங்குக", "Buy now")
            )}
          </button>

          <WishlistButton productId={productId} productName={productName} className="h-12 w-12" />
        </div>
      )}

      {/* Sticky Bottom Bar on Mobile (<640px) */}
      <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between gap-3 border-t border-black/15 bg-white/[0.98] px-4 py-3 shadow-2xl sm:hidden">
        <div>
          <span className="block text-[11px] font-medium text-black/65 leading-tight">
            {t("நூல் விலை", "Book Price")}
          </span>
          <span className="text-[20px] font-extrabold text-brand-red leading-none">
            {formatPrice(unitPriceCents * quantity)}
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
              aria-busy={adding || undefined}
              className="btn-outline h-11 px-4 text-[13px] font-bold"
            >
              {adding ? <PenLoader size="sm" label="Adding" /> : t("கூடையில் சேர்", "Add to cart")}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock || buying}
              aria-busy={buying || undefined}
              className="btn-red h-11 px-5 text-[13.5px] font-bold"
            >
              {buying ? <PenLoader size="sm" tone="light" label="Processing" /> : t("வாங்குக", "Buy now")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Indian Pincode Delivery & COD Checker Island.
 */
export function PincodeCheckIsland({ unitPriceCents }: { unitPriceCents: number }) {
  const { t } = useLanguage();
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<
    | null
    | { ok: true; region: "tn" | "india" }
    | { ok: false }
  >(null);

  const checkPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pin.trim();
    if (!/^[1-8]\d{5}$/.test(cleaned)) {
      setResult({ ok: false });
      return;
    }
    const prefix = Number(cleaned.slice(0, 3));
    const isTnOrPy = prefix >= 600 && prefix <= 643;
    setResult({ ok: true, region: isTnOrPy ? "tn" : "india" });
  };

  const freeDeliveryEligible = unitPriceCents >= 50000;

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-[#FAFAFA] p-4 sm:p-5">
      <p className="text-[13.5px] font-bold text-black">
        {t("விநியோக நேரம் & அஞ்சல் குறியீடு சரிபார்ப்பு", "Delivery & Pincode Check")}
      </p>
      <form onSubmit={checkPin} className="mt-2.5 flex gap-2">
        <label htmlFor="book-pincode-input" className="sr-only">
          {t("6 இலக்க அஞ்சல் குறியீடு", "Enter 6-digit pincode")}
        </label>
        <input
          id="book-pincode-input"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (result) setResult(null);
          }}
          placeholder={t("அஞ்சல் குறியீடு (எ.கா. 600001)", "Enter 6-digit Pincode (e.g. 600001)")}
          className="h-11 flex-1 rounded-full border border-black/20 bg-white px-4 text-[13.5px] text-black placeholder:text-black/55 focus:border-brand-red focus:outline-none"
        />
        <button
          type="submit"
          className="h-11 rounded-full bg-black px-5 text-[13px] font-bold text-white transition-colors hover:bg-brand-red-dark"
        >
          {t("சரிபார்", "Check")}
        </button>
      </form>

      {result?.ok === true && (
        <div
          role="status"
          className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-[13px] text-green-900"
        >
          <p className="font-bold">
            ✓{" "}
            {result.region === "tn"
              ? t(
                  "தமிழ்நாடு & புதுச்சேரி: 2–4 வணிக நாட்களில் விநியோகம்",
                  "Tamil Nadu & Puducherry: Estimated delivery in 2–4 business days",
                )
              : t(
                  "இந்தியா முழுவதும்: 4–7 வணிக நாட்களில் விநியோகம்",
                  "Pan-India Courier: Estimated delivery in 4–7 business days",
                )}
          </p>
          <p className="mt-0.5 text-[12px] text-green-800">
            {freeDeliveryEligible
              ? t("இலவச விநியோகம் + ரொக்கப் பணம் (COD) வசதி உண்டு", "Eligible for FREE delivery + Cash on Delivery (COD)")
              : t("₹500-க்கு மேல் இலவச விநியோகம் • ரொக்கப் பணம் (COD) வசதி உண்டு", "Free delivery on orders above ₹500 • Cash on Delivery (COD) available")}
          </p>
        </div>
      )}

      {result?.ok === false && (
        <p role="alert" className="mt-2 text-[12.5px] font-semibold text-brand-red-dark">
          {t("சரியான 6 இலக்க இந்திய அஞ்சல் குறியீட்டை உள்ளிடவும்.", "Please enter a valid 6-digit Indian pincode.")}
        </p>
      )}
    </div>
  );
}

/**
 * Accessible Share Bar (WhatsApp, Facebook, X, Copy Link).
 */
export function ShareBookBar({ title }: { title: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const copyLink = async () => {
    const url = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {}
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${title} — ${shareUrl}`);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-black/[0.08] pt-5">
      <span className="mr-1 text-[13px] font-bold text-black/75">
        {t("நூலைப் பகிர்க:", "Share this book:")}
      </span>

      <a
        href={shareUrl ? `https://wa.me/?text=${encodedText}` : "#"}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-[13px] font-semibold text-black hover:border-[#25D366] hover:text-[#128C7E]"
      >
        <WhatsAppIcon className="h-4 w-4" />
        <span>WhatsApp</span>
      </a>

      <a
        href={shareUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` : "#"}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-[13px] font-semibold text-black hover:border-brand-red-dark hover:text-brand-red-dark"
      >
        <FacebookIcon className="h-4 w-4" />
        <span>Facebook</span>
      </a>

      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-[13px] font-semibold text-black hover:border-black"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>{copied ? t("நகலெடுக்கப்பட்டது ✓", "Link copied ✓") : t("இணைப்பு நகல்", "Copy link")}</span>
      </button>
    </div>
  );
}
