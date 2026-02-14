"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { translations, Language, Translations } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

// Detect browser language
function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return "fr";

  // Check localStorage first
  const savedLang = localStorage.getItem("ltc-language");
  if (savedLang === "fr" || savedLang === "en") {
    return savedLang;
  }

  // Check navigator.languages (array of preferred languages)
  const browserLanguages = navigator.languages || [navigator.language];

  for (const lang of browserLanguages) {
    const langCode = lang.toLowerCase().slice(0, 2);
    if (langCode === "en") return "en";
    if (langCode === "fr") return "fr";
  }

  // Default to French for Cameroon and other French-speaking countries
  return "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Detect and set language on mount
    const detectedLang = detectBrowserLanguage();
    setLanguageState(detectedLang);
    document.documentElement.lang = detectedLang;
    setIsInitialized(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ltc-language", lang);
    document.documentElement.lang = lang;
  };

  const t = translations[language];

  // Prevent flash of wrong language
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded"></div>
            <span className="text-xl font-black text-slate-900">LTC GROUP</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
