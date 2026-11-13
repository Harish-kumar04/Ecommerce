import Link from "next/link";
import Image from "@/components/ui/img";
import { BiName, BiSubName, T } from "@/components/i18n/t";
import { splitBilingual } from "@/lib/i18n";
import { isDatabaseProductId } from "@/lib/catalog-fallback";
import ProductCard, { toCardProduct } from "@/components/product/product-card";
import { SectionHeading } from "@/components/brand/patterns";
import {
  BookGalleryIsland,
  BookPurchaseIslands,
  CoverLightboxTrigger,
  PincodeCheckIsland,
  ShareBookBar,
} from "@/components/product/book-detail-islands";

function formatPrice(cents?: number | null) {
  return `₹${Math.round((cents || 0) / 100).toLocaleString("en-IN")}`;
}

/**
 * Server Component book detail layout:
 * Renders the LCP cover image (`fetchpriority="high"`), h1, pricing + % OFF badge,
 * delivery pincode checker, book details table, bilingual synopsis, share buttons,
 * and related books while keeping client JS minimal.
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
    product.sale_price_cents &&
      product.price_cents > 0 &&
      product.sale_price_cents < product.price_cents,
  );
  const price = onSale ? (product.sale_price_cents as number) : product.price_cents;
  const discountPct = onSale
    ? Math.max(
        1,
        Math.round(
          ((product.price_cents - (product.sale_price_cents as number)) / product.price_cents) *
            100,
        ),
      )
    : 0;
  const stockCount = Number(product.inventory_quantity ?? product.inventory ?? 10);
  const inStock = stockCount > 0;
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
          className="flex flex-wrap items-center gap-1.5 text-[13px] text-black/70"
          aria-label="Breadcrumb"
        >
          <Link
            href={`/${tenant}`}
            prefetch={false}
            className="transition-colors hover:text-brand-red-dark"
          >
            <T ta="முகப்பு" en="Home" />
          </Link>
          <span className="opacity-40" aria-hidden="true">
            /
          </span>
          <Link
            href={`/${tenant}/books`}
            prefetch={false}
            className="transition-colors hover:text-brand-red-dark"
          >
            <T ta="நூல்கள்" en="Books" />
          </Link>
          <span className="opacity-40" aria-hidden="true">
            /
          </span>
          <span className="max-w-[240px] truncate font-semibold text-black sm:max-w-md">
            <BiName value={product.name} />
          </span>
        </nav>
      </section>

      {/* Main Product Info & Gallery */}
      <section className="container-site py-4">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Gallery: Pure SSR LCP cover + Zoom Lightbox trigger when single image; multi-image gallery island otherwise */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            {allImages.length > 1 ? (
              <BookGalleryIsland images={allImages} alt={alt} discountPct={discountPct} />
            ) : (
              <div className="mx-auto w-full max-w-[300px] sm:max-w-md">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-black/[0.08] bg-[#FAFAFA] shadow-card">
                  {discountPct > 0 && (
                    <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-[#D11D1A] px-3 py-1 text-[11.5px] font-extrabold text-white shadow-sm">
                      {discountPct}% OFF
                    </span>
                  )}
                  {primaryCover ? (
                    <Image
                      src={primaryCover}
                      alt={alt}
                      width={360}
                      height={480}
                      priority
                      sizes="(max-width: 640px) 280px, 420px"
                      className="h-full w-full object-contain p-5 sm:p-6"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-black/55">
                      <T ta="படம் இல்லை" en="No image" />
                    </div>
                  )}
                </div>
                {primaryCover && (
                  <div className="mt-3 flex justify-center">
                    <CoverLightboxTrigger images={[primaryCover]} alt={alt} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Book Info & Purchase Panel */}
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/25 bg-brand-red-light px-3 py-1 text-[11.5px] font-bold uppercase tracking-wider text-brand-red-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
              <T ta="அதிகாரப்பூர்வ பதிப்பு" en="Official Edition" />
            </span>

            <h1 className="mt-3 text-[28px] font-extrabold leading-[1.18] tracking-tight text-black sm:text-[38px]">
              <BiName value={product.name} />
            </h1>
            {hasDistinctSubName && (
              <p className="mt-1.5 text-[17px] font-medium text-black/70">
                <BiSubName value={product.name} />
              </p>
            )}
            <p className="mt-2 text-[15px] font-semibold text-black/85">
              <span className="font-normal text-black/65">
                <T ta="ஆசிரியர் / பதிப்பகம்:" en="Author / Publisher:" />
              </span>{" "}
              <Link
                href={
                  /kalaignar|karunanidhi|கலைஞர்/i.test(`${product.name || ""} ${author || ""}`)
                    ? `/${tenant}/authors/muthamilarignar-kalaignar`
                    : `/${tenant}/about`
                }
                prefetch={false}
                className="underline decoration-black/25 underline-offset-4 hover:text-brand-red-dark"
              >
                {author || "முத்தமிழறிஞர் பதிப்பகம் / Muthamilarignar Pathipagam"}
              </Link>
            </p>

            {/* Factual AI-Quotable Opening Summary (crawlable visible text) */}
            <p className="mt-3 rounded-xl border border-black/[0.08] bg-[#FAFAFA] px-4 py-3 text-[13.5px] leading-relaxed text-black/80">
              <T
                ta={`${nameTa} என்பது ${author || "முத்தமிழறிஞர் பதிப்பகம்"} எழுதி/தொகுத்து முத்தமிழறிஞர் பதிப்பகம் வெளியிட்டுள்ள ${language} (${binding}${pages ? `, ${pages} பக்கங்கள்` : ""}) நூலாகும். ${(taDesc || "").split(".")[0] ? `${(taDesc || "").split(".")[0]}. ` : ""}இந்நூலின் தற்போதைய விலை ${formatPrice(price)} (0% GST, இந்தியா முழுவதும் விநியோகம் & COD வசதி).`}
                en={`${hasDistinctSubName ? `${nameEn} (${nameTa})` : nameTa} is a ${language} ${binding.toLowerCase()} edition${pages ? ` (${pages} pages)` : ""} ${author ? `by ${author}, ` : ""}published by Muthamilarignar Pathipagam, Chennai. ${(enDesc || taDesc || "").split(".")[0] ? `${(enDesc || taDesc || "").split(".")[0]}. ` : ""}Priced at ${formatPrice(price)} INR (0% GST on printed books), available with pan-India delivery and Cash on Delivery.`}
              />
            </p>

            {/* Price, % OFF & Stock Block */}
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-[34px] font-extrabold text-brand-red">
                {formatPrice(price)}
              </span>
              {onSale && (
                <>
                  <span className="text-[18px] text-black/55 line-through">
                    {formatPrice(product.price_cents)}
                  </span>
                  <span className="rounded-full bg-[#D11D1A] px-2.5 py-0.5 text-[12px] font-extrabold text-white">
                    {discountPct}% OFF
                  </span>
                </>
              )}
              {inStock ? (
                <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-[12.5px] font-bold text-green-800">
                  <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden="true" />
                  <T ta="கையிருப்பில் உள்ளது" en="In Stock & Ready to Ship" />
                </span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-brand-red-light border border-brand-red/25 px-3 py-1 text-[12.5px] font-bold text-brand-red-dark">
                  <T ta="கையிருப்பில் இல்லை" en="Currently Out of Stock" />
                </span>
              )}
            </div>

            {/* Client Island: Quantity Stepper, Add to Cart, Buy Now, Wishlist & Mobile Sticky Bar */}
            <BookPurchaseIslands
              tenant={tenant}
              productId={String(product.id)}
              productName={String(product.name || "")}
              unitPriceCents={price}
              inStock={inStock}
              maxStock={stockCount}
              isFallback={isFallback}
            />

            {/* Delivery & Indian Pincode Checker */}
            <PincodeCheckIsland unitPriceCents={price} />

            {/* Book Details Table */}
            <div className="mt-8 rounded-2xl border border-black/10 bg-[#FAFAFA] p-5 text-[14px]">
              <h2 className="mb-3 text-[16px] font-bold text-black">
                <T ta="நூல் விவரங்கள்" en="Book Specifications" />
              </h2>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="ஆசிரியர்" en="Author" />
                  </dt>
                  <dd className="text-right font-semibold text-black">
                    {author || "முத்தமிழறிஞர் பதிப்பகம்"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="பதிப்பகம்" en="Publisher" />
                  </dt>
                  <dd className="text-right font-semibold text-black">{publisher}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="மொழி" en="Language" />
                  </dt>
                  <dd className="text-right font-semibold text-black">{language}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="கட்டமைப்பு" en="Binding" />
                  </dt>
                  <dd className="text-right font-semibold text-black">{binding}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="பக்கங்கள்" en="Pages" />
                  </dt>
                  <dd className="text-right font-semibold text-black">{pages || "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="ISBN / குறியீடு" en="ISBN / Code" />
                  </dt>
                  <dd className="text-right font-semibold text-black">{isbn || "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="பதிப்பு ஆண்டு" en="Publication Year" />
                  </dt>
                  <dd className="text-right font-semibold text-black">{year || "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.06] pb-2">
                  <dt className="text-black/65">
                    <T ta="விநியோகம்" en="Delivery" />
                  </dt>
                  <dd className="text-right font-semibold text-black">
                    <T ta="இந்தியா முழுவதும் (COD உண்டு)" en="Pan-India (COD Available)" />
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description / Synopsis */}
            {(taDesc || enDesc) && (
              <div className="mt-8">
                <h2 className="mb-2 text-[17px] font-bold text-black">
                  <T ta="நூல் அறிமுகம்" en="About the Book" />
                </h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-black/80">
                  <T ta={taDesc || enDesc} en={enDesc || taDesc} />
                </p>
                {hasDistinctDesc && (
                  <div className="mt-4 rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-4 text-[13.5px] leading-relaxed text-black/75">
                    <T ta={enDesc} en={taDesc} />
                  </div>
                )}
              </div>
            )}

            {/* Share Buttons */}
            <ShareBookBar title={alt} />
          </div>
        </div>
      </section>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <section className="cv-auto mt-16 border-t border-black/[0.08] bg-[#FAFAFA] py-14">
          <div className="container-site">
            <div className="mb-8">
              <SectionHeading
                eyebrow={{ ta: "தொடர்புடைய நூல்கள்", en: "Related Titles" }}
                title={{ ta: "இதே பிரிவின் பிற நூல்கள்", en: "Books in the Same Category" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {relatedBooks.map((b) => (
                <ProductCard key={b.id} product={toCardProduct(b)} tenant={tenant} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
