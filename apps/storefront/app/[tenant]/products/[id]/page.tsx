import { notFound } from "next/navigation";
import BookDetailClient from "@/components/product/book-detail-client";
import { getBookByIdWithFallback } from "@/lib/catalog-fallback";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; id: string };
}) {
  const product = await getBookByIdWithFallback(params.tenant, params.id);
  if (!product) return { title: `Book | Muthamilarignar Pathipagam` };
  const title =
    product.meta_title ||
    `${product.name} | Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்`;
  const description =
    product.meta_description ||
    product.description ||
    `Buy ${product.name} from Muthamilarignar Pathipagam`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.image_url ? [product.image_url] : undefined,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { tenant: string; id: string };
}) {
  const product = await getBookByIdWithFallback(params.tenant, params.id);
  if (!product) notFound();

  const price = product.sale_price_cents || product.price_cents;

  void fetch(`${API_URL}/public/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant": params.tenant },
    body: JSON.stringify({
      event_type: "product.viewed",
      product_id: product.id,
      source: "storefront",
    }),
  }).catch(() => undefined);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: product.name,
    description: product.description || undefined,
    sku: product.sku,
    image: product.image_url ? [product.image_url] : undefined,
    publisher: {
      "@type": "Organization",
      name: "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்",
    },
    inLanguage: "ta",
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (price / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookDetailClient tenant={params.tenant} product={product} />
    </>
  );
}