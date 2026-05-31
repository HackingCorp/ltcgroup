"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { T, useLang } from "@/lib/i18n";

export function PublicNav() {
  const { lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        .lv-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(250,250,247,0.7); backdrop-filter: blur(12px);
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s, background 0.2s;
        }
        .lv-nav.scrolled { border-bottom-color: var(--line); background: rgba(250,250,247,0.92); }
        .lv-nav-inner {
          max-width: 1240px; margin: 0 auto; padding: 14px 32px;
          display: flex; align-items: center; gap: 32px;
        }
        .lv-nav-brand {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--display); font-weight: 600; font-size: 19px;
          letter-spacing: -0.02em; color: var(--ink); text-decoration: none;
        }
        .lv-nav-brand em { font-style: italic; font-weight: 400; opacity: 0.7; }
        .lv-nav-mark {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--ink); color: var(--accent);
          display: grid; place-items: center;
          font-family: var(--mono); font-weight: 700; font-size: 14px;
        }
        .lv-nav-links { display: flex; gap: 28px; margin-left: 16px; flex: 1; }
        .lv-nav-links a {
          color: var(--ink-3); font-size: 14px; font-weight: 450;
          text-decoration: none; padding: 6px 0; position: relative; transition: color 0.15s;
        }
        .lv-nav-links a:hover { color: var(--ink); }
        .lv-nav-links a::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: 0;
          height: 1px; background: var(--ink);
          transform: scaleX(0); transform-origin: left; transition: transform 0.2s;
        }
        .lv-nav-links a:hover::after { transform: scaleX(1); }
        .lv-nav-cta { display: flex; align-items: center; gap: 16px; }
        .lv-nav-link { font-size: 14px; color: var(--ink-2); text-decoration: none; font-weight: 450; }
        @media (max-width: 980px) {
          .lv-nav-links { display: none; }
        }
      `}</style>
      <nav className={"lv-nav" + (scrolled ? " scrolled" : "")}>
        <div className="lv-nav-inner">
          <Link href="/" className="lv-nav-brand">
            <span className="lv-nav-mark">N</span>
            <span>Nkap <em>Pay</em></span>
          </Link>
          <div className="lv-nav-links">
            <Link href="/pricing"><T fr="Tarifs" en="Pricing" /></Link>
            <Link href="/how-it-works"><T fr="Comment ça marche" en="How it works" /></Link>
            <Link href="/docs"><T fr="Documentation" en="Docs" /></Link>
            <Link href="/status">Status</Link>
          </div>
          <div style={{ display: "flex", padding: 2, background: "var(--bg-2)", borderRadius: 6, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600 }}>
            <button onClick={() => setLang("fr")} style={{ appearance: "none", border: 0, background: lang === "fr" ? "var(--ink)" : "transparent", color: lang === "fr" ? "var(--bg)" : "var(--muted)", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", letterSpacing: "0.05em" }}>FR</button>
            <button onClick={() => setLang("en")} style={{ appearance: "none", border: 0, background: lang === "en" ? "var(--ink)" : "transparent", color: lang === "en" ? "var(--bg)" : "var(--muted)", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", letterSpacing: "0.05em" }}>EN</button>
          </div>
          <div className="lv-nav-cta">
            <Link href="/merchant/login" className="lv-nav-link"><T fr="Connexion" en="Sign in" /></Link>
            <Link href="/merchant/register" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              <T fr="Commencer" en="Get started" /> <Icon name="arrow" size={12} color="white" />
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
