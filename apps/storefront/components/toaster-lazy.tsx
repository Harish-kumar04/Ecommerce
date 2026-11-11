"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Mounts the global <Toaster/> right after hydration from its own chunk, keeping it out
 * of first-load JS. `toast()` callers import the same module, so they share its listener
 * registry; toasts are triggered by user actions, which happen after this has mounted.
 */
export default function ToasterLazy() {
  const [C, setC] = useState<ComponentType | null>(null);
  useEffect(() => {
    let alive = true;
    import("./toaster").then((m) => {
      if (alive) setC(() => m.Toaster);
    });
    return () => {
      alive = false;
    };
  }, []);
  return C ? <C /> : null;
}
