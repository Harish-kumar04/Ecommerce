/**
 * Marketing attribution capture (spec §3: attribution coverage 90%+).
 *
 * `captureAttribution()` reads UTM params, click-ids (gclid, fbclid,
 * msclkid, dclid), and the automation checkout links' `rule` param from
 * the current URL and merges them into a per-touch record in
 * localStorage with a 7-day window. The stored attribution is attached
 * to the checkout payload so web orders carry the same campaign/source
 * attribution as social orders.
 *
 * Storage shape: two keys kept side-by-side —
 *   - STORAGE_KEY_FIRST (first-touch): frozen once on the visitor's
 *     first session; never overwritten on subsequent navigations
 *   - STORAGE_KEY_LAST (last-touch): the current/default key, updated
 *     on every navigation with new UTMs/click-ids
 *
 * The first-touch and last-touch payloads are both attached to the
 * checkout (as `attribution` and `attribution_first`) so the funnel
 * analytics dashboard can show "first vs last" alongside.
 */

export interface Attribution {
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  dclid?: string;
  referrer?: string;
  landing_path?: string;
}

const STORAGE_KEY_LAST = "infalette_attribution";
const STORAGE_KEY_FIRST = "infalette_attribution_first";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const CLICK_ID_KEYS = ["gclid", "fbclid", "msclkid", "dclid"] as const;

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) incoming[key] = value;
    }
    for (const key of CLICK_ID_KEYS) {
      const value = params.get(key);
      if (value) incoming[key] = value;
    }
    if (params.get("rule")) incoming.source = "automation";

    const now = Date.now();

    // Last-touch: merge into the existing record (7-day TTL)
    let current: Record<string, unknown> = {};
    const rawLast = window.localStorage.getItem(STORAGE_KEY_LAST);
    if (rawLast) {
      const parsed = JSON.parse(rawLast);
      if (parsed && now - (parsed._ts || 0) < TTL_MS) {
        current = parsed;
      }
    }
    const next: Record<string, unknown> = {
      ...current,
      ...incoming,
      referrer: incoming.utm_source ? current.referrer : document.referrer || current.referrer,
      _ts: now,
    };
    if (!next.source && (next.utm_source || params.get("rule"))) {
      next.source = next.utm_source || "automation";
    }
    next.landing_path = next.landing_path || window.location.pathname;
    window.localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(next));

    // First-touch: write once on the visitor's first visit; never
    // overwritten by subsequent navigations. This is the "real"
    // first-touch attribution for funnel analytics.
    const existingFirst = window.localStorage.getItem(STORAGE_KEY_FIRST);
    if (!existingFirst) {
      const first: Record<string, unknown> = {
        ...incoming,
        referrer: document.referrer || undefined,
        landing_path: window.location.pathname,
        _ts: now,
      };
      if (!first.source && (first.utm_source || params.get("rule"))) {
        first.source = first.utm_source || "automation";
      }
      window.localStorage.setItem(STORAGE_KEY_FIRST, JSON.stringify(first));
    }
  } catch {
    // attribution is best-effort; never break the page
  }
}

export function getStoredAttribution(): Attribution | Record<string, never> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_LAST);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - (parsed._ts || 0) >= TTL_MS) return {};
    // strip private bookkeeping keys
    const { _ts, landing_path, ...rest } = parsed;
    void _ts;
    void landing_path;
    return rest;
  } catch {
    return {};
  }
}

export function getStoredFirstAttribution(): Attribution | Record<string, never> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_FIRST);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // strip private bookkeeping keys
    const { _ts, landing_path, ...rest } = parsed;
    void _ts;
    void landing_path;
    return rest;
  } catch {
    return {};
  }
}
