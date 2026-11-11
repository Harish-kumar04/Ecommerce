"use client";

import { useLanguage } from "./language-provider";

/** Tamil / English pill switch. */
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  const btn = (active: boolean) =>
    `rounded-full px-3 py-1.5 transition-colors ${
      active ? "bg-brand-red text-white shadow-sm" : "text-black/70 hover:text-brand-red"
    }`;

  return (
    <div
      role="group"
      aria-label="மொழி / Language"
      className="inline-flex items-center rounded-full border border-black/10 bg-white p-0.5 text-[12.5px] font-semibold"
    >
      <button type="button" onClick={() => setLang("ta")} aria-pressed={lang === "ta"} lang="ta" className={btn(lang === "ta")}>
        தமிழ்
      </button>
      <button type="button" onClick={() => setLang("en")} aria-pressed={lang === "en"} lang="en" className={btn(lang === "en")}>
        English
      </button>
    </div>
  );
}
