import Image from "@/components/ui/img";
import Link from "next/link";
import { BiName, BiSubName, T } from "@/components/i18n/t";
import { splitBilingual } from "@/lib/i18n";
import CardAddButton from "./card-add-button";
import WishlistButton from "./wishlist-button";

const UUID_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The only product fields a card needs (keeps RSC/client payloads small). */
export interface CardProduct {
  id: string;
  slug?: string | null;
  name: string;
  author?: string | null;
  category_id?: string | null;
  price_cents: number;
  sale_price_cents?: number | null;
  inventory?: number;
  image_url?: string | null;
  images?: string[] | null;
  rating_avg?: number | null;
  review_count?: number | null;
  isFallback?: boolean;
}

export function toCardProduct(p: any): CardProduct {
  const author =
    p.author ||
    p.dimensions_json?.book?.author ||
    (typeof p.safety_info === "string" && p.safety_info.includes("•") ? null : p.safety_info) ||
    null;

  const rawId = String(p.id ?? "");
  const ratingAvg = Number(p.rating_avg ?? p.average_rating ?? 0);
  const reviewCount = Number(p.review_count ?? p.reviews_count ?? 0);

  return {
    id: rawId,
    slug: p.slug ? String(p.slug) : null,
    name: String(p.name ?? ""),
    author: author ? String(author) : null,
    category_id: p.category_id ? String(p.category_id) : null,
    price_cents: Number(p.price_cents) || 0,
    sale_price_cents: p.sale_price_cents ?? null,
    inventory: p.inventory !== undefined ? Number(p.inventory) : Number(p.inventory_quantity ?? 10),
    image_url: p.image_url || p.images?.[0] || null,
    images: Array.isArray(p.images) ? p.images : null,
    rating_avg: ratingAvg > 0 ? ratingAvg : null,
    review_count: reviewCount > 0 ? reviewCount : null,
    isFallback: Boolean(p.is_fallback || p.isFallback) || !UUID_ID_RE.test(rawId.trim()),
  };
}

const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

/**
 * Book card with 3:4 cover, consistent Tamil + English bilingual title,
 * "% OFF" discount badge, stock badge, optional real rating, wishlist heart (>=44px),
 * strike-through MRP, and >=44px "Add to cart" + "Buy now" buttons.
 */
export default function ProductCard({
  product,
  tenant,
  priority = false,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px",
}: {
  product: CardProduct;
  tenant: string;
  priority?: boolean;
  sizes?: string;
}) {
  const inv = product.inventory ?? 10;
  const inStock = inv > 0;
  const lowStock = inStock && inv <= 5;
  const onSale = Boolean(
    product.sale_price_cents &&
      product.price_cents > 0 &&
      product.sale_price_cents < product.price_cents,
  );
  const price = onSale ? (product.sale_price_cents as number) : product.price_cents;
  const discountPct = onSale
    ? Math.max(
        1,
        Math.round(((product.price_cents - (product.sale_price_cents as number)) / product.price_cents) * 100),
      )
    : 0;
  const rawImg = product.image_url || product.images?.[0] || null;
  const [titleTa, titleEn] = splitBilingual(product.name, "|");
  const hasDistinctSub = Boolean(titleEn && titleEn !== titleTa);
  const alt = hasDistinctSub ? `${titleTa} — ${titleEn}` : titleTa;
  const bookHref = `/${tenant}/books/${encodeURIComponent(product.slug || product.id)}`;

  return (
    <article className="card-glow group relative flex flex-col overflow-hidden bg-white">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FAFAFA]">
        {/* Top-left discount / out-of-stock badge */}
        {!inStock ? (
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            <T ta="கையிருப்பில் இல்லை" en="Out of stock" />
          </span>
        ) : onSale ? (
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-[#D11D1A] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm">
            {discountPct}% OFF
          </span>
        ) : null}

        <Link
          href={bookHref}
          prefetch={false}
          aria-label={alt}
          className="block h-full w-full"
        >
          {rawImg ? (
            <Image
              src={rawImg}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className={`object-contain p-3.5 transition-transform duration-300 group-hover:scale-[1.04] sm:p-5 ${
                !inStock ? "opacity-60 grayscale-[40%]" : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-black/55">
              <T ta="படம் இல்லை" en="No cover" />
            </div>
          )}
        </Link>

        {/* Top-right >=44px Wishlist Heart */}
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="absolute right-2.5 top-2.5 z-20"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
        <div>
          <Link href={bookHref} prefetch={false}>
            <h3 className="line-clamp-2 text-[14.5px] font-bold leading-snug text-black transition-colors group-hover:text-brand-red-dark sm:text-[15.5px]">
              <BiName value={product.name} />
            </h3>
          </Link>

          {hasDistinctSub && (
            <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-black/65">
              <BiSubName value={product.name} />
            </p>
          )}

          {product.author && (
            <p className="mt-1 line-clamp-1 text-[11.5px] text-black/60">{product.author}</p>
          )}

          {/* Optional Real Rating */}
          {product.rating_avg ? (
            <div className="mt-1.5 flex items-center gap-1 text-[12px] font-bold text-black">
              <svg viewBox="0 0 20 20" fill="#E52320" aria-hidden="true" className="h-3.5 w-3.5">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{product.rating_avg.toFixed(1)}</span>
              {product.review_count ? (
                <span className="font-normal text-black/60">({product.review_count})</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 border-t border-black/[0.06] pt-2.5">
          {/* Price + Stock Badge Row */}
          <div className="flex flex-wrap items-baseline justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[19px] font-extrabold text-brand-red sm:text-[20px]">
                {rupees(price)}
              </span>
              {onSale && (
                <span className="text-[12.5px] font-medium text-black/55 line-through">
                  {rupees(product.price_cents)}
                </span>
              )}
            </div>

            {inStock ? (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  lowStock ? "text-amber-800" : "text-green-800"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    lowStock ? "bg-amber-600" : "bg-green-600"
                  }`}
                />
                {lowStock ? (
                  <T ta={`இன்னும் ${inv} மட்டுமே`} en={`Only ${inv} left`} />
                ) : (
                  <T ta="கையிருப்பில்" en="In stock" />
                )}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-brand-red-dark">
                <T ta="இருப்பு இல்லை" en="Sold out" />
              </span>
            )}
          </div>

          {/* >=44px Add to Cart & Buy Now */}
          <CardAddButton
            tenant={tenant}
            productId={product.id}
            productName={product.name}
            unitPriceCents={price}
            inStock={inStock}
            isFallback={product.isFallback}
          />
        </div>
      </div>
    </article>
  );
}