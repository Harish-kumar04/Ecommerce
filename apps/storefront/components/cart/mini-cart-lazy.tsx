"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MiniCartClient = dynamic(() => import("./mini-cart"), {
  ssr: false,
});

/**
 * Defers downloading & hydrating the MiniCart drawer + API client until the
 * shopper actually clicks the cart icon or adds an item (`infalette-open-mini-cart`).
 */
export default function MiniCart({ tenant }: { tenant: string }) {
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (activated) return;
    const onOpen = () => setActivated(true);
    window.addEventListener("infalette-open-mini-cart", onOpen);
    return () => window.removeEventListener("infalette-open-mini-cart", onOpen);
  }, [activated]);

  if (!activated) return null;
  return <MiniCartClient tenant={tenant} initialOpen={true} />;
}
