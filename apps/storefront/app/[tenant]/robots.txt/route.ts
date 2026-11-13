import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site-defaults";

const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

export async function GET(
  req: NextRequest,
  { params }: { params: { tenant: string } },
) {
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const base = host ? `${protocol}://${host}` : SITE_URL;

  const disallowBlock = [
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
  ];

  const lines: string[] = [
    "User-agent: *",
    "Allow: /",
    ...disallowBlock,
    "",
    ...AI_CRAWLERS.flatMap((bot) => [
      `User-agent: ${bot}`,
      "Allow: /",
      "Allow: /llms.txt",
      `Allow: /${params.tenant}/llms.txt`,
      ...disallowBlock,
      "",
    ]),
    `Sitemap: ${base}/${params.tenant}/sitemap.xml`,
    "",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
