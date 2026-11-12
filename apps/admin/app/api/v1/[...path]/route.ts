import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBoundBackendUrl(): string {
  const raw =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api/v1";
  const trimmed = raw.replace(/\/$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

async function proxyToInternalApi(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const subpath = (params.path || []).join("/");
  const targetUrl = new URL(`${getBoundBackendUrl()}/${subpath}`);
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
      {
        detail: `Backend API unavailable at ${targetUrl.origin}: ${err?.message || "Connection refused"}. Please check that apps/api is running or set API_URL.`,
        error: err?.message,
      },
      { status: 502 },
    );
  }
}

export const GET = proxyToInternalApi;
export const POST = proxyToInternalApi;
export const PUT = proxyToInternalApi;
export const PATCH = proxyToInternalApi;
export const DELETE = proxyToInternalApi;
