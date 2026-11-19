/**
 * Pure index helpers for the hero featured-books carousel.
 * Kept dependency-free so they can be unit-tested with `node --test`.
 */

/** Wrap any integer into the range [0, count). Returns 0 for empty lists. */
export function wrapIndex(index: number, count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return ((Math.trunc(index) % count) + count) % count;
}

/** Next index, looping from the last item back to the first. */
export function nextIndex(current: number, count: number): number {
  return wrapIndex(current + 1, count);
}

/** Previous index, looping from the first item back to the last. */
export function prevIndex(current: number, count: number): number {
  return wrapIndex(current - 1, count);
}

/**
 * Shortest signed distance from the active slide to `index` on a loop.
 * 0 = front, -1 = immediately left, +1 = immediately right, etc.
 */
export function circularOffset(index: number, active: number, count: number): number {
  if (count <= 0) return 0;
  let diff = wrapIndex(index, count) - wrapIndex(active, count);
  const half = count / 2;
  if (diff > half) diff -= count;
  if (diff < -half) diff += count;
  // With an even count the opposite slide is ambiguous; keep it on the right.
  if (diff === -half) diff = half;
  return diff;
}

/** Truthful whole-number discount for a single book, or 0 when not on sale. */
export function discountPercent(priceCents: number, saleCents?: number | null): number {
  if (!saleCents || !priceCents || priceCents <= 0 || saleCents >= priceCents) return 0;
  return Math.max(1, Math.round(((priceCents - saleCents) / priceCents) * 100));
}
