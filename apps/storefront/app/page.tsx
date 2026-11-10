import { redirect } from "next/navigation";
import { getServerApiUrl } from "@/lib/catalog-fallback";

export const dynamic = "force-dynamic";

type Tenant = { slug: string; name: string };

async function fetchTenants(): Promise<Tenant[]> {
  const apiUrl = getServerApiUrl();
  const endpoints = [`${apiUrl}/public/tenants`, `${apiUrl}/public/store`];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : data?.data || data?.items || [];
      if (!Array.isArray(list) || list.length === 0) continue;
      return list
        .filter((t: any) => t && (t.slug || t.tenant_slug))
        .map((t: any) => ({
          slug: t.slug || t.tenant_slug,
          name: t.name || t.tenant_name || t.slug || t.tenant_slug,
        }));
    } catch {
      // try next
    }
  }
  return [];
}

export default async function RootPage() {
  const tenants = await fetchTenants();

  if (tenants.length >= 1) {
    redirect(`/${tenants[0].slug}`);
  }

  redirect(`/${process.env.NEXT_PUBLIC_DEMO_TENANT || "demo-store"}`);
}
