"use client";

import { useLanguage } from "./language-provider";

/** Tamil / English pill switch with >=44px touch targets and WCAG AA contrast. */
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  const btn = (active: boolean) =>
    `min-h-[40px] rounded-full px-3 py-1.5 transition-colors ${
      active
        ? "bg-[#D11D1A] text-white shadow-sm"
        : "text-black/80 hover:text-brand-red-dark"
    }`;

  return (
    <div
      role="group"
      aria-label="மொழி / Language"
      className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 bg-white p-0.5 text-[12.5px] font-semibold"
    >
      <button
        type="button"
        onClick={() => setLang("ta")}
        aria-pressed={lang === "ta"}
        lang="ta"
        className={btn(lang === "ta")}
      >
        தமிழ்
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        lang="en"
        className={btn(lang === "en")}
      >
        English
      </button>
    </div>
  );
}
