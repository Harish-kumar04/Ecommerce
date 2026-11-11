"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { PopupConfig } from "@/lib/site-defaults";

type PopupProps = { tenant: string; popup: PopupConfig };

/**
 * Loads the promo popup's code only after hydration (separate chunk via dynamic import),
 * so it never counts toward first-load JavaScript.
 */
export default function PromoPopupLazy(props: PopupProps) {
  const [Popup, setPopup] = useState<ComponentType<PopupProps> | null>(null);
  useEffect(() => {
    let alive = true;
    import("./promo-popup").then((m) => {
      if (alive) setPopup(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  return Popup ? <Popup {...props} /> : null;
}
