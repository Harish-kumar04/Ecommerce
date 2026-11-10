import { notFound } from "next/navigation";
import HomeClient from "../../components/home-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchTenantData(tenant: string) {
  try {
    const headers: Record<string, string> = { "X-Tenant": tenant };
    const [productsRes, storeRes, categoriesRes] = await Promise.all([
      fetch(`${API_URL}/public/products`, {
        headers,
        next: { revalidate: 10 },
      })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API_URL}/public/store`, {
        headers,
        next: { revalidate: 10 },
      })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API_URL}/public/categories`, {
        headers,
        next: { revalidate: 10 },
      })
        .then((r) => r.json())
        .catch(() => null),
    ]);
    const products = Array.isArray(productsRes)
      ? productsRes
      : productsRes?.data || productsRes?.items || [];
    const store = Array.isArray(storeRes)
      ? storeRes[0]
      : storeRes?.data?.[0] || storeRes;
    const categories = Array.isArray(categoriesRes)
      ? categoriesRes
      : categoriesRes?.data || [];
    return { products, store, categories };
  } catch {
    return { products: [], store: null, categories: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: { tenant: string };
}) {
  const { store } = await fetchTenantData(params.tenant);
  const title =
    "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம் — Official Bookstore";
  const description =
    store?.description ||
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam";
  const canonical = store?.custom_domain
    ? `https://${store.custom_domain}`
    : `https://${params.tenant}.infalette.com`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function TenantPage({
  params,
}: {
  params: { tenant: string };
}) {
  const { tenant } = params;
  if (!tenant) notFound();
  const { products, store, categories } = await fetchTenantData(tenant);

  return (
    <>
      <HomeClient
        tenant={tenant}
        products={products}
        categories={categories}
        store={store}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BookStore",
            name: "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்",
            url: `https://${store?.custom_domain || `${tenant}.infalette.com`}`,
          }),
        }}
      />
    </>
  );
}