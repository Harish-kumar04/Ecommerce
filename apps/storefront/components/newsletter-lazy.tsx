"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";

type Props = { storeId?: string | null };

/**
 * Shows the server-rendered static form (`fallback`) immediately, then swaps in the
 * interactive NewsletterForm once its chunk has loaded after hydration. Same markup,
 * so there is no layout shift, and the form's JS stays out of first-load JavaScript.
 */
export default function NewsletterLazy({ storeId, fallback }: Props & { fallback: ReactNode }) {
  const [Form, setForm] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    let alive = true;
    import("./newsletter-form").then((m) => {
      if (alive) setForm(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  return Form ? <Form storeId={storeId} /> : <>{fallback}</>;
}
