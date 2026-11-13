import { NextRequest, NextResponse } from "next/server";
import {
  fetchBooksSafe,
  getCategoriesWithFallback,
} from "@/lib/catalog-fallback";
import { SITE_URL } from "@/lib/site-defaults";
import { AUTHORS, POLICY_LAST_UPDATED_ISO } from "@/lib/aeo-data";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { tenant: string } },
) {
  const tenant = params.tenant;
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseOrigin = host ? `${protocol}://${host}` : SITE_URL;
  const base = `${baseOrigin}/${tenant}`;

  const [booksRes, categories] = await Promise.all([
    fetchBooksSafe(tenant),
    getCategoriesWithFallback(tenant),
  ]);
  const publishedBooks = booksRes.isFallback
    ? []
    : (booksRes.books as any[]).filter((b) => b?.id || b?.slug);
  const nowIso = new Date().toISOString();
  const policyIso = new Date(POLICY_LAST_UPDATED_ISO).toISOString();

  const entries: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
    { loc: base, lastmod: nowIso, changefreq: "daily", priority: "1.0" },
    { loc: `${base}/books`, lastmod: nowIso, changefreq: "daily", priority: "0.9" },
    { loc: `${base}/about`, lastmod: policyIso, changefreq: "monthly", priority: "0.7" },
    { loc: `${base}/authors`, lastmod: policyIso, changefreq: "monthly", priority: "0.7" },
    ...AUTHORS.map((a) => ({
      loc: `${base}/authors/${a.slug}`,
      lastmod: policyIso,
      changefreq: "monthly",
      priority: "0.7",
    })),
    { loc: `${base}/faq`, lastmod: policyIso, changefreq: "monthly", priority: "0.7" },
    ...(["shipping", "returns", "privacy", "terms"] as const).map((slug) => ({
      loc: `${base}/policies/${slug}`,
      lastmod: policyIso,
      changefreq: "yearly",
      priority: "0.5",
    })),
    ...(categories as any[])
      .filter((c) => c?.slug)
      .map((c) => ({
        loc: `${base}/categories/${encodeURIComponent(String(c.slug))}`,
        lastmod: c.updated_at ? new Date(c.updated_at).toISOString() : nowIso,
        changefreq: "weekly",
        priority: "0.7",
      })),
    ...publishedBooks.map((b) => ({
      loc: `${base}/books/${encodeURIComponent(String(b.slug || b.id))}`,
      lastmod: b.updated_at ? new Date(b.updated_at).toISOString() : nowIso,
      changefreq: "weekly",
      priority: "0.8",
    })),
  ];

  const urlsXml = entries
    .map(
      (u) =>
        `<url><loc>${xmlEscape(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlsXml}</urlset>`;
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
