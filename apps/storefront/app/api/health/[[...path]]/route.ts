import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBoundBackendOrigin(): string {
  const raw =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  return raw.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path?: string[] } },
) {
  const subpath = params?.path?.length ? `/${params.path.join("/")}` : "";
  const targetUrl = `${getBoundBackendOrigin()}/health${subpath}`;
  try {
    const res = await fetch(targetUrl, { cache: "no-store" });
    const body = await res.arrayBuffer();
    const headers = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    return new NextResponse(body, { status: res.status, headers });
  } catch (err: any) {
    return NextResponse.json(
      { status: "degraded", detail: "Backend health unreachable", error: err?.message },
      { status: 502 },
    );
  }
}
