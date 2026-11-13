import Link from "next/link";
import Image from "@/components/ui/img";
import { BiName, BiSubName, T } from "@/components/i18n/t";
import { splitBilingual } from "@/lib/i18n";
import { isDatabaseProductId } from "@/lib/catalog-fallback";
import ProductCard, { toCardProduct } from "@/components/product/product-card";
import {
  BookGalleryIsland,
  BookPurchaseIslands,
} from "@/components/product/book-detail-islands";

function formatPrice(cents?: number | null) {
  return `₹${Math.round((cents || 0) / 100).toLocaleString("en-IN")}`;
}

/**
 * Server Component book detail layout:
 * Renders the LCP cover image (`fetchpriority="high"`), h1, pricing, book details,
 * bilingual synopsis, and related books as pure zero-JS HTML, hydrating only
 * tiny purchase/gallery islands.
 */
export default function BookDetailView({
  tenant,
  product,
  relatedBooks = [],
}: {
  tenant: string;
  product: any;
  relatedBooks?: any[];
}) {
  const onSale = Boolean(
    product.sale_price_cents && product.sale_price_cents < product.price_cents,
  );
  const price = onSale ? (product.sale_price_cents as number) : product.price_cents;
  const inStock = (product.inventory_quantity ?? product.inventory ?? 1) > 0;
  const isFallback = Boolean(product.is_fallback) || !isDatabaseProductId(product.id);

  const [nameTa, nameEn] = splitBilingual(product.name, "|");
  const hasDistinctSubName = Boolean(nameEn && nameEn !== nameTa);
  const [taDesc, enDesc] = splitBilingual(product.description, "||");
  const hasDistinctDesc = Boolean(enDesc && enDesc !== taDesc);
  const alt = hasDistinctSubName ? `${nameTa} — ${nameEn}` : nameTa;

  const bookMeta = product.dimensions_json?.book || {};
  const author =
    product.author ||
    bookMeta.author ||
    (typeof product.safety_info === "string" && !product.safety_info.includes("•")
      ? product.safety_info
      : null);
  const publisher =
    bookMeta.publisher || "முத்தமிழறிஞர் பதிப்பகம் / Muthamilarignar Pathipagam";
  const language = bookMeta.language || "தமிழ் (Tamil)";
  const pages = bookMeta.pages || null;
  const binding =
    bookMeta.binding ||
    (product.safety_info?.includes("Hardcover") ? "Hardcover" : "Paperback");
  const isbn = bookMeta.isbn || product.sku || null;
  const year = bookMeta.year || null;

  const allImages = Array.from(
    new Set([product.image_url, ...(product.images || [])].filter(Boolean)),
  ) as string[];
  const primaryCover = allImages[0] || "";

  return (
    <div className="bg-white pb-24 sm:pb-12">
      {/* Breadcrumb */}
      <section className="container-site pt-6 pb-4">
        <nav
          className="text-[13px] text-black/55 flex items-center flex-wrap gap-1.5"
          aria-label="Breadcrumb"
        >
          <Link href={`/${tenant}`} prefetch={false} className="hover:text-brand-red transition-colors">
            <T ta="முகப்பு" en="Home" />
          </Link>
          <span className="opacity-40">/</span>
          <Link
            href={`/${tenant}/products`}
            prefetch={false}
            className="hover:text-brand-red transition-colors"
          >
            <T ta="நூல்கள்" en="Books" />
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-black font-semibold truncate max-w-[240px] sm:max-w-md">
            <BiName value={product.name} />
          </span>
        </nav>
      </section>

      {/* Main Product Info & Gallery */}
      <section className="container-site py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Gallery: Pure SSR LCP cover when single image; interactive island when multi-image */}
          <div className="lg:col-span-5">
            {allImages.length > 1 ? (
              <BookGalleryIsland images={allImages} alt={alt} onSale={onSale} />
            ) : (
              <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-2xl bg-[#fafafa] border border-black/[0.08] overflow-hidden shadow-card">
                {onSale && (
                  <span className="absolute left-4 top-4 z-10 rounded-full bg-brand-red px-3 py-1 text-[11.5px] font-bold text-white shadow-sm">
                    <T ta="தள்ளுபடி" en="SALE" />
                  </span>
                )}
                {primaryCover ? (
                  <Image
                    src={primaryCover}
                    alt={alt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 90vw, 448px"
                    className="object-contain p-6"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-black/40">
                    <T ta="படம் இல்லை" en="No image" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Book Info & Purchase Panel */}
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wider text-brand-red">
              <T ta="அதிகாரப்பூர்வ பதிப்பு" en="Official Edition" />
            </span>

            <h1 className="mt-3 text-[28px] sm:text-[38px] font-extrabold leading-[1.18] tracking-tight text-[#111]">
              <BiName value={product.name} />
            </h1>
            {hasDistinctSubName && (
              <p className="mt-1.5 text-[17px] font-medium text-black/60">
                <BiSubName value={product.name} />
              </p>
            )}
            {author && (
              <p className="mt-2 text-[15px] font-semibold text-black/80">
                <span className="text-black/50 font-normal">
                  <T ta="ஆசிரியர்:" en="Author:" />
                </span>{" "}
                {author}
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
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  <T ta="கையிருப்பில் உள்ளது" en="In Stock & Ready to Ship" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[13px] text-red-600 font-semibold ml-2">
                  ● <T ta="கையிருப்பில் இல்லை" en="Currently Out of Stock" />
                </span>
              )}
            </div>

            {/* Client Island: Quantity Selector, Add to Cart, Buy Now & Mobile Sticky Bar */}
            <BookPurchaseIslands
              tenant={tenant}
              productId={String(product.id)}
              productName={String(product.name || "")}
              unitPriceCents={price}
              inStock={inStock}
              isFallback={isFallback}
            />

            {/* Book Details Table */}
            <div className="mt-8 rounded-2xl border border-black/10 bg-[#fafafa] p-5 text-[14px]">
              <h3 className="font-bold text-black mb-3 text-[15px]">
                <T ta="நூல் விவரங்கள்" en="Book Details" />
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {author && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">
                      <T ta="ஆசிரியர்" en="Author" />
                    </dt>
                    <dd className="font-semibold text-black text-right">{author}</dd>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">
                    <T ta="பதிப்பகம்" en="Publisher" />
                  </dt>
                  <dd className="font-semibold text-black text-right">{publisher}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">
                    <T ta="மொழி" en="Language" />
                  </dt>
                  <dd className="font-semibold text-black text-right">{language}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">
                    <T ta="கட்டமைப்பு" en="Binding" />
                  </dt>
                  <dd className="font-semibold text-black text-right">{binding}</dd>
                </div>
                {pages && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">
                      <T ta="பக்கங்கள்" en="Pages" />
                    </dt>
                    <dd className="font-semibold text-black text-right">{pages}</dd>
                  </div>
                )}
                {isbn && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">
                      <T ta="ISBN / குறியீடு" en="ISBN / Code" />
                    </dt>
                    <dd className="font-semibold text-black text-right">{isbn}</dd>
                  </div>
                )}
                {year && (
                  <div className="flex justify-between border-b border-black/[0.06] pb-2">
                    <dt className="text-black/60">
                      <T ta="பதிப்பு ஆண்டு" en="Publication Year" />
                    </dt>
                    <dd className="font-semibold text-black text-right">{year}</dd>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/60">
                    <T ta="விநியோகம்" en="Delivery" />
                  </dt>
                  <dd className="font-semibold text-black text-right">
                    <T ta="இந்தியா முழுவதும்" en="Pan-India Courier" />
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description / Synopsis */}
            {(taDesc || enDesc) && (
              <div className="mt-8">
                <h3 className="text-[17px] font-bold text-black mb-2">
                  <T ta="நூல் அறிமுகம்" en="About the Book" />
                </h3>
                <p className="text-[15px] leading-relaxed text-black/75 whitespace-pre-line">
                  <T ta={taDesc || enDesc} en={enDesc || taDesc} />
                </p>
                {hasDistinctDesc && (
                  <div className="mt-4 rounded-xl bg-black/[0.02] border border-black/[0.06] p-4 text-[13.5px] leading-relaxed text-black/65">
                    <T ta={enDesc} en={taDesc} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <section className="cv-auto container-site mt-16 pt-12 border-t border-black/10">
          <div className="mb-8">
            <span className="eyebrow">
              <T ta="தொடர்புடைய நூல்கள்" en="Related Titles" />
            </span>
            <h2 className="mt-1 text-[26px] font-extrabold text-black sm:text-[32px]">
              <T ta="இதே பிரிவின் பிற நூல்கள்" en="Books in the Same Category" />
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {relatedBooks.map((b) => (
              <ProductCard key={b.id} product={toCardProduct(b)} tenant={tenant} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
