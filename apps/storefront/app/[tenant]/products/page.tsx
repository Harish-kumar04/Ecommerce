import BooksCatalogClient from "@/components/product/books-catalog-client";
import {
  getBooksWithFallback,
  getCategoriesWithFallback,
} from "@/lib/catalog-fallback";

export async function generateMetadata({
  params,
}: {
  params: { tenant: string };
}) {
  return {
    title: `Books | முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam`,
    description: `Browse all 27 books published by Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்) — Dravidian movement history, social justice, and Kalaignar literature.`,
    alternates: {
      canonical: `https://${params.tenant}.infalette.com/${params.tenant}/products`,
    },
  };
}

export default async function ProductsPage({
  params,
}: {
  params: { tenant: string };
}) {
  const [products, categories] = await Promise.all([
    getBooksWithFallback(params.tenant),
    getCategoriesWithFallback(params.tenant),
  ]);

  return (
    <BooksCatalogClient
      tenant={params.tenant}
      products={products}
      categories={categories}
    />
  );
}