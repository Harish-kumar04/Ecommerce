import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site-defaults";

export async function GET(
  req: NextRequest,
  { params }: { params: { tenant: string } },
) {
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const base = host ? `${protocol}://${host}` : SITE_URL;

  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /cart",
    `Disallow: /${params.tenant}/cart`,
    "Disallow: /checkout",
    `Disallow: /${params.tenant}/checkout`,
    "Disallow: /account",
    `Disallow: /${params.tenant}/account`,
    "Disallow: /orders",
    `Disallow: /${params.tenant}/orders`,
    "Disallow: /api/",
    "Disallow: /_next/",
    "",
    `Sitemap: ${base}/${params.tenant}/sitemap.xml`,
    "",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
