"use client";

import dynamic from "next/dynamic";
import type { NotificationItem, PopupConfig } from "@/lib/site-defaults";

const NotificationManagerClient = dynamic(() => import("./notification-manager"), {
  ssr: false,
});

export default function NotificationManager(props: {
  tenant: string;
  notifications?: NotificationItem[];
  fallbackPopup?: PopupConfig;
}) {
  return <NotificationManagerClient {...props} />;
}
