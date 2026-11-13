import type { MetadataRoute } from "next";
import {
  fetchBooksSafe,
  getCategoriesWithFallback,
} from "@/lib/catalog-fallback";
import { DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `${SITE_URL}/${DEFAULT_TENANT}`;
  const [booksRes, categories] = await Promise.all([
    fetchBooksSafe(DEFAULT_TENANT),
    getCategoriesWithFallback(DEFAULT_TENANT),
  ]);
  const publishedBooks = booksRes.isFallback
    ? []
    : (booksRes.books as any[]).filter((b) => b?.id || b?.slug);
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/books`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...(categories as any[])
      .filter((c) => c?.slug)
      .map((c) => ({
        url: `${base}/categories/${encodeURIComponent(String(c.slug))}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...publishedBooks.map((b) => ({
      url: `${base}/books/${encodeURIComponent(String(b.slug || b.id))}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
