import { splitBilingual } from "@/lib/i18n";
import { BRAND, DEFAULT_SOCIAL, SITE_URL } from "@/lib/site-defaults";

/**
 * Canonical publisher entity facts kept 100% identical across Organization, BookStore,
 * About, Author, Policy, FAQ, Footer, and /llms.txt surfaces.
 */
export const PUBLISHER_ENTITY = {
  nameTa: BRAND.nameTa,
  nameEn: BRAND.nameEn,
  legalName: `${BRAND.nameTa} | ${BRAND.nameEn}`,
  email: DEFAULT_SOCIAL.email,
  phoneE164: "+91-90033-24473",
  phoneDisplay: DEFAULT_SOCIAL.whatsappDisplay,
  whatsappDigits: DEFAULT_SOCIAL.whatsapp,
  sameAs: [DEFAULT_SOCIAL.facebook],
  address: {
    streetAddress: "Anna Arivalayam Campus, Teynampet",
    addressLocality: "Chennai",
    addressRegion: "Tamil Nadu",
    postalCode: "600018",
    addressCountry: "IN",
  },
  addressLineTa: "அண்ணா அறிவாலய வளாகம், தேனாம்பேட்டை, சென்னை – 600018, தமிழ்நாடு, இந்தியா",
  addressLineEn: "Anna Arivalayam Campus, Teynampet, Chennai – 600018, Tamil Nadu, India",
} as const;

export function absoluteUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
}

export function bookSlugOrId(product: { id?: string; slug?: string | null }): string {
  const cleanSlug = String(product?.slug || "").trim();
  return cleanSlug || String(product?.id || "");
}

export function bookPath(tenant: string, product: { id?: string; slug?: string | null }): string {
  return `/${tenant}/books/${encodeURIComponent(bookSlugOrId(product))}`;
}

export function bookCanonicalUrl(
  tenant: string,
  product: { id?: string; slug?: string | null },
): string {
  return `${SITE_URL}${bookPath(tenant, product)}`;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbNode(items: BreadcrumbItem[], id?: string) {
  return {
    "@type": "BreadcrumbList",
    ...(id ? { "@id": id } : {}),
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function buildOrganizationNodes(tenant: string) {
  const homeUrl = `${SITE_URL}/${tenant}`;
  const logoUrl = `${SITE_URL}/logo.jpg`;
  const orgId = `${SITE_URL}/#organization`;
  const storeId = `${homeUrl}#bookstore`;

  const postalAddress = {
    "@type": "PostalAddress",
    streetAddress: PUBLISHER_ENTITY.address.streetAddress,
    addressLocality: PUBLISHER_ENTITY.address.addressLocality,
    addressRegion: PUBLISHER_ENTITY.address.addressRegion,
    postalCode: PUBLISHER_ENTITY.address.postalCode,
    addressCountry: PUBLISHER_ENTITY.address.addressCountry,
  };

  return [
    {
      "@type": "Organization",
      "@id": orgId,
      name: PUBLISHER_ENTITY.nameEn,
      alternateName: PUBLISHER_ENTITY.nameTa,
      url: homeUrl,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
        width: 1024,
        height: 1021,
      },
      email: PUBLISHER_ENTITY.email,
      telephone: PUBLISHER_ENTITY.phoneE164,
      address: postalAddress,
      sameAs: [...PUBLISHER_ENTITY.sameAs],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: PUBLISHER_ENTITY.phoneE164,
        email: PUBLISHER_ENTITY.email,
        areaServed: "IN",
        availableLanguage: ["Tamil", "English"],
      },
    },
    {
      "@type": "BookStore",
      "@id": storeId,
      name: `${PUBLISHER_ENTITY.nameTa} | ${PUBLISHER_ENTITY.nameEn}`,
      image: logoUrl,
      url: homeUrl,
      telephone: PUBLISHER_ENTITY.phoneE164,
      email: PUBLISHER_ENTITY.email,
      priceRange: "₹40 - ₹2000",
      currenciesAccepted: "INR",
      paymentAccepted: "Cash on Delivery, UPI, Credit Card, Debit Card, NetBanking",
      address: postalAddress,
      parentOrganization: { "@id": orgId },
      sameAs: [...PUBLISHER_ENTITY.sameAs],
    },
  ];
}

export function buildHomeJsonLd(tenant: string) {
  const homeUrl = `${SITE_URL}/${tenant}`;
  const orgId = `${SITE_URL}/#organization`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      ...buildOrganizationNodes(tenant),
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        url: homeUrl,
        name: `${PUBLISHER_ENTITY.nameTa} | ${PUBLISHER_ENTITY.nameEn}`,
        inLanguage: ["ta-IN", "en-IN"],
        publisher: { "@id": orgId },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${homeUrl}/books?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      buildBreadcrumbNode([{ name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: homeUrl }], `${homeUrl}#breadcrumb`),
    ],
  };
}

export function buildListingJsonLd({
  tenant,
  url,
  listName,
  books,
  breadcrumbs,
}: {
  tenant: string;
  url: string;
  listName: string;
  books: any[];
  breadcrumbs: BreadcrumbItem[];
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbNode(breadcrumbs, `${url}#breadcrumb`),
      {
        "@type": "ItemList",
        "@id": `${url}#itemlist`,
        name: listName,
        numberOfItems: books.length,
        itemListElement: books.slice(0, 100).map((b, idx) => {
          const [ta, en] = splitBilingual(b.name, "|");
          return {
            "@type": "ListItem",
            position: idx + 1,
            url: bookCanonicalUrl(tenant, b),
            name: en && en !== ta ? `${ta} | ${en}` : ta,
          };
        }),
      },
    ],
  };
}

function normalizeIsbn(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/[^0-9Xx]/g, "").toUpperCase();
  if (digits.length === 10 || digits.length === 13) return digits;
  return undefined;
}

export function buildBookJsonLd({ tenant, product }: { tenant: string; product: any }) {
  const homeUrl = `${SITE_URL}/${tenant}`;
  const booksUrl = `${homeUrl}/books`;
  const canonicalUrl = bookCanonicalUrl(tenant, product);
  const orgId = `${SITE_URL}/#organization`;

  const [nameTa, nameEn] = splitBilingual(product.name, "|");
  const [descTa, descEn] = splitBilingual(product.description, "||");
  const effectivePriceCents =
    product.sale_price_cents && product.sale_price_cents < product.price_cents
      ? product.sale_price_cents
      : product.price_cents;
  const inStock = Number(product.inventory_quantity ?? product.inventory ?? 1) > 0;
  const image = absoluteUrl(product.image_url || product.images?.[0]);

  const bookMeta = product.dimensions_json?.book || {};
  const rawAuthor =
    product.author ||
    bookMeta.author ||
    (typeof product.safety_info === "string" && !product.safety_info.includes("•")
      ? product.safety_info
      : null);
  const cleanIsbn = normalizeIsbn(bookMeta.isbn || product.isbn || product.sku);
  const pages = Number(bookMeta.pages || 0);
  const isHardcover =
    String(bookMeta.binding || product.safety_info || "")
      .toLowerCase()
      .includes("hardcover");

  // Only include AggregateRating when genuine verified review metrics exist.
  const reviewCount = Number(product.review_count ?? product.reviews_count ?? 0);
  const ratingValue = Number(product.rating_average ?? product.rating ?? 0);
  const hasRealReviews = reviewCount > 0 && ratingValue > 0 && ratingValue <= 5;

  const bookNode: Record<string, any> = {
    "@type": ["Product", "Book"],
    "@id": `${canonicalUrl}#book`,
    url: canonicalUrl,
    name: nameTa,
    ...(nameEn && nameEn !== nameTa ? { alternateName: nameEn } : {}),
    description: descTa || descEn || `${nameTa} — published by ${PUBLISHER_ENTITY.nameEn}`,
    ...(image ? { image: [image] } : {}),
    sku: product.sku || String(product.id),
    ...(cleanIsbn ? { isbn: cleanIsbn } : {}),
    inLanguage: "ta",
    bookFormat: isHardcover
      ? "https://schema.org/Hardcover"
      : "https://schema.org/Paperback",
    ...(pages > 0 ? { numberOfPages: pages } : {}),
    author: rawAuthor
      ? { "@type": "Person", name: String(rawAuthor) }
      : { "@type": "Organization", name: PUBLISHER_ENTITY.nameEn, "@id": orgId },
    publisher: {
      "@type": "Organization",
      "@id": orgId,
      name: `${PUBLISHER_ENTITY.nameTa} | ${PUBLISHER_ENTITY.nameEn}`,
      url: homeUrl,
    },
    brand: {
      "@type": "Brand",
      name: PUBLISHER_ENTITY.nameEn,
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "INR",
      price: ((effectivePriceCents || 0) / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        "@id": orgId,
        name: PUBLISHER_ENTITY.nameEn,
      },
    },
    ...(hasRealReviews
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingValue.toFixed(1),
            reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      ...buildOrganizationNodes(tenant),
      bookNode,
      buildBreadcrumbNode(
        [
          { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: homeUrl },
          { name: "நூல்கள் | Books", url: booksUrl },
          { name: nameEn && nameEn !== nameTa ? `${nameTa} | ${nameEn}` : nameTa, url: canonicalUrl },
        ],
        `${canonicalUrl}#breadcrumb`,
      ),
    ],
  };
}
