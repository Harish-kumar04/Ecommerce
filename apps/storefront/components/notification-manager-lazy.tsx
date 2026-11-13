"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { NotificationItem, PopupConfig } from "@/lib/site-defaults";

const NotificationManagerClient = dynamic(() => import("./notification-manager"), {
  ssr: false,
});

/**
 * Defers downloading & hydrating notification popups until after initial paint & idle,
 * and skips downloading entirely when no notifications/popups are configured.
 */
export default function NotificationManager(props: {
  tenant: string;
  notifications?: NotificationItem[];
  fallbackPopup?: PopupConfig;
}) {
  const hasAny =
    (props.notifications && props.notifications.length > 0) ||
    Boolean(props.fallbackPopup?.enabled && (props.fallbackPopup.title_ta || props.fallbackPopup.title_en || props.fallbackPopup.image_url));

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasAny) return;
    const timer = window.setTimeout(() => setReady(true), 3200);
    return () => window.clearTimeout(timer);
  }, [hasAny]);

  if (!hasAny || !ready) return null;
  return <NotificationManagerClient {...props} />;
}
