import { cache } from "react";
import { sanitizeBookCovers } from "./site-defaults";

export function getServerApiUrl(): string {
  const bound = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const trimmed = bound.replace(/\/$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export const FALLBACK_CATEGORIES = [
  {
    id: "cat-dravidian-history",
    name: "திராவிட இயக்க வரலாறு | Dravidian Movement History",
    slug: "dravidian-history",
    description:
      "Books on the history, ideology, and struggles of the Dravidian movement and DMK.",
  },
  {
    id: "cat-kalaignar-works",
    name: "கலைஞர் படைப்புகள் | Kalaignar Works & Studies",
    slug: "kalaignar-works",
    description:
      "Biographies, letters, literary works, and political analyses of Muthamilarignar Kalaignar M. Karunanidhi.",
  },
  {
    id: "cat-dravidian-model",
    name: "திராவிட மாடல் & சமூகநீதி | Dravidian Model & Social Justice",
    slug: "dravidian-model-social-justice",
    description:
      "Publications on the Dravidian Model governance, reservation, state autonomy, and language rights.",
  },
  {
    id: "cat-dravidian-cinema",
    name: "திராவிட சினிமா & பண்பாடு | Dravidian Cinema & Culture",
    slug: "dravidian-cinema-culture",
    description:
      "Explorations of Dravidian cinema, art, cultural transformation, and youth movement.",
  },
];

export const FALLBACK_STORE = {
  id: "store-muthamilarignar-pathipagam",
  name: "Muthamilarignar Pathipagam",
  slug: "demo-store-main",
  description:
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam.",
  logo_url: "/logo.jpg",
  currency: "INR",
  theme_config: { primary_color: "#E52320", secondary_color: "#0a0a0a" },
  status: "published",
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDatabaseProductId(id: unknown): boolean {
  return typeof id === "string" && UUID_RE.test(id.trim());
}

export interface CatalogBook {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  price_cents: number;
  sale_price_cents?: number | null;
  tax_class: string;
  inventory: number;
  inventory_quantity: number;
  description: string;
  ingredients: string;
  safety_info: string;
  image_url: string | null;
  images: string[];
  status: string;
  is_fallback?: boolean;
}

export const FALLBACK_BOOKS: CatalogBook[] = [];

const SERVER_FETCH_TIMEOUT_MS = 2500;

export const fetchBooksSafe = cache(
  async (tenant: string): Promise<{ books: any[]; isFallback: boolean }> => {
    try {
      const res = await fetch(`${getServerApiUrl()}/public/products`, {
        headers: { "X-Tenant": tenant },
        next: { revalidate: 60, tags: ["products", `products:${tenant}`] },
        signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data || [];
        return { books: list.map(sanitizeBookCovers), isFallback: false };
      }
      if (res.status < 500) {
        // 4xx (e.g. 404 empty/unknown tenant) -> API is reachable, never show static fallback
        return { books: [], isFallback: false };
      }
    } catch {
      // API is unreachable (network error or timeout)
    }
    return { books: [], isFallback: true };
  },
);

export async function getBooksWithFallback(tenant: string) {
  const result = await fetchBooksSafe(tenant);
  return result.books;
}

export const getCategoriesWithFallback = cache(async (tenant: string) => {
  try {
    const res = await fetch(`${getServerApiUrl()}/public/categories`, {
      headers: { "X-Tenant": tenant },
      next: { revalidate: 60, tags: ["categories", `categories:${tenant}`] },
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      return list;
    }
    if (res.status < 500) {
      return [];
    }
  } catch {
    // Fallback only when API is down
  }
  return FALLBACK_CATEGORIES;
});

export const getStoreWithFallback = cache(async (tenant: string) => {
  try {
    const res = await fetch(`${getServerApiUrl()}/public/store`, {
      headers: { "X-Tenant": tenant },
      next: { revalidate: 60, tags: ["store", `store:${tenant}`] },
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      const store = Array.isArray(data) ? data[0] : data?.data?.[0] || data;
      if (store?.id) return store;
    }
  } catch {
    // Fallback only when API is down
  }
  return FALLBACK_STORE;
});

export type BookLookupResult =
  | { status: "ok"; product: any }
  | { status: "not_found" }
  | { status: "gone" }
  | { status: "error"; httpStatus?: number };

export const fetchBookById = cache(
  async (tenant: string, productIdOrSlug: string): Promise<BookLookupResult> => {
    const url = `${getServerApiUrl()}/public/products/${encodeURIComponent(productIdOrSlug)}`;
    let lastHttpStatus: number | undefined;

    try {
      const res = await fetch(url, {
        headers: { "X-Tenant": tenant },
        next: {
          revalidate: 120,
          tags: ["products", `products:${tenant}`, `book:${tenant}:${productIdOrSlug}`],
        },
        signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
      });

      if (res.ok) {
        const prod = await res.json();
        if (prod?.id) {
          return { status: "ok", product: sanitizeBookCovers(prod) };
        }
      }

      if (res.status === 410) {
        return { status: "gone" };
      }

      if (res.status === 404) {
        return { status: "not_found" };
      }

      lastHttpStatus = res.status;
      if (res.status < 500) {
        return { status: "error", httpStatus: res.status };
      }
    } catch {
      // Fast single-attempt timeout -> fall back to cached live list below
    }

    // If the single-book endpoint timed out or hit a 5xx burst,
    // check the cached live API list (never the static fallback) before showing "try again".
    const listRes = await fetchBooksSafe(tenant);
    if (!listRes.isFallback) {
      const key = productIdOrSlug.toLowerCase();
      const match = listRes.books.find(
        (b: any) =>
          String(b?.id || "").toLowerCase() === key ||
          String(b?.slug || "").toLowerCase() === key,
      );
      if (match?.id) {
        return { status: "ok", product: match };
      }
    }

    return { status: "error", httpStatus: lastHttpStatus };
  },
);

export async function getBookByIdWithFallback(
  tenant: string,
  productIdOrSlug: string,
) {
  const res = await fetchBookById(tenant, productIdOrSlug);
  if (res.status === "ok") return res.product;
  return null;
}


