"use client";

import { useLanguage } from "./language-provider";

/**
 * Prominent pill toggle button for switching between Tamil (தமிழ்) and English.
 */
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language Switcher / மொழி மாற்றம்"
      className="inline-flex items-center rounded-full border border-gray-200 dark:border-neutral-800 bg-gray-100/80 dark:bg-neutral-900 p-0.5 text-[12px] font-semibold"
    >
      <button
        type="button"
        onClick={() => setLang("ta")}
        aria-pressed={lang === "ta"}
        className={`px-2.5 py-1 rounded-full transition-all ${
          lang === "ta"
            ? "bg-red-600 text-white shadow-sm"
            : "text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        தமிழ்
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`px-2.5 py-1 rounded-full transition-all ${
          lang === "en"
            ? "bg-red-600 text-white shadow-sm"
            : "text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        English
      </button>
    </div>
  );
}
