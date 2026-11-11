import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerApiUrl } from "@/lib/catalog-fallback";

export const dynamic = "force-dynamic";

type Tenant = { slug: string; name: string };

const RESERVED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

async function resolveTenantByHost(host: string): Promise<string | null> {
  if (
    !host ||
    RESERVED_HOSTS.has(host) ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".onrender.com") ||
    host.endsWith(".netlify.app") ||
    host.endsWith(".lhr.life")
  ) {
    return null;
  }
  const apiUrl = getServerApiUrl();
  try {
    const res = await fetch(
      `${apiUrl}/public/resolve?host=${encodeURIComponent(host)}`,
      {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.tenant === "string" && data.tenant ? data.tenant : null;
  } catch {
    return null;
  }
}

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
  const rawHost = headers().get("x-forwarded-host") || headers().get("host") || "";
  const host = rawHost.split(",")[0].trim().split(":")[0].toLowerCase();

  const hostTenant = await resolveTenantByHost(host);
  if (hostTenant) {
    redirect(`/${hostTenant}`);
  }

  const tenants = await fetchTenants();
  if (tenants.length >= 1) {
    redirect(`/${tenants[0].slug}`);
  }

  redirect(`/${process.env.NEXT_PUBLIC_DEMO_TENANT || "demo-store"}`);
}
