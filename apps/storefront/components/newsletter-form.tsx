"use client";

import { useState } from "react";
import { T } from "./i18n/t";
import { useLanguage } from "./language-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
      const res = await fetch(`${API_URL}/public/newsletter`, {
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
    <form onSubmit={submit} className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        {t("மின்னஞ்சல் முகவரி", "Email address")}
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("உங்கள் மின்னஞ்சல்", "Your email")}
        autoComplete="email"
        className="h-12 flex-1 rounded-full border border-black/15 bg-white px-5 text-[15px] focus:border-brand-red focus:outline-none"
        required
      />
      <button type="submit" disabled={state === "loading"} className="btn-red h-12 text-[15px] disabled:opacity-60">
        {state === "done" ? (
          <T ta="பதிவு செய்யப்பட்டது ✓" en="Subscribed ✓" />
        ) : state === "loading" ? (
          "…"
        ) : (
          <T ta="பதிவு செய்க" en="Subscribe" />
        )}
      </button>
      <p role="status" aria-live="polite" className="text-[13px] text-brand-red sm:sr-only">
        {state === "error" ? t("மீண்டும் முயற்சிக்கவும்", "Please try again") : ""}
      </p>
    </form>
  );
}
