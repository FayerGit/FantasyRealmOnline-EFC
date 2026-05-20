import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type LanguageCode = "en" | "fr";

function normalizeLanguage(value: unknown): LanguageCode {
  return value === "fr" ? "fr" : "en";
}

export function getStoredLanguage(): LanguageCode {
  try {
    return normalizeLanguage(window.localStorage.getItem("language"));
  } catch {
    return "en";
  }
}

type Translator = (en: string, fr?: string) => string;

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: Translator;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => getStoredLanguage());

  const setLanguage = useCallback((next: LanguageCode) => {
    const normalized = normalizeLanguage(next);
    setLanguageState(normalized);
    try {
      window.localStorage.setItem("language", normalized);
      window.dispatchEvent(new Event("languagechange"));
    } catch {
      // ignorer
    }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "language") return;
      setLanguageState(normalizeLanguage(event.newValue));
    };

    const onLanguageChange = () => {
      setLanguageState(getStoredLanguage());
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("languagechange", onLanguageChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("languagechange", onLanguageChange);
    };
  }, []);

  const t: Translator = useCallback(
    (en, fr) => {
      if (language === "fr") return (fr ?? en);
      return en;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return value;
}
