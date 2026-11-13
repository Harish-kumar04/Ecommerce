"use client";

/**
 * Tiny event bus + counter helpers for the storefront cart.
 *
 * Components (header badge, cart page, drawer, etc.) listen on
 * `window` for the `infalette-cart-changed` event. The
 * `refreshCartCount()` helper calls the public cart endpoint and
 * updates `localStorage['infalette-cart-count']`. Components that
 * want a fast, offline-capable counter can subscribe to that key.
 */

export const CART_COUNT_KEY = "infalette-cart-count";
export const CART_TOTAL_KEY = "infalette-cart-total";

type CartSummary = {
  count: number;
  totalCents: number;
};

let inFlight: Promise<void> | null = null;

function emit(tenant?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("infalette-cart-changed", { detail: { tenant } }));
  // Cross-tab ping via BroadcastChannel
  try {
    const bc = new BroadcastChannel("infalette-cart");
    bc.postMessage({ tenant });
    bc.close();
  } catch {
    /* unsupported */
  }
  // Last-ditch cross-tab sync (fallback)
  try {
    localStorage.setItem("infalette-cart-bus", String(Date.now()));
  } catch {
    /* ignore quota errors */
  }
}

export function notifyCartChanged(tenant?: string) {
  emit(tenant);
}

/**
 * Optimistically adjust the client-side cart badge & total before the server responds.
 * Returns a rollback function to restore previous values if the request fails.
 */
export function optimisticAdjustCart(deltaCount: number, deltaCents = 0): () => void {
  if (typeof window === "undefined") return () => {};
  const prev = readFromStorage();
  const nextCount = Math.max(0, prev.count + deltaCount);
  const nextTotal = Math.max(0, prev.totalCents + deltaCents);
  try {
    localStorage.setItem(CART_COUNT_KEY, String(nextCount));
    localStorage.setItem(CART_TOTAL_KEY, String(nextTotal));
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent("infalette-cart-optimistic"));
  return () => {
    try {
      localStorage.setItem(CART_COUNT_KEY, String(prev.count));
      localStorage.setItem(CART_TOTAL_KEY, String(prev.totalCents));
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent("infalette-cart-optimistic"));
  };
}

export function openMiniCart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("infalette-open-mini-cart"));
}

export function closeMiniCart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("infalette-close-mini-cart"));
}

/**
 * Fetch the current cart and update the count + total in localStorage.
 * Safe to call repeatedly; concurrent calls coalesce into one request.
 */
export async function refreshCartCount(tenant?: string): Promise<CartSummary> {
  if (typeof window === "undefined") return { count: 0, totalCents: 0 };
  if (inFlight) {
    await inFlight;
    return readFromStorage();
  }
  inFlight = (async () => {
    try {
      const sessionKey =
        window.localStorage.getItem("cart_session_id") ||
        window.localStorage.getItem("infalette-cart-session-id") ||
        "";
      const token = window.localStorage.getItem("store_access_token") || "";
      if (!sessionKey && !token) {
        localStorage.setItem(CART_COUNT_KEY, "0");
        localStorage.setItem(CART_TOTAL_KEY, "0");
        return;
      }
      const t = tenant || (window.location.pathname.split("/")[1] || "");
      const headers: Record<string, string> = {};
      if (sessionKey) headers["X-Cart-Session-ID"] = sessionKey;
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/cart-summary?tenant=${encodeURIComponent(t)}`, {
        cache: "no-store",
        headers,
      });
      if (!res.ok) return;
      const data: CartSummary = await res.json();
      localStorage.setItem(CART_COUNT_KEY, String(data.count));
      localStorage.setItem(CART_TOTAL_KEY, String(data.totalCents));
      window.dispatchEvent(new CustomEvent("infalette-cart-optimistic"));
    } catch {
      /* offline / SSR — leave whatever was previously cached */
    } finally {
      inFlight = null;
    }
  })();
  await inFlight;
  return readFromStorage();
}

export function readFromStorage(): CartSummary {
  if (typeof window === "undefined") return { count: 0, totalCents: 0 };
  const count = Number(localStorage.getItem(CART_COUNT_KEY) || 0);
  const totalCents = Number(localStorage.getItem(CART_TOTAL_KEY) || 0);
  return { count: Number.isFinite(count) ? count : 0, totalCents: Number.isFinite(totalCents) ? totalCents : 0 };
}