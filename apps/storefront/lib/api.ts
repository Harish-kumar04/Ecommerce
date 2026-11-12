/**
 * Storefront API client (axios). Attribution helpers live in ./attribution so that
 * lightweight components (e.g. AttributionCapture in the root layout) can use them
 * without pulling axios into every page's first-load JavaScript.
 */
import {
  captureAttribution,
  getStoredAttribution,
  getStoredFirstAttribution,
  type Attribution,
} from "./attribution";

export { captureAttribution, getStoredAttribution, getStoredFirstAttribution };
export type { Attribution };


import axios from "axios";

function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") {
    const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const trimmed = raw.replace(/\/$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    const trimmed = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  }
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "/api/v1";
  }
  return "http://localhost:8000/api/v1";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

// Guest cart identity: opaque uuid kept client-side (requirement: guest checkout)
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
  } catch {}
  return id;
}

function tenantHeaders(tenant: string): Record<string, string> {
  const auth = typeof window !== "undefined" ? localStorage.getItem("store_access_token") : null;
  const h: Record<string, string> = { "X-Tenant": tenant, "X-Cart-Session-ID": getCartSessionId() };
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

import { FALLBACK_BOOKS, FALLBACK_CATEGORIES, FALLBACK_STORE } from "./catalog-fallback";
import { CART_COUNT_KEY, CART_TOTAL_KEY } from "./cart-events";

const LOCAL_CART_KEY = "mp_fallback_cart";

function readLocalCart(): any[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalCart(items: any[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    const count = items.reduce((s, it) => s + (it.quantity || 1), 0);
    const total = items.reduce(
      (s, it) => s + (it.price_cents || 0) * (it.quantity || 1),
      0,
    );
    window.localStorage.setItem(CART_COUNT_KEY, String(count));
    window.localStorage.setItem(CART_TOTAL_KEY, String(total));
  } catch {
    // ignore
  }
}

export class StorefrontApi {
  // ---- Public (anonymous) surfaces: catalog, store, pages, categories ----

  async getStore(tenant: string) {
    const response = await api
      .get(`/public/store`, { headers: { "X-Tenant": tenant } })
      .catch(() => null);
    return response?.data || FALLBACK_STORE;
  }

  async getPages(tenant: string) {
    const response = await api
      .get(`/public/pages`, { headers: { "X-Tenant": tenant } })
      .catch(() => null);
    const list = response?.data;
    return Array.isArray(list) ? list : [];
  }

  async getProducts(tenant: string, params?: Record<string, string>) {
    try {
      const response = await api.get(`/public/products`, {
        headers: { "X-Tenant": tenant },
        params,
      });
      const data = response.data;
      return Array.isArray(data) ? data : data.data || data.items || [];
    } catch {
      // fallback only on network error or server down
    }
    return FALLBACK_BOOKS;
  }

  async getProduct(tenant: string, id: string) {
    try {
      const response = await api.get(`/public/products/${encodeURIComponent(id)}`, {
        headers: { "X-Tenant": tenant },
      });
      if (response.data) return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
    }
    return (
      FALLBACK_BOOKS.find(
        (b) => b.id === id || b.slug === id || b.sku.toLowerCase() === id.toLowerCase(),
      ) || null
    );
  }

  async getCategories(tenant: string) {
    try {
      const response = await api.get(`/public/categories`, {
        headers: { "X-Tenant": tenant },
      });
      const data = response.data;
      return Array.isArray(data) ? data : data.data || data.items || [];
    } catch {
      // fallback
    }
    return FALLBACK_CATEGORIES;
  }

  // ---- Cart / checkout (guest session keyed; optional customer auth) ----

  async getCart(tenant: string) {
    try {
      const response = await api.get(`/cart`, {
        headers: tenantHeaders(tenant),
      });
      return response.data;
    } catch {
      const items = readLocalCart();
      const total_cents = items.reduce(
        (s, it) => s + (it.price_cents || 0) * (it.quantity || 1),
        0,
      );
      return { id: "local-cart", items, total_cents };
    }
  }

  async addToCart(
    tenant: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ) {
    try {
      const response = await api.post(
        `/cart/items`,
        { product_id: productId, quantity, variant_id: variantId },
        { headers: tenantHeaders(tenant) },
      );
      return response.data;
    } catch (err: any) {
      if (err?.response) {
        const detail = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message || "Unable to add item to cart";
        throw new Error(Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(", ") : String(detail));
      }
      throw new Error(err?.message || "Network error adding item to cart");
    }
  }

  async getProductVariants(tenant: string, productId: string) {
    try {
      const response = await api.get(`/products/${productId}/variants`, {
        headers: tenantHeaders(tenant),
      });
      return Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
    } catch {
      return [];
    }
  }

  async updateCartItem(tenant: string, itemId: string, quantity: number) {
    try {
      const response = await api.put(
        `/cart/items/${itemId}?quantity=${quantity}`,
        {},
        { headers: tenantHeaders(tenant) },
      );
      return response.data;
    } catch (err: any) {
      if (err?.response) {
        const detail = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message || "Unable to update cart quantity";
        throw new Error(Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(", ") : String(detail));
      }
      throw new Error(err?.message || "Network error updating cart");
    }
  }

  async removeCartItem(tenant: string, itemId: string) {
    try {
      const response = await api.delete(`/cart/items/${itemId}`, {
        headers: tenantHeaders(tenant),
      });
      return response.data;
    } catch (err: any) {
      if (err?.response) {
        const detail = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message || "Unable to remove item from cart";
        throw new Error(Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(", ") : String(detail));
      }
      throw new Error(err?.message || "Network error removing item from cart");
    }
  }

  async validateCoupon(tenant: string, code: string, orderTotalCents: number) {
    try {
      const response = await api.post(
        `/public/coupons/validate`,
        { code: code.trim().toUpperCase(), order_total_cents: orderTotalCents },
        { headers: { "X-Tenant": tenant } },
      );
      return response.data;
    } catch (err: any) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Invalid coupon code";
      throw new Error(Array.isArray(detail) ? detail.map((d: any) => d?.msg || String(d)).join(", ") : String(detail));
    }
  }

  async getCheckout(tenant: string, checkoutId: string) {
    const response = await api.get(`/checkout/${encodeURIComponent(checkoutId)}`, {
      headers: tenantHeaders(tenant),
    });
    return response.data;
  }

  async createCheckout(tenant: string, data: any) {
    const idempotencyKey =
      typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const attribution = getStoredAttribution();
    const attributionFirst = getStoredFirstAttribution();
    const payload: Record<string, unknown> = { ...data };
    if (Object.keys(attribution).length) {
      payload.attribution = attribution;
      if ((attribution as any).gclid) payload.gclid = (attribution as any).gclid;
      if ((attribution as any).fbclid)
        payload.fbclid = (attribution as any).fbclid;
    }
    if (Object.keys(attributionFirst).length) {
      payload.attribution_first = attributionFirst;
    }
    try {
      const response = await api.post(`/checkout`, payload, {
        headers: { ...tenantHeaders(tenant), "Idempotency-Key": idempotencyKey },
      });
      return response.data;
    } catch (err: any) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Checkout failed";
      throw new Error(Array.isArray(detail) ? detail.map((d: any) => d?.msg || String(d)).join(", ") : String(detail));
    }
  }

  async initiatePayment(
    tenant: string,
    checkoutId: string,
    provider: string = "razorpay",
  ) {
    try {
      const response = await api.post(
        `/checkout/${encodeURIComponent(checkoutId)}/pay`,
        { provider },
        {
          headers: {
            ...tenantHeaders(tenant),
            "Idempotency-Key": getCartSessionId() + "-" + checkoutId,
          },
        },
      );
      return response.data;
    } catch (err: any) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Payment initiation failed";
      throw new Error(Array.isArray(detail) ? detail.map((d: any) => d?.msg || String(d)).join(", ") : String(detail));
    }
  }

  async getInvoice(tenant: string, orderId: string) {
    const response = await api.get(`/invoices/${orderId}`, { headers: tenantHeaders(tenant) });
    return response.data;
  }

  async downloadInvoice(tenant: string, orderId: string, format: "html" | "pdf" = "html") {
    // Always request a blob so the caller can create a single <a download> link
    // regardless of which file format the API returns. Browsers happily save
    // HTML and PDF blobs alike.
    const response = await api.get(`/invoices/${orderId}/download`, {
      headers: tenantHeaders(tenant),
      params: { format },
      responseType: "blob",
    });
    return response.data as Blob;
  }

  async getCollections(tenant: string) {
    const response = await api.get(`/collections`, {
      headers: tenantHeaders(tenant),
    });
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data.data || data.items || [];
  }

  // ---- Order tracking (customers + guests) ----

  async trackOrder(tenant: string, orderId: string, email: string) {
    const response = await api.get(`/public/track-order`, {
      headers: { "X-Tenant": tenant },
      params: { order_id: orderId, email },
    });
    return response.data;
  }

  async getOrderFulfillments(tenant: string, orderId: string) {
    const response = await api.get(`/orders/${orderId}/fulfillments`, {
      headers: tenantHeaders(tenant),
    });
    return response.data;
  }

  async getOrder(tenant: string, orderId: string) {
    const response = await api.get(`/orders/${orderId}`, {
      headers: tenantHeaders(tenant),
    });
    return response.data;
  }

  async listOrders(tenant: string, status?: string) {
    const response = await api.get(`/orders`, {
      headers: tenantHeaders(tenant),
      params: status ? { status } : undefined,
    });
    const data = response.data;
    return Array.isArray(data) ? data : data?.data || data?.items || [];
  }

  async getOrderRefunds(tenant: string, orderId: string) {
    const response = await api.get(`/orders/${orderId}/refunds`, {
      headers: tenantHeaders(tenant),
    });
    return response.data;
  }

  async getOrderPayments(tenant: string, orderId: string) {
    const response = await api.get(`/orders/${orderId}/payments`, {
      headers: tenantHeaders(tenant),
    });
    return response.data;
  }

  // ---- Returns (customer self-service) ----

  async requestReturn(
    tenant: string,
    orderId: string,
    items: Array<{ product_id: string; quantity: number }>,
    reason: string
  ) {
    // Backend: POST /orders/{id}/returns?reason=... with body = items list
    const response = await api.post(`/orders/${orderId}/returns`, items, {
      headers: tenantHeaders(tenant),
      params: { reason },
    });
    return response.data;
  }

  async cancelOrder(tenant: string, orderId: string) {
    // Backend: PATCH /orders/{id}/status  body = { status: "cancelled" }
    const response = await api.patch(
      `/orders/${orderId}/status`,
      { status: "cancelled" },
      { headers: tenantHeaders(tenant) }
    );
    return response.data;
  }

  async getReturns(tenant: string) {
    // The API has no dedicated /returns endpoint; returns are recorded as
    // orders whose status has moved to `returned`. The order list endpoint
    // scopes customers to their own orders automatically.
    const list = await this.listOrders(tenant, "returned");
    return Array.isArray(list) ? list : [];
  }

  // ---- Customer self-service (DPDP: consent / export / erase) ----

  async getCurrentUser() {
    // /auth/me returns the UserRead for the bearer token's user.
    const auth = typeof window !== "undefined" ? localStorage.getItem("store_access_token") : null;
    const headers: Record<string, string> = auth ? { Authorization: `Bearer ${auth}` } : {};
    const response = await api.get(`/auth/me`, { headers });
    return response.data;
  }

  /**
   * Discover the customer_id for the currently authenticated shopper.
   *
   * The customer routes are keyed on `customer_id` rather than a `/me` alias.
   * For shoppers, the most reliable way to get that id is from the first
   * order on file (every customer is mirrored from the signup at order
   * creation time). If no orders exist yet, we fall back to looking up the
   * customer via the email returned by /auth/me (Tenant-isolated list call).
   */
  async getMyCustomerId(tenant: string): Promise<string | null> {
    try {
      const list = (await this.listOrders(tenant)) as any[];
      const hit = Array.isArray(list) ? list.find((o) => o?.customer_id) : null;
      if (hit?.customer_id) return String(hit.customer_id);
    } catch {
      // fall through to email lookup
    }
    try {
      const me = await this.getCurrentUser();
      const email = me?.email;
      if (!email) return null;
      // Tenant staff can list customers; this works for the user who is the
      // merchant, but for shoppers we end up with an empty list since
      // list_customers is staff-only. In that case we surface null and the
      // page can prompt the user to place an order first.
      const response = await api.get(`/customers`, {
        headers: tenantHeaders(tenant),
        params: { search: email },
      });
      const data = response.data;
      const list = Array.isArray(data) ? data : data?.data || data?.items || [];
      const me2 = list.find((c: any) => c?.email === email);
      return me2?.id ? String(me2.id) : null;
    } catch {
      return null;
    }
  }

  async getConsent(tenant: string, customerId: string) {
    // GET /customers/{id}/consent isn't on the API; we read the customer
    // record itself which carries `consent_json`. The list endpoint is
    // staff-only, so this falls back gracefully when the customer id can't
    // be resolved.
    const response = await api.get(`/customers/${customerId}`, {
      headers: tenantHeaders(tenant),
    });
    return response.data?.consent_json || {};
  }

  async updateConsent(tenant: string, customerId: string, flags: Record<string, boolean>) {
    // PATCH /customers/{id}/consent body = { "consent": {...} }
    const response = await api.patch(
      `/customers/${customerId}/consent`,
      { consent: flags },
      { headers: tenantHeaders(tenant) }
    );
    return response.data;
  }

  async withdrawAllConsent(tenant: string, customerId: string) {
    // POST /customers/{id}/consent/withdraw
    const response = await api.post(
      `/customers/${customerId}/consent/withdraw`,
      {},
      { headers: tenantHeaders(tenant) }
    );
    return response.data;
  }

  async exportCustomerData(tenant: string, customerId: string) {
    const response = await api.get(`/customers/${customerId}/export`, {
      headers: tenantHeaders(tenant),
    });
    return response.data;
  }

  async eraseCustomerData(tenant: string, customerId: string) {
    const response = await api.post(
      `/customers/${customerId}/erase`,
      {},
      { headers: tenantHeaders(tenant) }
    );
    return response.data;
  }
}

export const storefrontApi = new StorefrontApi();
