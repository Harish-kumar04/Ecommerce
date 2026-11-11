"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { T } from "../i18n/t";
import { CloseIcon } from "../brand/icons";
import { canOptimize, isExternal, resolveLink, type PopupConfig } from "@/lib/site-defaults";

const SEEN_KEY = "mp-popup-seen";
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Promotional popup: at most once per day (localStorage), after a delay, never on
 * cart/checkout. Closes on X, overlay click or Esc; traps focus while open.
 */
export default function PromoPopup({ tenant, popup }: { tenant: string; popup: PopupConfig }) {
  const pathname = usePathname() || "";
  const blocked = /\/(cart|checkout)(\/|$)/.test(pathname);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!popup.enabled || blocked) return;
    try {
      if (localStorage.getItem(SEEN_KEY) === today()) return;
    } catch {
      return; // storage unavailable: never nag
    }
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(SEEN_KEY, today());
      } catch {
        /* ignore */
      }
      lastFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }, Math.max(0, popup.delay_seconds) * 1000);
    return () => window.clearTimeout(timer);
  }, [popup.enabled, popup.delay_seconds, blocked]);

  useEffect(() => {
    if (blocked) setOpen(false);
  }, [blocked]);

  const close = useCallback(() => {
    setOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open || !popup.enabled) return null;

  const href = resolveLink(tenant, popup.link);
  const hasTitle = Boolean(popup.title_ta || popup.title_en);
  const buttonCls = "btn-red mt-6 h-12 w-full text-[15px]";
  const buttonLabel = <T ta={popup.button_ta || popup.button_en || ""} en={popup.button_en || popup.button_ta || ""} />;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasTitle ? "promo-popup-title" : undefined}
        aria-label={hasTitle ? undefined : "அறிவிப்பு / Announcement"}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-glow-lg"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="மூடு / Close"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-card hover:text-brand-red"
        >
          <CloseIcon />
        </button>
        {popup.image_url ? (
          <div className="relative aspect-[16/10] w-full bg-brand-red-light">
            <Image
              src={popup.image_url}
              alt=""
              fill
              sizes="(max-width: 480px) 100vw, 448px"
              unoptimized={!canOptimize(popup.image_url)}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-2 w-full bg-brand-red" aria-hidden="true" />
        )}
        <div className="p-6 sm:p-8">
          {hasTitle && (
            <h2 id="promo-popup-title" className="pr-8 text-[24px] font-extrabold leading-tight text-black">
              <T ta={popup.title_ta || popup.title_en || ""} en={popup.title_en || popup.title_ta || ""} />
            </h2>
          )}
          {(popup.text_ta || popup.text_en) && (
            <p className="mt-3 text-[15px] leading-relaxed text-black/70">
              <T ta={popup.text_ta || popup.text_en || ""} en={popup.text_en || popup.text_ta || ""} />
            </p>
          )}
          {href && (popup.button_ta || popup.button_en) &&
            (isExternal(href) ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className={buttonCls} onClick={close}>
                {buttonLabel}
              </a>
            ) : (
              <Link href={href} className={buttonCls} onClick={close}>
                {buttonLabel}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
