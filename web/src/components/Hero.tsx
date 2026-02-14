"use client";

import Link from "next/link";
import { useLanguage } from "@/i18n";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative flex min-h-[600px] flex-col justify-center items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuD5W1yzwU0paP7ERTsNgsPj7-Zll4LXJK15P1L4XdFqU7HuvbBq5W4Wc9cm38D5cwAzQP1B3v919KbxcRhg27qdaXKjGPKYxIznAuFFXBnTLZANo4FKYVTOpVVBc-3AYxEYcreiFuhP1B2Jp47p4tcbROXzG6Y5Xnj0TAIZyT4sIyLdnhzIUjVMnz7OSujAH7cHc7fke53UZZXZ2By7IJ8t43JRUK3kmmxFU6U1rZNn1GM8gHriSoQ4B_wrODA1xTKW4lB-Xxzxk1aN")`,
        }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-corporate-blue/90 to-corporate-blue/40"></div>

      <div className="z-20 flex w-full flex-col px-6 lg:px-40 py-20">
        <div className="max-w-[800px] flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              {t.hero.badge}
            </span>
          </div>

          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight">
            {t.hero.title}
          </h1>

          <p className="text-slate-200 text-lg md:text-xl font-medium leading-relaxed max-w-[600px]">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="#subsidiaries"
              className="flex items-center justify-center rounded-lg h-12 px-8 bg-primary hover:bg-primary-dark text-white text-base font-bold transition-all shadow-lg hover:shadow-primary/50"
            >
              {t.hero.cta1}
            </Link>
            <Link
              href="#contact"
              className="flex items-center justify-center rounded-lg h-12 px-8 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-base font-bold transition-all backdrop-blur-sm"
            >
              {t.hero.cta2}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
