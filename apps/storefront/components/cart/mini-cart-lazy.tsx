"use client";

import dynamic from "next/dynamic";

const MiniCartClient = dynamic(() => import("./mini-cart"), {
  ssr: false,
});

export default function MiniCart({ tenant }: { tenant: string }) {
  return <MiniCartClient tenant={tenant} />;
}
