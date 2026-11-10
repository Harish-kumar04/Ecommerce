import { notFound } from "next/navigation";
import HomeClient from "../../components/home-client";
import {
  getBooksWithFallback,
  getCategoriesWithFallback,
  getStoreWithFallback,
} from "@/lib/catalog-fallback";

async function fetchTenantData(tenant: string) {
  const [products, store, categories] = await Promise.all([
    getBooksWithFallback(tenant),
    getStoreWithFallback(tenant),
    getCategoriesWithFallback(tenant),
  ]);
  return { products, store, categories };
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