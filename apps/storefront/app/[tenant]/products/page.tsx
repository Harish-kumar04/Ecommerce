import BooksCatalogClient from "@/components/product/books-catalog-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchCatalogData(tenant: string) {
  try {
    const headers = { "X-Tenant": tenant };
    const [prodRes, catRes] = await Promise.all([
      fetch(`${API_URL}/public/products`, {
        headers,
        next: { revalidate: 10 },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_URL}/public/categories`, {
        headers,
        next: { revalidate: 30 },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]);
    const products = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
    const categories = Array.isArray(catRes) ? catRes : catRes?.data || [];
    return { products, categories };
  } catch {
    return { products: [], categories: [] };
  }
}

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
  const { products, categories } = await fetchCatalogData(params.tenant);

  return (
    <BooksCatalogClient
      tenant={params.tenant}
      products={products}
      categories={categories}
    />
  );
}