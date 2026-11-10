"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "ta" | "en";

const STORAGE_KEY = "mp-lang";

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (ta: string, en: string) => string;
  localizeName: (raw?: string | null) => string;
  localizeSubName: (raw?: string | null) => string | null;
  localizeDescription: (raw?: string | null) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

/**
 * Splits a bilingual string formatted as `"தமிழ் தலைப்பு | English Title"`
 * or `"தமிழ் விளக்கம் || English Description"` into `[ta, en]`.
 */
export function splitBilingual(raw?: string | null, sep: "|" | "||" = "|"): [string, string] {
  if (!raw) return ["", ""];
  const str = String(raw);
  if (sep === "||" && str.includes("||")) {
    const [ta, ...rest] = str.split("||");
    return [ta.trim(), rest.join("||").trim() || ta.trim()];
  }
  if (str.includes("|")) {
    const [ta, ...rest] = str.split("|");
    return [ta.trim(), rest.join("|").trim() || ta.trim()];
  }
  return [str.trim(), str.trim()];
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ta");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "ta" || saved === "en") {
        setLangState(saved);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = "ta";
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === "ta" ? "en" : "ta");
  };

  const t = (ta: string, en: string) => (lang === "ta" ? ta : en);

  const localizeName = (raw?: string | null) => {
    const [ta, en] = splitBilingual(raw, "|");
    return lang === "ta" ? ta : en;
  };

  const localizeSubName = (raw?: string | null) => {
    if (!raw || !String(raw).includes("|")) return null;
    const [ta, en] = splitBilingual(raw, "|");
    if (ta === en) return null;
    return lang === "ta" ? en : ta;
  };

  const localizeDescription = (raw?: string | null) => {
    const [ta, en] = splitBilingual(raw, "||");
    return lang === "ta" ? ta : en;
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        localizeName,
        localizeSubName,
        localizeDescription,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: "ta",
      setLang: () => undefined,
      toggleLang: () => undefined,
      t: (ta: string) => ta,
      localizeName: (raw?: string | null) => splitBilingual(raw, "|")[0],
      localizeSubName: (raw?: string | null) => splitBilingual(raw, "|")[1] || null,
      localizeDescription: (raw?: string | null) => splitBilingual(raw, "||")[0],
    };
  }
  return ctx;
}
