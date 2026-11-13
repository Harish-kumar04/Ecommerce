"use client";

import { useState } from "react";
import { T } from "./i18n/t";
import { useLanguage } from "./language-provider";
import PenLoader from "./ui/pen-loader";

function resolveNewsletterApiBase(): string {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const trimmed = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
      return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
    }
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "/api/v1";
    }
  }
  return "http://localhost:8000/api/v1";
}

export default function NewsletterForm({ storeId }: { storeId?: string | null }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch(`${resolveNewsletterApiBase()}/public/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, store_id: storeId }),
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {t("மின்னஞ்சல் முகவரி", "Email address")}
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error" || state === "done") setState("idle");
          }}
          placeholder={t("உங்கள் மின்னஞ்சல் முகவரி", "Enter your email address")}
          autoComplete="email"
          className="h-12 flex-1 rounded-full border border-black/20 bg-white px-5 text-[15px] text-black placeholder:text-black/55 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          required
        />
        <button
          type="submit"
          disabled={state === "loading"}
          aria-busy={state === "loading" || undefined}
          className="btn-red h-12 px-7 text-[15px] disabled:opacity-75"
        >
          {state === "done" ? (
            <T ta="பதிவு செய்யப்பட்டது ✓" en="Subscribed ✓" />
          ) : state === "loading" ? (
            <PenLoader size="sm" tone="light" label={t("பதிவு செய்கிறது", "Subscribing")} />
          ) : (
            <T ta="பதிவு செய்க" en="Subscribe" />
          )}
        </button>
      </form>

      {/* Visible Inline Success / Error Message (never sr-only) */}
      {state === "done" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-green-300 bg-green-50 px-4 py-2.5 text-[13.5px] font-semibold text-green-900"
        >
          <span aria-hidden="true">✓</span>
          <span>
            {t(
              "நன்றி! புதிய நூல் வெளியீடுகள் மற்றும் சலுகை அறிவிப்புகள் உங்கள் மின்னஞ்சலுக்கு அனுப்பப்படும்.",
              "Thank you for subscribing! You will receive new release and offer updates first.",
            )}
          </span>
        </div>
      )}

      {state === "error" && (
        <p
          role="alert"
          className="mt-3 text-[13.5px] font-semibold text-brand-red-dark"
        >
          {t(
            "சரியான மின்னஞ்சல் முகவரியை உள்ளிட்டு மீண்டும் முயற்சிக்கவும்.",
            "Please enter a valid email address and try again.",
          )}
        </p>
      )}
    </div>
  );
}
