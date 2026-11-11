"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { splitBilingual, type Lang } from "@/lib/i18n";

export { splitBilingual };
export type { Lang };

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
