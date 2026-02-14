"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/i18n";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-solid border-slate-200 bg-white/95 backdrop-blur-sm px-6 py-4 lg:px-20">
      <Link href="/" className="flex items-center gap-4 text-slate-900">
        <div className="flex items-center justify-center rounded bg-primary text-white p-2">
          <span className="material-symbols-outlined text-[24px]">language</span>
        </div>
        <h2 className="text-xl font-black leading-tight tracking-tight text-slate-900">
          LTC GROUP
        </h2>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex flex-1 justify-end gap-8 items-center">
        <nav className="flex items-center gap-9">
          <Link
            href="/"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            {t.nav.home}
          </Link>
          <Link
            href="#about"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            {t.nav.about}
          </Link>
          <Link
            href="#subsidiaries"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            {t.nav.subsidiaries}
          </Link>
          <Link
            href="#why-us"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            {t.nav.whyUs}
          </Link>
          <Link
            href="#contact"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            {t.nav.contact}
          </Link>
        </nav>

        {/* Language Selector */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setLanguage("fr")}
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${
              language === "fr"
                ? "bg-primary text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            FR
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${
              language === "en"
                ? "bg-primary text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            EN
          </button>
        </div>

        <Link
          href="#contact"
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-bold leading-normal tracking-wide transition-all shadow-md hover:shadow-lg"
        >
          <span>{t.nav.contactUs}</span>
        </Link>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="lg:hidden text-slate-900"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Menu"
      >
        <span className="material-symbols-outlined">
          {mobileMenuOpen ? "close" : "menu"}
        </span>
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg lg:hidden">
          <nav className="flex flex-col p-6 gap-4">
            <Link
              href="/"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.nav.home}
            </Link>
            <Link
              href="#about"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.nav.about}
            </Link>
            <Link
              href="#subsidiaries"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.nav.subsidiaries}
            </Link>
            <Link
              href="#why-us"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.nav.whyUs}
            </Link>
            <Link
              href="#contact"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.nav.contact}
            </Link>

            {/* Mobile Language Selector */}
            <div className="flex items-center gap-2 py-2">
              <span className="text-sm text-slate-500">Langue:</span>
              <button
                onClick={() => setLanguage("fr")}
                className={`px-3 py-1 text-sm font-bold rounded ${
                  language === "fr"
                    ? "bg-primary text-white"
                    : "text-slate-600 bg-slate-100"
                }`}
              >
                FR
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 text-sm font-bold rounded ${
                  language === "en"
                    ? "bg-primary text-white"
                    : "text-slate-600 bg-slate-100"
                }`}
              >
                EN
              </button>
            </div>

            <Link
              href="#contact"
              className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-bold leading-normal tracking-wide transition-all shadow-md hover:shadow-lg mt-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>{t.nav.contactUs}</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
