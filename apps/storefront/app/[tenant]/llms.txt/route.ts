import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site-defaults";
import { buildLlmsMarkdown } from "@/app/llms.txt/route";

export async function GET(
  req: NextRequest,
  { params }: { params: { tenant: string } },
) {
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseOrigin = host ? `${protocol}://${host}` : SITE_URL;
  const body = await buildLlmsMarkdown(params.tenant, baseOrigin);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
