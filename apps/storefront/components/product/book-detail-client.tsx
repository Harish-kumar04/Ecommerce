"use client";

import Link from "next/link";
import { useLanguage, splitBilingual } from "@/components/language-provider";
import AddToCart from "@/components/product/add-to-cart";
import ProductHighlights from "@/components/product/product-highlights";
import ProductReviews from "@/components/product/product-reviews";

function formatPrice(cents?: number | null) {
  return `₹${((cents || 0) / 100).toFixed(0)}`;
}

export default function BookDetailClient({
  tenant,
  product,
}: {
  tenant: string;
  product: any;
}) {
  const { lang, t, localizeName, localizeSubName } = useLanguage();
  const price = product.sale_price_cents || product.price_cents;
  const onSale = Boolean(product.sale_price_cents);

  const primaryTitle = localizeName(product.name);
  const secondaryTitle = localizeSubName(product.name);
  const [taDesc, enDesc] = splitBilingual(product.description, "||");
  const activeDesc = lang === "ta" ? taDesc : enDesc;
  const secondaryDesc = lang === "ta" ? enDesc : taDesc;

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        <nav className="text-[12px] text-gray-500 mb-6 flex items-center flex-wrap gap-1">
          <Link
            href={`/${tenant}`}
            className="hover:text-brand-red"
          >
            {t("முகப்பு", "Home")}
          </Link>
          <span className="mx-1.5 opacity-60">/</span>
          <Link
            href={`/${tenant}/products`}
            className="hover:text-brand-red"
          >
            {t("நூல்கள்", "Books")}
          </Link>
          <span className="mx-1.5 opacity-60">/</span>
          <span className="text-gray-800 font-medium">
            {primaryTitle}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Book Cover Gallery */}
          <div className="lg:col-span-5">
            <div className="aspect-[3/4] w-full max-w-md mx-auto rounded-3xl bg-neutral-100 border border-gray-200/80 p-6 flex items-center justify-center overflow-hidden shadow-sm">
              {product.images?.[0] || product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images?.[0] || product.image_url}
                  alt={primaryTitle}
                  className="w-full h-full object-contain drop-shadow-xl"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  {t("படம் இல்லை", "No image")}
                </div>
              )}
            </div>
          </div>

          {/* Book Info & Buy Box */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red-light border border-brand-red-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-red-dark">
              <span>
                {t("முத்தமிழறிஞர் பதிப்பகம்", "Muthamilarignar Pathipagam")}
              </span>
            </div>

            <h1 className="mt-3 text-[28px] sm:text-[38px] font-extrabold leading-[1.15] tracking-tight text-gray-900">
              {primaryTitle}
            </h1>
            {secondaryTitle && (
              <p className="mt-1.5 text-[16px] font-medium text-gray-500">
                {secondaryTitle}
              </p>
            )}
            {product.sku && (
              <p className="mt-1 text-[12px] text-gray-400">
                {t("நூல் குறியீடு", "Book Code")} · {product.sku}
              </p>
            )}

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-[32px] font-extrabold text-brand-red">
                {formatPrice(price)}
              </span>
              {onSale && (
                <span className="text-[16px] text-gray-400 line-through">
                  {formatPrice(product.price_cents)}
                </span>
              )}
              <span className="text-[12px] text-green-600 font-semibold ml-2">
                ● {t("கையிருப்பில் உள்ளது", "In Stock & Ready to Ship")}
              </span>
            </div>

            {activeDesc && (
              <p className="mt-5 text-[15px] leading-relaxed text-gray-700">
                {activeDesc}
              </p>
            )}

            <div className="mt-7 max-w-md">
              <AddToCart tenant={tenant} product={product} />
            </div>

            {/* Book Metadata Table */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-[13px] space-y-2.5">
              <div className="flex justify-between border-b border-gray-200/70 pb-2">
                <span className="text-gray-500">
                  {t("பதிப்பகம் (Publisher)", "Publisher")}
                </span>
                <span className="font-semibold text-gray-900">
                  {t("முத்தமிழறிஞர் பதிப்பகம்", "Muthamilarignar Pathipagam")}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/70 pb-2">
                <span className="text-gray-500">
                  {t("நூல் மொழி (Language)", "Language")}
                </span>
                <span className="font-semibold text-gray-900">
                  {t("தமிழ் (Tamil)", "Tamil (தமிழ்)")}
                </span>
              </div>
              {product.safety_info && (
                <div className="flex justify-between border-b border-gray-200/70 pb-2">
                  <span className="text-gray-500">
                    {t("பதிப்பு விவரம் (Edition)", "Edition / Format")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {product.safety_info}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {t("விநியோகம் (Delivery)", "Shipping")}
                </span>
                <span className="font-semibold text-gray-900">
                  {t(
                    "இந்தியா முழுவதும் கூரியர் சேவை",
                    "Pan-India Courier · Free over ₹500",
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights / Specs */}
      <ProductHighlights product={product} />

      {/* Bilingual Synopsis */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 border-t border-gray-100">
        <h2 className="text-[22px] font-bold tracking-tight text-gray-900">
          {t("நூல் அறிமுகம் (About the Book)", "About the Book (நூல் அறிமுகம்)")}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-gray-800 whitespace-pre-line">
          {activeDesc}
        </p>
        {secondaryDesc && secondaryDesc !== activeDesc && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-5 border border-gray-200/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-red mb-1.5">
              {lang === "ta" ? "English Synopsis" : "தமிழ் சுருக்கம்"}
            </p>
            <p className="text-[14px] leading-relaxed text-gray-600">
              {secondaryDesc}
            </p>
          </div>
        )}
      </section>

      {/* Reader Reviews */}
      <ProductReviews product={product} tenant={tenant} />
    </div>
  );
}
