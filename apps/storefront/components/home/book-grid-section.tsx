import Link from "next/link";
import { T } from "../i18n/t";
import { ArrowRightIcon } from "../brand/icons";
import PageLines from "../brand/page-lines";
import ProductCard, { type CardProduct } from "../product/product-card";

/** A titled grid of book cards (Server Component). */
export default function BookGridSection({
  id,
  tenant,
  books,
  eyebrow,
  title,
  cta,
  columns = "default",
  divider = false,
}: {
  id?: string;
  tenant: string;
  books: CardProduct[];
  eyebrow: { ta: string; en: string };
  title: { ta: string; en: string };
  cta?: { href: string; ta: string; en: string };
  columns?: "default" | "dense";
  divider?: boolean;
}) {
  if (books.length === 0) return null;
  const grid =
    columns === "dense"
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      : "grid-cols-2 lg:grid-cols-4";
  const sizes =
    columns === "dense"
      ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 230px"
      : "(max-width: 1024px) 50vw, 340px";

  return (
    <section id={id} className="container-site scroll-mt-28 pt-14 sm:pt-20">
      {divider && <PageLines className="mb-12 h-6 opacity-70 sm:h-8" />}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div>
          <p className="eyebrow">
            <T ta={eyebrow.ta} en={eyebrow.en} />
          </p>
          <h2 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-black sm:text-[36px] lg:text-[44px]">
            <T ta={title.ta} en={title.en} />
          </h2>
        </div>
        {cta && (
          <Link href={cta.href} className="btn-outline h-11 text-[14.5px]">
            <T ta={cta.ta} en={cta.en} />
            <ArrowRightIcon />
          </Link>
        )}
      </div>
      <div className={`grid gap-4 sm:gap-6 ${grid}`}>
        {books.map((b) => (
          <ProductCard key={b.id} product={b} tenant={tenant} sizes={sizes} />
        ))}
      </div>
    </section>
  );
}
