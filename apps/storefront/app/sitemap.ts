import type { MetadataRoute } from "next";
import { getBooksWithFallback } from "@/lib/catalog-fallback";
import { DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `${SITE_URL}/${DEFAULT_TENANT}`;
  const books = (await getBooksWithFallback(DEFAULT_TENANT)) as any[];
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...books
      .filter((b) => b?.id)
      .map((b) => ({
        url: `${base}/products/${b.id}`,
        lastModified: b.updated_at ? new Date(b.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
  ];
}
