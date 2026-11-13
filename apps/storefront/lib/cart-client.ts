import {
  getCartSessionId,
  isUuidProductId,
  PRODUCT_UUID_RE,
} from "./cart-session";

export { getCartSessionId, isUuidProductId, PRODUCT_UUID_RE };

function resolveClientApiBase(): string {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const trimmed = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
      return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
    }
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "/api/v1";
    }
  }
  return "http://localhost:8000/api/v1";
}

function purgeLegacyLocalCart() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("mp_fallback_cart");
  } catch {
    // ignore storage errors
  }
}

/**
 * Ultra-lightweight native fetch addToCart that does NOT import Axios or catalog fallback,
 * keeping the critical JS bundle on home and catalog pages under 100 kB.
 */
export async function quickAddToCart(tenant: string, productId: string, quantity = 1) {
  purgeLegacyLocalCart();

  if (!isUuidProductId(productId)) {
    throw new Error("Store is temporarily unavailable, try again");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant": tenant,
    "X-Cart-Session-ID": getCartSessionId(),
  };
  if (typeof window !== "undefined") {
    try {
      const token = window.localStorage.getItem("store_access_token");
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore storage errors
    }
  }

  let res: Response;
  try {
    const apiBase = resolveClientApiBase();
    res = await fetch(`${apiBase}/cart/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  } catch {
    throw new Error("Store is temporarily unavailable, try again");
  }

  if (!res.ok) {
    let errMsg = "Store is temporarily unavailable, try again";
    try {
      const body = await res.json();
      const raw = body?.error || body?.detail || body?.message;
      if (Array.isArray(raw)) {
        errMsg = raw.map((d: any) => d?.msg || JSON.stringify(d)).join(", ");
      } else if (typeof raw === "string" && raw.trim()) {
        errMsg = raw;
      }
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errMsg);
  }

  return await res.json();
}
