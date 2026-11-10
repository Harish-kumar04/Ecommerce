import { NextRequest, NextResponse } from "next/server";
import { getServerApiUrl } from "@/lib/catalog-fallback";

export const dynamic = "force-dynamic";

async function proxyToInternalApi(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const subpath = (params.path || []).join("/");
  const baseUrl = getServerApiUrl();
  const targetUrl = new URL(`${baseUrl}/${subpath}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") {
      continue;
    }
    headers.set(key, value);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(targetUrl.toString(), init);
    const body = await res.arrayBuffer();
    const resHeaders = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) resHeaders.set("content-type", contentType);
    return new NextResponse(body, { status: res.status, headers: resHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { detail: "Internal backend service unavailable", error: err?.message },
      { status: 502 },
    );
  }
}

export const GET = proxyToInternalApi;
export const POST = proxyToInternalApi;
export const PUT = proxyToInternalApi;
export const PATCH = proxyToInternalApi;
export const DELETE = proxyToInternalApi;
