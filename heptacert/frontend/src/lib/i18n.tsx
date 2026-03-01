"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { tr } from "@/locales/tr";
import { en } from "@/locales/en";
import type { TranslationKey } from "@/locales/tr";

type Lang = "tr" | "en";

const LANG_STORAGE_KEY = "heptacert-lang";

const translations: Record<Lang, typeof tr> = { tr, en };

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "tr",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "tr") {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let str: string = translations[lang][key] ?? translations["tr"][key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Convenience hook: returns the t() function directly */
export function useT() {
  return useContext(I18nContext).t;
}

/** Language toggle button — drop anywhere in the UI */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      className={
        className ??
        "flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
      }
      aria-label="Toggle language"
    >
      <span className="text-sm">{lang === "tr" ? "🇹🇷" : "🇬🇧"}</span>
      <span className="uppercase tracking-wider">{lang === "tr" ? "TR" : "EN"}</span>
    </button>
  );
}
