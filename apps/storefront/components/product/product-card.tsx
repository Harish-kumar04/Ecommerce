import Image from "@/components/ui/img";
import Link from "next/link";
import { BiName, BiSubName, T } from "@/components/i18n/t";
import { splitBilingual } from "@/lib/i18n";

/** The only product fields a card needs (keeps RSC/client payloads small). */
export interface CardProduct {
  id: string;
  name: string;
  price_cents: number;
  sale_price_cents?: number | null;
  image_url?: string | null;
  images?: string[] | null;
}

export function toCardProduct(p: any): CardProduct {
  return {
    id: String(p.id),
    name: String(p.name ?? ""),
    price_cents: Number(p.price_cents) || 0,
    sale_price_cents: p.sale_price_cents ?? null,
    image_url: p.images?.[0] || p.image_url || null,
  };
}

const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

/**
 * Book card. Hook-free and server-safe (renders in Server Components with zero JS),
 * but also usable inside client components such as the catalogue filter.
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
  const onSale = Boolean(product.sale_price_cents && product.sale_price_cents < product.price_cents);
  const price = onSale ? (product.sale_price_cents as number) : product.price_cents;
  const imgSrc = product.images?.[0] || product.image_url;
  const alt = splitBilingual(product.name, "|").join(" — ");

  return (
    <Link href={`/${tenant}/products/${product.id}`} className="card-glow group flex flex-col overflow-hidden">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#fafafa]">
        {onSale && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-brand-red px-2.5 py-0.5 text-[11px] font-bold text-white">
            <T ta="தள்ளுபடி" en="SALE" />
          </span>
        )}
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04] sm:p-5"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-black/40">
            <T ta="படம் இல்லை" en="No cover" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-black transition-colors group-hover:text-brand-red sm:text-[16px]">
            <BiName value={product.name} />
          </h3>
          <p className="mt-1 line-clamp-1 text-[12.5px] text-black/55">
            <BiSubName value={product.name} />
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-extrabold text-brand-red">{rupees(price)}</span>
            {onSale && <span className="text-[12.5px] text-black/40 line-through">{rupees(product.price_cents)}</span>}
          </div>
          <span className="inline-flex items-center rounded-full border border-brand-red/30 px-3 py-1 text-[12px] font-semibold text-brand-red transition-colors group-hover:border-brand-red group-hover:bg-brand-red group-hover:text-white">
            <T ta="வாங்க" en="Buy" />
          </span>
        </div>
      </div>
    </Link>
  );
}