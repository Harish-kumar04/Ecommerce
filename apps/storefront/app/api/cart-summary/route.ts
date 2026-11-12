import { NextRequest, NextResponse } from "next/server";
import { getServerApiUrl } from "@/lib/catalog-fallback";

/**
 * GET /api/cart-summary?tenant=demo-store
 *
 * Proxies the public cart endpoint to compute a compact summary
 * (item count + total) the storefront header can use to render a live
 * cart badge. Forwards the cart session id cookie/header so guest
 * carts work the same as on the cart page.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenant = req.nextUrl.searchParams.get("tenant") || "";
  if (!tenant) {
    return NextResponse.json({ count: 0, totalCents: 0 });
  }
  const sessionKey =
    req.cookies.get("cart_session_id")?.value ||
    req.cookies.get("infalette-cart-session")?.value ||
    req.headers.get("x-cart-session-id") ||
    req.headers.get("X-Cart-Session-ID") ||
    "";

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const headers: Record<string, string> = { "X-Tenant": tenant };
  if (sessionKey) {
    headers["X-Cart-Session-ID"] = sessionKey;
  }
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  try {
    const res = await fetch(`${getServerApiUrl()}/cart/`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ count: 0, totalCents: 0 });
    }
    const data = await res.json();
    const items: any[] = data?.items || [];
    const count = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
    const totalCents =
      data?.total_cents ??
      items.reduce(
        (sum: number, it: any) => sum + (it.price_cents ?? 0) * (it.quantity ?? 1),
        0,
      );
    return NextResponse.json({ count, totalCents });
  } catch {
    return NextResponse.json({ count: 0, totalCents: 0 });
  }
}