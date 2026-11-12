import Image from "@/components/ui/img";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BiName, BiSubName, T } from "@/components/i18n/t";
import { splitBilingual } from "@/lib/i18n";
import { cloudinaryImageUrl } from "@/lib/site-defaults";

const CardAddButton = dynamic(() => import("./card-add-button"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex h-9 items-center justify-center rounded-full border border-brand-red bg-white px-3 text-[12px] font-bold text-brand-red">
      <T ta="சேர்" en="Add" />
    </span>
  ),
});

/** The only product fields a card needs (keeps RSC/client payloads small). */
export interface CardProduct {
  id: string;
  name: string;
  author?: string | null;
  price_cents: number;
  sale_price_cents?: number | null;
  inventory?: number;
  image_url?: string | null;
  images?: string[] | null;
}

export function toCardProduct(p: any): CardProduct {
  const author =
    p.author ||
    p.dimensions_json?.book?.author ||
    (typeof p.safety_info === "string" && p.safety_info.includes("•") ? null : p.safety_info) ||
    null;

  return {
    id: String(p.id),
    name: String(p.name ?? ""),
    author: author ? String(author) : null,
    price_cents: Number(p.price_cents) || 0,
    sale_price_cents: p.sale_price_cents ?? null,
    inventory: p.inventory !== undefined ? Number(p.inventory) : Number(p.inventory_quantity ?? 10),
    image_url: p.image_url || p.images?.[0] || null,
    images: Array.isArray(p.images) ? p.images : null,
  };
}

const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

/**
 * Book card with 3:4 cover, 2-line Tamil title, author, price + strike,
 * out-of-stock badge, and direct "Add to cart" button.
 */
export default function ProductCard({
  product,
  tenant,
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 22vw, 320px",
}: {
  product: CardProduct;
  tenant: string;
  priority?: boolean;
  sizes?: string;
}) {
  const inStock = product.inventory === undefined || product.inventory > 0;
  const onSale = Boolean(product.sale_price_cents && product.sale_price_cents < product.price_cents);
  const price = onSale ? (product.sale_price_cents as number) : product.price_cents;
  const rawImg = product.image_url || product.images?.[0];
  const imgSrc = rawImg ? cloudinaryImageUrl(rawImg, 900) : null;
  const alt = splitBilingual(product.name, "|").join(" — ");

  return (
    <div className="card-glow group relative flex flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white transition-all duration-200 hover:-translate-y-[2px] hover:border-black/30 hover:shadow-glow">
      <Link href={`/${tenant}/products/${product.id}`} className="relative aspect-[3/4] w-full overflow-hidden bg-[#fafafa]">
        {/* Sale / Out of stock badge */}
        {!inStock ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-black/80 px-2.5 py-0.5 text-[11px] font-bold text-white">
            <T ta="கையிருப்பில் இல்லை" en="Out of stock" />
          </span>
        ) : onSale ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-brand-red px-2.5 py-0.5 text-[11px] font-bold text-white">
            <T ta="தள்ளுபடி" en="SALE" />
          </span>
        ) : null}

        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={`object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04] sm:p-5 ${
              !inStock ? "opacity-60 grayscale-[40%]" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-black/40">
            <T ta="படம் இல்லை" en="No cover" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <Link href={`/${tenant}/products/${product.id}`}>
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#111] transition-colors group-hover:text-brand-red sm:text-[16px]">
              <BiName value={product.name} />
            </h3>
          </Link>
          <p className="mt-1 line-clamp-1 text-[12px] font-medium text-black/60">
            {product.author || <BiSubName value={product.name} />}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/[0.04] pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-extrabold text-brand-red">{rupees(price)}</span>
            {onSale && (
              <span className="text-[12px] text-black/40 line-through">
                {rupees(product.price_cents)}
              </span>
            )}
          </div>

          <CardAddButton
            tenant={tenant}
            productId={product.id}
            productName={product.name}
            inStock={inStock}
          />
        </div>
      </div>
    </div>
  );
}