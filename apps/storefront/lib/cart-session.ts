/**
 * Lightweight guest cart session & UUID product guard (zero external imports).
 * Shared by cart-client.ts, cart-events.ts, and api.ts without pulling heavy modules.
 */

export const PRODUCT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidProductId(id: unknown): boolean {
  return typeof id === "string" && PRODUCT_UUID_RE.test(id.trim());
}

export function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  let id =
    window.localStorage.getItem("cart_session_id") ||
    window.localStorage.getItem("infalette-cart-session-id");
  if (!id) {
    const match = document.cookie.match(
      /(?:^|; )(?:cart_session_id|infalette-cart-session)=([^;]+)/,
    );
    if (match && match[1]) {
      id = decodeURIComponent(match[1]);
    }
  }
  if (!id) {
    id = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  try {
    window.localStorage.setItem("cart_session_id", id);
    window.localStorage.setItem("infalette-cart-session-id", id);
    document.cookie = `cart_session_id=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `infalette-cart-session=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore storage/cookie errors
  }
  return id;
}
