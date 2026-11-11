"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "@/components/ui/img";
import { useLanguage, splitBilingual } from "@/components/language-provider";
import { storefrontApi } from "@/lib/api";
import { notifyCartChanged, openMiniCart } from "@/lib/cart-events";
import { toast } from "@/components/toaster";
import ProductCard, { toCardProduct } from "@/components/product/product-card";
import { CartIcon } from "@/components/brand/icons";

function formatPrice(cents?: number | null) {
  return `₹${Math.round((cents || 0) / 100).toLocaleString("en-IN")}`;
}

export default function BookDetailClient({
  tenant,
  product,
  relatedBooks = [],
}: {
  tenant: string;
  product: any;
  relatedBooks?: any[];
}) {
  const router = useRouter();
  const { lang, t, localizeName, localizeSubName } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string>(
    product.images?.[0] || product.image_url || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  const onSale = Boolean(product.sale_price_cents && product.sale_price_cents < product.price_cents);
  const price = onSale ? (product.sale_price_cents as number) : product.price_cents;
  const inStock = (product.inventory_quantity ?? product.inventory ?? 1) > 0;

  const primaryTitle = localizeName(product.name);
  const secondaryTitle = localizeSubName(product.name);
  const [taDesc, enDesc] = splitBilingual(product.description, "||");
  const activeDesc = lang === "ta" ? taDesc : enDesc;
  const secondaryDesc = lang === "ta" ? enDesc : taDesc;

  // Book metadata from dimensions_json.book
  const bookMeta = product.dimensions_json?.book || {};
  const author =
    product.author ||
    bookMeta.author ||
    (typeof product.safety_info === "string" && !product.safety_info.includes("•")
      ? product.safety_info
      : null);
  const publisher = bookMeta.publisher || "முத்தமிழறிஞர் பதிப்பகம் / Muthamilarignar Pathipagam";
  const language = bookMeta.language || "தமிழ் (Tamil)";
  const pages = bookMeta.pages || null;
  const binding =
    bookMeta.binding ||
    (product.safety_info?.includes("Hardcover") ? "Hardcover" : "Paperback");
  const isbn = bookMeta.isbn || product.sku || null;
  const year = bookMeta.year || null;

  // Images gallery
  const allImages = Array.from(
    new Set([product.image_url, ...(product.images || [])].filter(Boolean))
  ) as string[];

  // Non-blocking beacon tracking
  useEffect(() => {
    fetch("/api/v1/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant": tenant },
      body: JSON.stringify({ event_type: "product.viewed", product_id: product.id, source: "storefront" }),
      keepalive: true,
    }).catch(() => undefined);
  }, [tenant, product.id]);

  const handleAddToCart = async () => {
    if (!inStock || adding) return;
    setAdding(true);
    try {
      await storefrontApi.addToCart(tenant, product.id, quantity);
      notifyCartChanged(tenant);
      openMiniCart();
      toast({
        kind: "success",
        title: t("கூடையில் சேர்க்கப்பட்டது", "Added to cart"),
        description: `${primaryTitle} × ${quantity}`,
      });
    } catch {
      toast({
        kind: "error",
        title: t("பிழை ஏற்பட்டது", "Failed to add"),
        description: t("மீண்டும் முயற்சிக்கவும்", "Please try again"),
      });
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!inStock || buying) return;
    setBuying(true);
    try {
      await storefrontApi.addToCart(tenant, product.id, quantity);
      notifyCartChanged(tenant);
      router.push(`/${tenant}/checkout`);
    } catch {
      router.push(`/${tenant}/checkout`);
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="bg-white pb-24 sm:pb-12">
      {/* Breadcrumb */}
      <section className="container-site pt-6 pb-4">
        <nav className="text-[13px] text-black/55 flex items-center flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href={`/${tenant}`} className="hover:text-brand-red transition-colors">
            {t("முகப்பு", "Home")}
          </Link>
          <span className="opacity-40">/</span>
          <Link href={`/${tenant}/products`} className="hover:text-brand-red transition-colors">
            {t("நூல்கள்", "Books")}
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-black font-semibold truncate max-w-[240px] sm:max-w-md">
            {primaryTitle}
          </span>
        </nav>
      </section>

      {/* Main Product Info & Gallery */}
      <section className="container-site py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Gallery: Large Cover + Thumbnails */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-2xl bg-[#fafafa] border border-black/[0.08] overflow-hidden shadow-glow">
              {onSale && (
                <span className="absolute left-4 top-4 z-10 rounded-full bg-brand-red px-3 py-1 text-[11.5px] font-bold text-white shadow-sm">
                  {t("தள்ளுபடி", "SALE")}
                </span>
              )}
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={primaryTitle}
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

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="mt-4 flex gap-3 justify-center overflow-x-auto py-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 bg-[#fafafa] transition-all ${
                      selectedImage === img ? "border-brand-red shadow-glow" : "border-black/10 hover:border-black/30"
                    }`}
                  >
                    <Image src={img} alt="" fill sizes="64px" className="object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Book Info & Purchase Panel */}
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wider text-brand-red">
              <span>{t("அதிகாரப்பூர்வ பதிப்பு", "Official Edition")}</span>
            </span>

            <h1 className="mt-3 text-[28px] sm:text-[38px] font-extrabold leading-[1.18] tracking-tight text-[#111]">
              {primaryTitle}
            </h1>
            {secondaryTitle && (
              <p className="mt-1.5 text-[17px] font-medium text-black/60">
                {secondaryTitle}
              </p>
            )}
            {author && (
              <p className="mt-2 text-[15px] font-semibold text-black/80">
                <span className="text-black/50 font-normal">{t("ஆசிரியர்:", "Author:")}</span> {author}
              </p>
            )}

            {/* Price & Stock */}
            <div className="mt-5 flex items-baseline gap-3 flex-wrap">
              <span className="text-[34px] font-extrabold text-brand-red">
                {formatPrice(price)}
              </span>
              {onSale && (
                <span className="text-[18px] text-black/40 line-through">
                  {formatPrice(product.price_cents)}
                </span>
              )}
              {inStock ? (
                <span className="inline-flex items-center gap-1 text-[13px] text-green-700 font-semibold ml-2">
                  <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                  {t("கையிருப்பில் உள்ளது", "In Stock & Ready to Ship")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[13px] text-red-600 font-semibold ml-2">
                  ● {t("கையிருப்பில் இல்லை", "Currently Out of Stock")}
                </span>
              )}
            </div>

            {/* Quantity Selector & Action Buttons (Desktop) */}
            {inStock && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center rounded-full border border-black/20 bg-white">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-11 w-11 rounded-l-full text-[16px] font-bold hover:bg-black/5 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    –
                  </button>
                  <span className="w-10 text-center font-bold text-black">{quantity}</span>
                  <button
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
                  disabled={adding}
                  className="btn-outline h-12 px-7 text-[15px] font-bold"
                >
                  <CartIcon className="h-4 w-4" />
                  {adding ? t("சேர்க்கிறது…", "Adding…") : t("கூடையில் சேர்", "Add to cart")}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={buying}
                  className="btn-red h-12 px-8 text-[15px] font-bold shadow-glow"
                >
                  {buying ? t("தயாராகிறது…", "Processing…") : t("இப்போதே வாங்குக", "Buy now")}
                </button>
              </div>
            )}

            {/* Book Details Table from dimensions_json.book */}
            <div className="mt-8 rounded-2xl border border-black/10 bg-[#fafafa] p-5 text-[14px]">
              <h3 className="font-bold text-black mb-3 text-[15px]">
                {t("நூல் விவரங்கள்", "Book Details")}
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {author && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">{t("ஆசிரியர்", "Author")}</dt>
                    <dd className="font-semibold text-black text-right">{author}</dd>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">{t("பதிப்பகம்", "Publisher")}</dt>
                  <dd className="font-semibold text-black text-right">{publisher}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">{t("மொழி", "Language")}</dt>
                  <dd className="font-semibold text-black text-right">{language}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">{t("கட்டமைப்பு", "Binding")}</dt>
                  <dd className="font-semibold text-black text-right">{binding}</dd>
                </div>
                {pages && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">{t("பக்கங்கள்", "Pages")}</dt>
                    <dd className="font-semibold text-black text-right">{pages}</dd>
                  </div>
                )}
                {isbn && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">{t("ISBN / குறியீடு", "ISBN / Code")}</dt>
                    <dd className="font-semibold text-black text-right">{isbn}</dd>
                  </div>
                )}
                {year && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">{t("பதிப்பு ஆண்டு", "Publication Year")}</dt>
                    <dd className="font-semibold text-black text-right">{year}</dd>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">{t("விநியோகம்", "Delivery")}</dt>
                  <dd className="font-semibold text-black text-right">
                    {t("இந்தியா முழுவதும்", "Pan-India Courier")}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description / Synopsis */}
            {activeDesc && (
              <div className="mt-8">
                <h3 className="text-[17px] font-bold text-black mb-2">
                  {t("நூல் அறிமுகம்", "About the Book")}
                </h3>
                <p className="text-[15px] leading-relaxed text-black/75 whitespace-pre-line">
                  {activeDesc}
                </p>
                {secondaryDesc && secondaryDesc !== activeDesc && (
                  <div className="mt-4 rounded-xl bg-black/[0.02] border border-black/[0.06] p-4 text-[13.5px] leading-relaxed text-black/65">
                    {secondaryDesc}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <section className="container-site mt-16 pt-12 border-t border-black/10">
          <div className="mb-8">
            <span className="eyebrow">{t("தொடர்புடைய நூல்கள்", "Related Titles")}</span>
            <h2 className="mt-1 text-[26px] font-extrabold text-black sm:text-[32px]">
              {t("இதே பிரிவின் பிற நூல்கள்", "Books in the Same Category")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {relatedBooks.map((b) => (
              <ProductCard key={b.id} product={toCardProduct(b)} tenant={tenant} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Bottom Bar on Mobile with Price + Add to Cart + Buy Now */}
      <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between gap-3 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur shadow-2xl sm:hidden">
        <div>
          <span className="block text-[11px] text-black/50 leading-tight">
            {t("மொத்த விலை", "Price")}
          </span>
          <span className="text-[20px] font-extrabold text-brand-red leading-none">
            {formatPrice(price)}
          </span>
        </div>
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
      </div>
    </div>
  );
}
