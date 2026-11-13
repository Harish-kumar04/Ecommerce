"use client";

import { useEffect } from "react";
import { refreshCartCount } from "@/lib/cart-events";

/**
 * CartRefreshBridge — listens for cart change events dispatched by the
 * add-to-cart / remove / update flows and re-fetches the cart summary
 * so any component subscribed to the cart count can refresh without
 * a full page reload. Also keeps multiple tabs in sync via the
 * BroadcastChannel API + the storage event.
 *
 * Mount once at the root layout.
 */
export function CartRefreshBridge() {
  useEffect(() => {
    const handler = () => {
      void refreshCartCount();
    };
    if (typeof window === "undefined") return;

    window.addEventListener("infalette-cart-changed", handler);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("infalette-cart");
      bc.onmessage = handler;
    } catch {
      /* BroadcastChannel not supported — fall back to storage events */
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === "infalette-cart-bus") handler();
    };
    window.addEventListener("storage", onStorage);

    // Only fetch server cart summary on cold mount if visitor actually has a session or auth token.
    let idleId: number | null = null;
    const win = window as any;
    let hasActiveSession = false;
    try {
      hasActiveSession = Boolean(
        window.localStorage.getItem("infalette_cart_session_id") ||
          window.localStorage.getItem("store_access_token"),
      );
    } catch {
      hasActiveSession = false;
    }

    if (hasActiveSession) {
      if (typeof win.requestIdleCallback === "function") {
        idleId = win.requestIdleCallback(() => void refreshCartCount(), { timeout: 2500 });
      } else {
        idleId = window.setTimeout(() => void refreshCartCount(), 1500);
      }
    }

    return () => {
      if (idleId !== null) {
        if (typeof win.cancelIdleCallback === "function") win.cancelIdleCallback(idleId);
        else clearTimeout(idleId);
      }
      window.removeEventListener("infalette-cart-changed", handler);
      window.removeEventListener("storage", onStorage);
      bc?.close();
    };
  }, []);

  return null;
}