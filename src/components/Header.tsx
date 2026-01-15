"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            Accueil
          </Link>
          <Link
            href="#about"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            À propos
          </Link>
          <Link
            href="#subsidiaries"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            Nos Filiales
          </Link>
          <Link
            href="#why-us"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            Pourquoi Nous
          </Link>
          <Link
            href="#contact"
            className="text-slate-600 hover:text-primary text-sm font-bold transition-colors"
          >
            Contact
          </Link>
        </nav>
        <Link
          href="#contact"
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-bold leading-normal tracking-wide transition-all shadow-md hover:shadow-lg"
        >
          <span>Nous Contacter</span>
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
              Accueil
            </Link>
            <Link
              href="#about"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              À propos
            </Link>
            <Link
              href="#subsidiaries"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Nos Filiales
            </Link>
            <Link
              href="#why-us"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pourquoi Nous
            </Link>
            <Link
              href="#contact"
              className="text-slate-600 hover:text-primary text-sm font-bold transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <Link
              href="#contact"
              className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-bold leading-normal tracking-wide transition-all shadow-md hover:shadow-lg mt-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Nous Contacter</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
