export const WISHLIST_KEY = "mp_wishlist_ids";
export const WISHLIST_EVENT = "mp-wishlist-changed";

export function readWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isWishlisted(productId: string): boolean {
  return readWishlistIds().includes(String(productId));
}

export function toggleWishlistId(productId: string): boolean {
  if (typeof window === "undefined") return false;
  const id = String(productId);
  const current = readWishlistIds();
  const exists = current.includes(id);
  const next = exists ? current.filter((x) => x !== id) : [...current, id];
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent(WISHLIST_EVENT, { detail: { productId: id, saved: !exists } }));
  return !exists;
}
