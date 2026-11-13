import Link from "next/link";
import { T } from "../i18n/t";
import { ArrowRightIcon } from "../brand/icons";
import Sunburst from "../brand/sunburst";
import ProductCard, { type CardProduct } from "../product/product-card";

/** Full-width black "Offers" band on home displaying discounted/sale books. */
export default function OffersBand({
  tenant,
  books,
}: {
  tenant: string;
  books: CardProduct[];
}) {
  if (books.length === 0) return null;

  return (
    <section aria-label="Special Offers" className="cv-auto relative my-16 overflow-hidden bg-black py-16 text-white sm:my-24 sm:py-20">
      <Sunburst className="pointer-events-none absolute -right-20 -top-10 w-96 opacity-[0.14] sm:w-[500px]" />
      <div className="container-site relative">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-red px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <span className="h-2 w-2 rounded-full bg-white" />
              <T ta="சிறப்புச் சலுகைகள்" en="SPECIAL OFFERS" />
            </span>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-[38px] lg:text-[46px]">
              <T ta="தள்ளுபடி விலையில் சிறப்பு நூல்கள்" en="Featured Books On Sale" />
            </h2>
            <p className="mt-2 text-[14.5px] text-white/70 sm:text-[16px]">
              <T
                ta="வரையறுக்கப்பட்ட கால சலுகை விலையில் கிடைக்கும் வரலாற்று வெளியீடுகள்."
                en="Limited-time promotional prices on selected historical works."
              />
            </p>
          </div>
          <Link
            href={`/${tenant}/products?sale=1`}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-[14px] font-semibold text-white transition-colors hover:border-brand-red hover:bg-brand-red"
          >
            <T ta="அனைத்து சலுகைகளும்" en="View all offers" />
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {books.map((b) => (
            <ProductCard key={b.id} product={b} tenant={tenant} />
          ))}
        </div>
      </div>
    </section>
  );
}
