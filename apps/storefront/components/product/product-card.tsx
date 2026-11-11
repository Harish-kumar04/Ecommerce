"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

/**
 * Product card — Muthamilarignar Pathipagam Book Card.
 *
 *  - Book cover ratio (3:4) with clean border and hover elevation.
 *  - Bilingual title rendering (primary title in active language, secondary subtitle below).
 *  - Publisher badge and INR price with sale strikethrough.
 */
export default function ProductCard({
  product,
  tenant,
}: {
  product: any;
  tenant: string;
}) {
  const { t, localizeName, localizeSubName } = useLanguage();
  const price = product.sale_price_cents
    ? product.sale_price_cents / 100
    : product.price_cents / 100;
  const onSale = Boolean(product.sale_price_cents);
  const imgSrc = product.images?.[0] || product.image_url;

  const primaryTitle = localizeName(product.name);
  const secondaryTitle = localizeSubName(product.name);

  return (
    <Link
      href={`/${tenant}/products/${product.id}`}
      className="group flex flex-col rounded-2xl border border-gray-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-red/50 hover:shadow-[0_12px_32px_rgba(229,35,32,0.10)] overflow-hidden"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 p-3 flex items-center justify-center">
        {onSale && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-brand-red px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
            {t("சிறப்புத் தள்ளுபடி", "SALE")}
          </span>
        )}
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={primaryTitle}
            loading="lazy"
            className="h-full w-full object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            {t("படம் இல்லை", "No cover")}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-red">
            {t("முத்தமிழறிஞர் பதிப்பகம்", "Muthamilarignar Pathipagam")}
          </p>
          <h3 className="mt-1 text-[15px] font-bold leading-snug text-gray-900 line-clamp-2 group-hover:text-brand-red transition-colors">
            {primaryTitle}
          </h3>
          {secondaryTitle && (
            <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-1">
              {secondaryTitle}
            </p>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-bold text-gray-900">
              ₹{price.toFixed(0)}
            </span>
            {onSale && (
              <span className="text-[12px] text-gray-400 line-through">
                ₹{(product.price_cents / 100).toFixed(0)}
              </span>
            )}
          </div>
          <span className="inline-flex items-center rounded-full bg-brand-red-light px-2.5 py-1 text-[11px] font-semibold text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors">
            {t("வாங்க →", "Buy →")}
          </span>
        </div>
      </div>
    </Link>
  );
}