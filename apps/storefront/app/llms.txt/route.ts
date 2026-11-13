import { NextResponse } from "next/server";
import { DEFAULT_TENANT, SITE_URL } from "@/lib/site-defaults";
import { buildLlmsMarkdown } from "@/lib/llms-txt";

export const revalidate = 3600;

export async function GET() {
  const body = await buildLlmsMarkdown(DEFAULT_TENANT, SITE_URL);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
