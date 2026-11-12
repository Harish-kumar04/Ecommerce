import { getCartSessionId } from "./api";

export { getCartSessionId };

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

const LOCAL_CART_KEY = "mp_fallback_cart";

function readLocalCart(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  } catch {}
}

/**
 * Ultra-lightweight native fetch addToCart that does NOT import Axios or catalog fallback,
 * keeping the critical JS bundle on home and catalog pages under 100 kB.
 */
export async function quickAddToCart(tenant: string, productId: string, quantity = 1) {
  try {
    const apiBase = resolveClientApiBase();
    const res = await fetch(`${apiBase}/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant": tenant,
        "X-Cart-Session-ID": getCartSessionId(),
      },
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    if (res.ok) return await res.json();
  } catch {
    // offline / fallback
  }

  // Local storage offline fallback
  const items = readLocalCart();
  const existing = items.find((it) => it.product_id === productId);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + quantity;
  } else {
    items.push({
      id: `item-${productId}`,
      product_id: productId,
      quantity,
    });
  }
  writeLocalCart(items);
  return { items };
}
