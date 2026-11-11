"use client";

export function getCartSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  const KEY = "infalette-cart-session-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "cart_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // ignore
    }
  }
  return id;
}

const LOCAL_CART_KEY = "infalette-local-cart";

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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
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
