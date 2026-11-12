import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "");
    const secret = process.env.REVALIDATE_SECRET || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) {
      headers["x-revalidate-secret"] = secret;
    }

    // Call storefront revalidation endpoint; failure must NEVER block the save
    const res = await fetch(`${storefrontUrl}/api/revalidate`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      console.warn("Storefront revalidation network/timeout error (non-blocking):", err.message);
      return null;
    });

    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ success: true, storefront: data });
    }

    return NextResponse.json({
      success: false,
      message: res ? `Storefront responded with status ${res.status}` : "Storefront unreachable",
    });
  } catch (err: any) {
    console.warn("Revalidate storefront server route error (non-blocking):", err?.message);
    return NextResponse.json({ success: false, error: err?.message });
  }
}
