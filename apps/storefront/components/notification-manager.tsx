"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { type NotificationItem, type PopupConfig, resolveLink } from "@/lib/site-defaults";
import { CloseIcon } from "@/components/brand/icons";
import Img from "@/components/ui/img";

export default function NotificationManager({
  tenant,
  notifications = [],
  fallbackPopup,
}: {
  tenant: string;
  notifications?: NotificationItem[];
  fallbackPopup?: PopupConfig;
}) {
  const pathname = usePathname() || "";
  const { lang, t } = useLanguage();
  const [activeItem, setActiveItem] = useState<NotificationItem | null>(null);
  const [visible, setVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Never show on cart or checkout pages
  const isExcluded = pathname.includes("/cart") || pathname.includes("/checkout");

  useEffect(() => {
    if (isExcluded) {
      setVisible(false);
      return;
    }

    const home = `/${tenant}`;
    const isHome = pathname === home || pathname === `${home}/`;
    const now = Date.now();

    // Find candidate items
    let candidate: NotificationItem | null = null;

    for (const item of notifications) {
      if (!item || item.active === false) continue;

      // Check dates
      if (item.starts_at && new Date(item.starts_at).getTime() > now) continue;
      if (item.ends_at && new Date(item.ends_at).getTime() < now) continue;

      // Check pages
      if (item.pages === "home" && !isHome) continue;

      // Check frequency via localStorage
      const storageKey = `notif_${item.id}`;
      try {
        if (item.frequency === "once") {
          if (localStorage.getItem(storageKey)) continue;
        } else if (item.frequency === "daily") {
          const last = Number(localStorage.getItem(storageKey) || 0);
          if (now - last < 24 * 60 * 60 * 1000) continue;
        } else if (item.frequency === "every_visit") {
          if (sessionStorage.getItem(storageKey)) continue;
        }
      } catch {
        // ignore localStorage errors
      }

      candidate = item;
      break;
    }

    // Fallback popup if no notifications configured but fallback popup is enabled
    if (!candidate && fallbackPopup?.enabled && isHome) {
      const storageKey = "popup_shown_date";
      let shouldShow = true;
      try {
        const last = Number(localStorage.getItem(storageKey) || 0);
        if (now - last < 24 * 60 * 60 * 1000) shouldShow = false;
      } catch {}

      if (shouldShow) {
        candidate = {
          id: "default-popup",
          type: "popup",
          image_url: fallbackPopup.image_url,
          title_ta: fallbackPopup.title_ta,
          title_en: fallbackPopup.title_en,
          text_ta: fallbackPopup.text_ta,
          text_en: fallbackPopup.text_en,
          button_ta: fallbackPopup.button_ta,
          button_en: fallbackPopup.button_en,
          link: fallbackPopup.link,
          active: true,
          delay_seconds: fallbackPopup.delay_seconds ?? 4,
          frequency: "daily",
          pages: "home",
        };
      }
    }

    if (!candidate) {
      setActiveItem(null);
      setVisible(false);
      return;
    }

    setActiveItem(candidate);
    const delay = (candidate.delay_seconds ?? (candidate.type === "bar" ? 0 : 4)) * 1000;
    const timer = setTimeout(() => {
      setVisible(true);
      // Record frequency
      try {
        const storageKey = `notif_${candidate?.id}`;
        if (candidate?.frequency === "once") {
          localStorage.setItem(storageKey, "1");
        } else if (candidate?.frequency === "daily") {
          localStorage.setItem(storageKey, String(Date.now()));
        } else if (candidate?.frequency === "every_visit") {
          sessionStorage.setItem(storageKey, "1");
        }
      } catch {}
    }, delay);

    return () => clearTimeout(timer);
  }, [pathname, tenant, notifications, fallbackPopup, isExcluded]);

  // Focus trap and escape listener for popup
  useEffect(() => {
    if (!visible || !activeItem || activeItem.type !== "popup") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, activeItem]);

  if (!visible || !activeItem || isExcluded) return null;

  const title = lang === "en" ? (activeItem.title_en || activeItem.title_ta) : (activeItem.title_ta || activeItem.title_en);
  const text = lang === "en" ? (activeItem.text_en || activeItem.text_ta) : (activeItem.text_ta || activeItem.text_en);
  const btn = lang === "en" ? (activeItem.button_en || activeItem.button_ta) : (activeItem.button_ta || activeItem.button_en);
  const href = resolveLink(tenant, activeItem.link);

  // Type: Bar
  if (activeItem.type === "bar") {
    return (
      <div className="relative z-40 bg-brand-red text-white py-2 px-4 text-[13px] font-medium shadow-sm transition-all">
        <div className="container-site flex items-center justify-between gap-3">
          <div className="flex-1 text-center">
            {title && <strong className="mr-2">{title}:</strong>}
            <span>{text}</span>
            {btn && href && (
              <Link href={href} className="ml-3 underline font-bold hover:text-white/80 transition-colors">
                {btn} →
              </Link>
            )}
          </div>
          <button
            onClick={() => setVisible(false)}
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Type: Popup modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      onClick={() => setVisible(false)}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-transform"
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-2 text-black/70 hover:bg-white hover:text-black transition-colors"
          aria-label="Close popup"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        {activeItem.image_url && (
          <div className="relative aspect-[4/5] max-h-72 w-full overflow-hidden bg-black/5">
            <Img
              src={activeItem.image_url}
              alt={title || "Notification"}
              fill
              sizes="448px"
              className="object-cover"
            />
          </div>
        )}

        <div className="p-6 text-center">
          {title && <h3 className="text-[20px] font-bold text-black">{title}</h3>}
          {text && <p className="mt-2 text-[14px] leading-relaxed text-black/70">{text}</p>}
          {btn && href && (
            <Link
              href={href}
              onClick={() => setVisible(false)}
              className="btn-red mt-5 h-11 w-full text-[14px] font-bold"
            >
              {btn}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
