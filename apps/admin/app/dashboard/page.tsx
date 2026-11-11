"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";

interface OrderItem {
  id: string;
  order_number?: string;
  total_cents: number;
  status: string;
  fulfillment_status?: string;
  created_at: string;
  customer?: { name?: string; email?: string };
  shipping_address_json?: any;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price_cents: number;
  inventory?: number;
  inventory_quantity?: number;
  image_url?: string;
  images?: string[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [ordersRes, productsRes] = await Promise.all([
          adminApi.getOrders({ per_page: "50" }).catch(() => ({ data: [] })),
          adminApi.getProducts({ per_page: "100" }).catch(() => ({ data: [] })),
        ]);

        if (!cancelled) {
          const rawOrders = Array.isArray(ordersRes)
            ? ordersRes
            : (ordersRes as any)?.data || (ordersRes as any)?.items || [];
          const rawProducts = Array.isArray(productsRes)
            ? productsRes
            : (productsRes as any)?.data || (productsRes as any)?.items || [];

          setOrders(rawOrders);
          setProducts(rawProducts);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load dashboard metrics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Calculations
  const today = new Date().toDateString();

  const todayOrders = orders.filter((o) => {
    if (!o.created_at) return false;
    return new Date(o.created_at).toDateString() === today;
  });

  const todayRevenueCents = todayOrders.reduce((sum, o) => {
    if (["cancelled", "refunded"].includes((o.status || "").toLowerCase())) return sum;
    return sum + (o.total_cents || 0);
  }, 0);

  // Orders to ship: status in ("paid", "confirmed", "processing") or fulfillment_status not shipped
  const ordersToShip = orders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    const f = (o.fulfillment_status || "").toLowerCase();
    if (["cancelled", "refunded", "failed"].includes(s)) return false;
    if (["fulfilled", "shipped", "delivered"].includes(f)) return false;
    return ["paid", "confirmed", "processing", "pending"].includes(s) || f === "unfulfilled";
  });

  // Low stock products (inventory <= 5)
  const lowStockProducts = products
    .filter((p) => {
      const qty = p.inventory_quantity ?? p.inventory ?? 0;
      return qty <= 5;
    })
    .sort((a, b) => {
      const qA = a.inventory_quantity ?? a.inventory ?? 0;
      const qB = b.inventory_quantity ?? b.inventory ?? 0;
      return qA - qB;
    });

  const formatPrice = (cents: number) => `₹${(cents / 100).toFixed(2)}`;

  const getProductCover = (p: ProductItem) => {
    if (p.images && p.images.length > 0) return p.images[0];
    if (p.image_url) return p.image_url;
    return null;
  };

  const parseBookTitle = (rawName: string) => {
    if (!rawName) return "Untitled Book";
    if (rawName.includes("|")) {
      const [ta, en] = rawName.split("|");
      return ta.trim() || en.trim();
    }
    return rawName;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header & Bookstore Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            முத்தமிழறிஞர் பதிப்பகம்
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
            Bookstore Storefront & Operations Overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/homepage"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Edit Homepage
          </Link>

          <Link
            href="/products/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#E52320] text-white hover:bg-[#c91e1b] transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add a Book
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
            Today&apos;s Revenue
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
              {loading ? "..." : formatPrice(todayRevenueCents)}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {todayOrders.length} {todayOrders.length === 1 ? "order" : "orders"}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Confirmed orders placed today</p>
        </div>

        {/* Today's Orders */}
        <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
            Today&apos;s Orders
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
              {loading ? "..." : todayOrders.length}
            </span>
            <Link
              href="/orders"
              className="text-xs font-medium text-[#E52320] hover:underline"
            >
              View all
            </Link>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Total orders received today</p>
        </div>

        {/* Orders to Ship */}
        <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
            Orders to Ship
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {loading ? "..." : ordersToShip.length}
            </span>
            {ordersToShip.length > 0 && (
              <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800">
                Action needed
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Awaiting dispatch and shipping</p>
        </div>

        {/* Low Stock (<= 5) */}
        <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
            Low Stock Books
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold tracking-tight ${
                lowStockProducts.length > 0 ? "text-red-600" : "text-gray-900 dark:text-neutral-100"
              }`}
            >
              {loading ? "..." : lowStockProducts.length}
            </span>
            {lowStockProducts.length > 0 && (
              <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-800">
                &le; 5 left
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Titles requiring reprint/restock</p>
        </div>
      </div>

      {/* Two Column Layout: Orders to Ship & Low Stock Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Orders to Ship */}
        <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
                Orders to Ship
              </h2>
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                Paid and confirmed orders ready for fulfillment
              </p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-medium text-[#E52320] hover:underline"
            >
              All Orders &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading orders...</div>
          ) : ordersToShip.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No orders pending shipment right now.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {ordersToShip.slice(0, 5).map((order) => {
                const customerName =
                  order.customer?.name ||
                  order.shipping_address_json?.name ||
                  "Guest Customer";
                return (
                  <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate">
                        {customerName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        Order #{order.order_number || order.id.slice(0, 8)} &bull;{" "}
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                        {formatPrice(order.total_cents)}
                      </p>
                      <span className="inline-flex px-2 py-0.5 text-[10.5px] font-medium rounded-full bg-amber-100 text-amber-800">
                        {order.status || "confirmed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2: Low Stock Alert (<= 5) */}
        <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
                Low Stock Alerts (&le; 5 units)
              </h2>
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                Book titles that need stock replenishment
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-medium text-[#E52320] hover:underline"
            >
              All Books &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading inventory...</div>
          ) : lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              All books have healthy stock levels (&gt; 5 units).
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {lowStockProducts.slice(0, 5).map((book) => {
                const cover = getProductCover(book);
                const stockQty = book.inventory_quantity ?? book.inventory ?? 0;
                return (
                  <div key={book.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-9 rounded border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-gray-400 font-serif">Book</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate">
                          {parseBookTitle(book.name)}
                        </p>
                        <p className="text-xs text-gray-400 font-mono truncate">
                          SKU: {book.sku}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          stockQty === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {stockQty === 0 ? "Out of stock" : `${stockQty} left`}
                      </span>
                      <Link
                        href={`/products/${book.id}`}
                        className="text-xs font-medium text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        Edit &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}