"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { T, useLang } from "@/lib/i18n";

/* ── Hooks ──────────────────────────────────────────── */

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const fallback = setTimeout(() => setVisible(true), 200);
    if (!ref.current || typeof IntersectionObserver !== "function")
      return () => clearTimeout(fallback);
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.disconnect(); clearTimeout(fallback); }
      },
      { threshold },
    );
    obs.observe(ref.current);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, [threshold]);
  return [ref, visible] as const;
}

function useCounter(target: number, duration = 1400, trigger = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let raf: number;
    let start: number | undefined;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, trigger]);
  return val;
}

/* ── Animated primitives ────────────────────────────── */

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: `translateY(${visible ? 0 : 24}px)`,
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms`,
      willChange: "opacity, transform",
    }}>{children}</div>
  );
}

function Counter({ value, suffix = "", decimals = 0, trigger = true }: { value: number; suffix?: string; decimals?: number; trigger?: boolean }) {
  const v = useCounter(value, 1600, trigger);
  return <span>{decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("fr-FR")}{suffix}</span>;
}

/* ── Data ───────────────────────────────────────────── */

const COVERAGE = [
  { hub: "central", country: "Cameroun", code: "CM", flag: "🇨🇲", ops: ["MTN Money", "Orange Money"] },
  { hub: "central", country: "Gabon", code: "GA", flag: "🇬🇦", ops: ["Airtel Money", "Moov Money"] },
  { hub: "central", country: "RDC", code: "CD", flag: "🇨🇩", ops: ["Airtel Money", "Orange Money", "M-Pesa", "Afrimoney"] },
  { hub: "central", country: "Congo", code: "CG", flag: "🇨🇬", ops: ["Airtel Money", "MTN Money"] },
  { hub: "central", country: "Tchad", code: "TD", flag: "🇹🇩", ops: ["Moov Money", "Airtel Money"] },
  { hub: "central", country: "RCA", code: "CF", flag: "🇨🇫", ops: ["Orange Money"] },
  { hub: "west", country: "Sénégal", code: "SN", flag: "🇸🇳", ops: ["Orange Money", "Wave", "Free Money"] },
  { hub: "west", country: "Côte d'Ivoire", code: "CI", flag: "🇨🇮", ops: ["Orange Money", "MTN Money", "Wave"] },
  { hub: "west", country: "Bénin", code: "BJ", flag: "🇧🇯", ops: ["MTN Money", "Moov Money"] },
  { hub: "west", country: "Togo", code: "TG", flag: "🇹🇬", ops: ["T-Money", "Moov Money"] },
  { hub: "west", country: "Burkina Faso", code: "BF", flag: "🇧🇫", ops: ["Moov Money", "Orange Money"] },
  { hub: "west", country: "Mali", code: "ML", flag: "🇲🇱", ops: ["Orange Money", "Moov Money", "Wave"] },
  { hub: "west", country: "Niger", code: "NE", flag: "🇳🇪", ops: ["Airtel Money"] },
  { hub: "west", country: "Guinée", code: "GN", flag: "🇬🇳", ops: ["MTN Money", "Orange Money"] },
  { hub: "east", country: "Uganda", code: "UG", flag: "🇺🇬", ops: ["MTN", "Airtel"] },
  { hub: "east", country: "Kenya", code: "KE", flag: "🇰🇪", ops: ["Airtel Money", "M-Pesa"] },
  { hub: "east", country: "Nigeria", code: "NG", flag: "🇳🇬", ops: ["Bank transfer"] },
  { hub: "central", country: "Guinée Éq.", code: "GQ", flag: "🇬🇶", ops: ["Muni"] },
];

const ALL_OPERATORS = ["MTN Money", "Orange Money", "Airtel Money", "Moov Money", "Wave", "M-Pesa", "T-Money", "Coris Money", "Digital Cash", "Sama Money", "Afrimoney", "Free Money", "Bank transfer", "GIM-UEMOA", "Visa", "Mastercard"];

const PAYMENT_DEMOS = [
  { country: "🇨🇲 Cameroun", method: "Orange Money", amt: 75000, phone: "+237 670 12 34 56" },
  { country: "🇸🇳 Sénégal", method: "Wave", amt: 42000, phone: "+221 77 234 56 78" },
  { country: "🇨🇮 Côte d'Ivoire", method: "MTN Money", amt: 156000, phone: "+225 07 12 34 56" },
  { country: "🇨🇩 RDC", method: "M-Pesa", amt: 98500, phone: "+243 81 567 89 01" },
  { country: "🇧🇫 Burkina", method: "Moov Money", amt: 28000, phone: "+226 70 12 34 56" },
];

const HUBS = [
  { id: "central", label: <T fr="Afrique Centrale" en="Central Africa" />, color: "var(--primary)" },
  { id: "west", label: <T fr="Afrique de l'Ouest" en="West Africa" />, color: "var(--orange-money)" },
  { id: "east", label: <T fr="Afrique de l'Est" en="East Africa" />, color: "var(--accent)" },
];

/* ── Nav ────────────────────────────────────────────── */

function PublicNav() {
  const { lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
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
  );
}

/* ── Live Terminal ──────────────────────────────────── */

function LiveTerminal() {
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => {
      setStage((s) => {
        if (s < 3) return s + 1;
        setIdx((i) => (i + 1) % PAYMENT_DEMOS.length);
        return 0;
      });
    }, 1400);
    return () => clearInterval(tick);
  }, []);
  const p = PAYMENT_DEMOS[idx];

  return (
    <div className="terminal">
      <div className="terminal-bar">
        <div className="terminal-dots">
          <span style={{ background: "#FF5F57" }} />
          <span style={{ background: "#FEBC2E" }} />
          <span style={{ background: "#28C840" }} />
        </div>
        <span className="mono terminal-title">~ /api/v1/payments</span>
        <span className="mono terminal-status">● live</span>
      </div>
      <div className="terminal-body">
        <div className="terminal-line"><span className="t-dim">$</span> nkap pay --create</div>
        <div className="terminal-line"><span className="t-key">amount</span><span className="t-eq">=</span><span className="t-val">{p.amt.toLocaleString("fr-FR")}</span></div>
        <div className="terminal-line"><span className="t-key">country</span><span className="t-eq">=</span><span className="t-val">{'"'}{p.country}{'"'}</span></div>
        <div className="terminal-line"><span className="t-key">method</span><span className="t-eq">=</span><span className="t-val">{'"'}{p.method}{'"'}</span></div>
        <div className="terminal-line"><span className="t-key">phone</span><span className="t-eq">=</span><span className="t-val">{'"'}{p.phone}{'"'}</span></div>
        <div className="terminal-divider" />
        {[
          { time: "0.04s", text: <T fr="Paiement créé" en="Payment created" /> },
          { time: "0.8s", text: <><T fr="Demande envoyée à" en="Pushed to" /> {p.method}</> },
          { time: "2.4s", text: <T fr="Client a confirmé l'OTP" en="Customer confirmed OTP" /> },
          { time: "3.2s", text: <T fr="Webhook livré 200 OK" en="Webhook delivered 200 OK" />, success: true },
        ].map((step, i) => (
          <div key={i} className={"terminal-line terminal-evt" + (stage >= i ? " active" : "") + (step.success && stage >= i ? " success" : "")}>
            <span className="t-bullet" style={{ background: stage >= i ? "var(--accent)" : "var(--line-2)" }} />
            <span className="t-time">{step.time}</span>
            <span style={{ fontWeight: step.success && stage >= 3 ? 600 : 400 }}>{step.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Operator Marquee ───────────────────────────────── */

function OperatorMarquee({ reverse = false, speed = 60 }: { reverse?: boolean; speed?: number }) {
  const items = [...ALL_OPERATORS, ...ALL_OPERATORS];
  return (
    <div className="op-marquee" style={{ "--mq-dir": reverse ? "reverse" : "normal", "--mq-speed": `${speed}s` } as React.CSSProperties}>
      <div className="op-marquee-track">
        {items.map((name, i) => (
          <span key={i} className="op-pill">{name}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Coverage Cloud ─────────────────────────────────── */

function CoverageCloud() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="cov-cloud">
      <div className="cov-cloud-grid">
        {COVERAGE.map((c, i) => (
          <button
            key={c.code}
            className={"cov-chip" + (active === i ? " active" : "")}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="cov-chip-flag">{c.flag}</span>
            <span className="cov-chip-name">{c.country}</span>
            <span className="cov-chip-count">{c.ops.length}</span>
          </button>
        ))}
      </div>
      <div className="cov-detail" key={active}>
        {active !== null ? (
          <>
            <div className="cov-detail-flag">{COVERAGE[active].flag}</div>
            <div>
              <div className="cov-detail-name">{COVERAGE[active].country}</div>
              <div className="cov-detail-ops">{COVERAGE[active].ops.join(" · ")}</div>
            </div>
          </>
        ) : (
          <>
            <div className="cov-detail-flag" style={{ background: "var(--ink)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 500 }}>N</div>
            <div>
              <div className="cov-detail-name"><T fr="18 pays. 1 API." en="18 countries. 1 API." /></div>
              <div className="cov-detail-ops"><T fr="Survolez pour voir les opérateurs disponibles" en="Hover to see operators available" /></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── How It Works ───────────────────────────────────── */

function HowSection() {
  const [active, setActive] = useState(0);
  const [ref, visible] = useReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setActive((s) => (s + 1) % 4), 3000);
    return () => clearInterval(id);
  }, [visible]);

  const steps = [
    { t: <T fr="Créez le paiement" en="Create the payment" />, d: <T fr="Un POST. Vous recevez une URL de checkout en moins de 200ms." en="One POST. You get a checkout URL in under 200ms." />, ic: "code" as const },
    { t: <T fr="Le client paie" en="Customer pays" />, d: <T fr="Mobile Money, Wave, carte. Confirmation OTP en 3 secondes." en="Mobile Money, Wave, card. 3-second OTP confirmation." />, ic: "card" as const },
    { t: <T fr="Webhook signé" en="Signed webhook" />, d: <T fr="HMAC-SHA256, idempotent, retry exponentiel. Vous validez la commande." en="HMAC-SHA256, idempotent, exp retry. You fulfil the order." />, ic: "shield" as const },
    { t: <T fr="Virement T+1" en="T+1 settlement" />, d: <T fr="Reversement bancaire quotidien CEMAC ou wallet instantané." en="Daily CEMAC bank wire or instant wallet push." />, ic: "bank" as const },
  ];

  return (
    <section className="lv-section" ref={ref} id="how-it-works">
      <div className="lv-container">
        <Reveal>
          <div className="lv-section-eyebrow"><span className="lv-section-num">02</span><T fr="Comment ça marche" en="How it works" /></div>
          <h2 className="lv-section-title">
            <T
              fr={<>4 étapes du clic <span className="lv-hl">au crédit bancaire</span>.</>}
              en={<>4 steps from click <span className="lv-hl">to bank credit</span>.</>}
            />
          </h2>
        </Reveal>
        <div className="how-grid">
          {steps.map((s, i) => (
            <div key={i} className={"how-card" + (i === active ? " active" : "")} onClick={() => setActive(i)}>
              <div className="how-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="how-ic"><Icon name={s.ic} size={20} /></div>
              <h4 className="how-title">{s.t}</h4>
              <p className="how-desc">{s.d}</p>
              {i === active && <div className="how-bar" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="lv-footer">
      <div className="lv-container">
        <div className="lv-footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--ink)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
              Nkap Pay
            </div>
            <p className="lv-footer-tag">
              <T fr="La passerelle de paiement pour l'Afrique. Une filiale du groupe LTC." en="The payment gateway for Africa. A subsidiary of LTC Group." />
            </p>
            <div className="lv-footer-flags">
              {COVERAGE.slice(0, 12).map((c) => <span key={c.code}>{c.flag}</span>)}
              <span className="lv-footer-flags-more">+6</span>
            </div>
          </div>
          {[
            { h: <T fr="Produit" en="Product" />, items: [{ l: <T fr="Tarifs" en="Pricing" />, href: "/pricing" }, { l: <T fr="Comment ça marche" en="How it works" />, href: "/how-it-works" }, { l: <T fr="Liens de paiement" en="Payment links" />, href: "#" }, { l: <T fr="Sous-comptes" en="Sub-accounts" />, href: "#" }] },
            { h: <T fr="Développeurs" en="Developers" />, items: [{ l: "Documentation", href: "/docs" }, { l: "Status", href: "/status" }, { l: "Changelog", href: "#" }, { l: "SDK Flutter", href: "#" }] },
            { h: <T fr="Société" en="Company" />, items: [{ l: <T fr="À propos" en="About" />, href: "#" }, { l: <T fr="Conformité" en="Compliance" />, href: "#" }, { l: "Terms", href: "#" }, { l: "Privacy", href: "#" }] },
            { h: "Contact", items: [{ l: "hello@nkap.pay", href: "#" }, { l: "+237 222 22 11 00", href: "#" }, { l: "Yaoundé · Douala", href: "#" }, { l: "Abidjan · Dakar", href: "#" }] },
          ].map((col, i) => (
            <div key={i}>
              <h5>{col.h}</h5>
              <ul>
                {col.items.map((item, j) => (
                  <li key={j}><Link href={item.href}>{item.l}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="lv-footer-bottom">
          <span>© 2026 LTC Group SARL</span>
          <span>XAF · XOF · NGN · KES · UGX · EUR · USD</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Landing Page ───────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="landing-v4">
      <style>{`
        .landing-v4 { background: var(--bg); overflow-x: hidden; min-height: 100vh; }
        .landing-v4 .lv-container { max-width: 1240px; margin: 0 auto; padding: 0 32px; }

        /* Nav */
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

        /* Hero */
        .lv-hero { position: relative; padding: 64px 0 80px; overflow: hidden; }
        .lv-hero-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .bg-grid { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.6; }
        .bg-orb {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5;
          animation: orbFloat 14s ease-in-out infinite;
        }
        .bg-orb-1 { width: 400px; height: 400px; background: var(--accent); top: -100px; right: -50px; }
        .bg-orb-2 { width: 320px; height: 320px; background: var(--primary); bottom: -120px; left: 10%; animation-delay: -7s; }
        @keyframes orbFloat { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }

        .lv-hero-inner {
          position: relative; z-index: 1;
          display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px; align-items: center;
        }
        .lv-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 12px;
          padding: 6px 6px 6px 12px; border-radius: 999px;
          background: var(--surface); border: 1px solid var(--line);
          opacity: 0; animation: fadeUp 0.7s 0.1s forwards;
        }
        .lv-hero-flag-row { display: flex; gap: 2px; }
        .lv-hero-flag-row span { font-size: 18px; opacity: 0; animation: flagPop 0.5s forwards; }
        @keyframes flagPop { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        .lv-hero-eyebrow-text {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--mono); font-size: 11px; font-weight: 500;
          color: var(--ink-2); padding-right: 6px;
        }
        .lv-hero-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--success);
          animation: pulseDot 1.6s infinite;
        }
        @keyframes pulseDot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .lv-hero-title {
          font-family: var(--display); font-weight: 500;
          font-size: clamp(44px,6.5vw,84px); line-height: 0.98; letter-spacing: -0.035em;
          margin: 24px 0 0; opacity: 0; animation: fadeUp 0.9s 0.25s forwards;
        }
        .lv-hl {
          position: relative; display: inline-block;
          background-image: linear-gradient(120deg, var(--accent), var(--accent));
          background-size: 0% 50%; background-position: 0 80%; background-repeat: no-repeat;
          padding: 0 6px; margin: 0 -2px; animation: hlSweep 1.2s 1.1s forwards;
        }
        @keyframes hlSweep { to { background-size: 100% 50%; } }
        .lv-hl-lime { background: var(--accent); color: var(--ink); padding: 0 10px; border-radius: 8px; display: inline-block; }

        .lv-hero-sub {
          font-size: 19px; line-height: 1.4; color: var(--ink-3);
          max-width: 560px; margin: 28px 0 32px;
          opacity: 0; animation: fadeUp 0.9s 0.5s forwards;
        }
        .lv-hero-cta { display: flex; gap: 10px; flex-wrap: wrap; opacity: 0; animation: fadeUp 0.9s 0.7s forwards; }
        .lv-hero-trust {
          display: flex; gap: 22px; margin-top: 28px; font-size: 13px;
          color: var(--muted); flex-wrap: wrap; opacity: 0; animation: fadeUp 0.9s 0.9s forwards;
        }
        .lv-hero-trust span { display: inline-flex; align-items: center; gap: 5px; }
        .lv-hero-right { opacity: 0; animation: fadeUp 1s 0.6s forwards; }

        /* Terminal */
        .terminal {
          background: var(--ink); color: var(--bg); border-radius: 16px; overflow: hidden;
          box-shadow: 0 24px 60px -10px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05);
        }
        .terminal-bar {
          padding: 12px 16px; background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 12px;
        }
        .terminal-dots { display: flex; gap: 6px; }
        .terminal-dots span { width: 11px; height: 11px; border-radius: 50%; }
        .terminal-title { flex: 1; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; }
        .terminal-status { color: var(--accent); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
        .terminal-body { padding: 20px 22px; font-family: var(--mono); font-size: 13px; line-height: 2; }
        .terminal-line { display: flex; align-items: center; gap: 8px; min-height: 26px; }
        .t-dim { color: rgba(255,255,255,0.4); }
        .t-key { color: #ff9d9d; }
        .t-eq { color: rgba(255,255,255,0.4); }
        .t-val { color: var(--accent); }
        .terminal-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 0; }
        .terminal-evt { opacity: 0.35; transition: opacity 0.3s, color 0.3s; color: rgba(255,255,255,0.6); }
        .terminal-evt.active { opacity: 1; color: var(--bg); }
        .terminal-evt.success { color: var(--accent); }
        .t-bullet { width: 8px; height: 8px; border-radius: 50%; transition: background 0.3s; flex-shrink: 0; }
        .t-time { font-size: 11px; color: rgba(255,255,255,0.4); width: 36px; flex-shrink: 0; }

        /* Operator marquee */
        .op-marquee {
          overflow: hidden; padding: 14px 0;
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        .op-marquee-track {
          display: flex; gap: 12px;
          animation: opScroll var(--mq-speed) linear infinite var(--mq-dir);
          width: max-content;
        }
        @keyframes opScroll { to { transform: translateX(-50%); } }
        .op-pill {
          white-space: nowrap; padding: 8px 16px;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 999px; font-size: 14px; font-weight: 500; color: var(--ink-2);
        }

        /* Sections */
        .lv-section { padding: 100px 0; position: relative; }
        .lv-section-dark { background: var(--ink); color: var(--bg); }
        .lv-section-eyebrow {
          display: inline-flex; align-items: center; gap: 12px;
          font-family: var(--mono); font-size: 11px; font-weight: 500;
          color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;
        }
        .lv-section-dark .lv-section-eyebrow { color: rgba(255,255,255,0.5); }
        .lv-section-num { padding: 2px 8px; background: var(--ink); color: var(--bg); border-radius: 4px; }
        .lv-section-dark .lv-section-num { background: var(--accent); color: var(--ink); }
        .lv-section-title {
          font-family: var(--display); font-weight: 500;
          font-size: clamp(36px,5vw,56px); line-height: 1.04;
          letter-spacing: -0.028em; margin: 0 0 56px; max-width: 880px;
        }

        /* Hub stats */
        .hub-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 56px; }
        .hub-stat {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 24px; position: relative; overflow: hidden;
        }
        .hub-stat-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .hub-stat-label {
          font-family: var(--mono); font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.08em; color: rgba(255,255,255,0.5); margin-bottom: 16px;
        }
        .hub-stat-num {
          font-family: var(--display); font-weight: 500; font-size: 80px;
          line-height: 1; letter-spacing: -0.04em; color: var(--bg);
        }
        .hub-stat-sub { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px; }
        .hub-stat-flags { display: flex; gap: 4px; margin-top: 20px; font-size: 22px; }

        /* Coverage cloud */
        .cov-cloud {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 28px;
        }
        .cov-cloud-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 8px; margin-bottom: 24px; }
        .cov-chip {
          appearance: none; cursor: pointer;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: var(--bg); padding: 14px 12px; border-radius: 10px;
          display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left;
          opacity: 0; animation: chipIn 0.4s forwards;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        @keyframes chipIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cov-chip:hover, .cov-chip.active { background: rgba(201,255,61,0.1); border-color: var(--accent); transform: translateY(-2px); }
        .cov-chip-flag { font-size: 22px; }
        .cov-chip-name { font-size: 12px; font-weight: 500; }
        .cov-chip-count { font-family: var(--mono); font-size: 10px; color: rgba(255,255,255,0.4); }
        .cov-chip:hover .cov-chip-count { color: var(--accent); }
        .cov-detail {
          display: flex; align-items: center; gap: 16px; padding: 20px;
          background: rgba(0,0,0,0.3); border-radius: 12px; animation: fadeUp 0.3s;
        }
        .cov-detail-flag {
          font-size: 40px; width: 56px; height: 56px; border-radius: 12px;
          display: grid; place-items: center; background: rgba(255,255,255,0.06);
        }
        .cov-detail-name { font-family: var(--display); font-weight: 500; font-size: 22px; letter-spacing: -0.02em; }
        .cov-detail-ops { font-family: var(--mono); font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; }

        /* How it works */
        .how-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .how-card {
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 16px; padding: 24px; cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
          position: relative; overflow: hidden;
        }
        .how-card:hover { transform: translateY(-4px); border-color: var(--line-2); }
        .how-card.active { background: var(--ink); color: var(--bg); border-color: transparent; }
        .how-num { font-family: var(--mono); font-size: 11px; font-weight: 500; color: var(--muted); letter-spacing: 0.08em; margin-bottom: 20px; }
        .how-card.active .how-num { color: var(--accent); }
        .how-ic { width: 40px; height: 40px; border-radius: 10px; background: var(--bg-2); display: grid; place-items: center; margin-bottom: 18px; }
        .how-card.active .how-ic { background: rgba(255,255,255,0.08); color: var(--accent); }
        .how-card.active .how-ic svg { stroke: var(--accent); }
        .how-title { font-family: var(--display); font-weight: 500; font-size: 20px; letter-spacing: -0.02em; margin: 0 0 10px; }
        .how-desc { font-size: 13px; line-height: 1.5; color: var(--muted); margin: 0; }
        .how-card.active .how-desc { color: rgba(255,255,255,0.7); }
        .how-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--accent); transform-origin: left; transform: scaleX(0); animation: barFill 3s linear forwards; }
        @keyframes barFill { to { transform: scaleX(1); } }

        /* Stats strip */
        .lv-stats { padding: 64px 0; background: var(--ink); color: var(--bg); position: relative; overflow: hidden; }
        .lv-stats::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle at 80% 50%, rgba(201,255,61,0.08), transparent 50%); }
        .lv-stats-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 32px; position: relative; }
        .lv-stat-num { font-family: var(--display); font-weight: 500; font-size: clamp(40px,5vw,64px); line-height: 1; letter-spacing: -0.03em; color: var(--accent); }
        .lv-stat-lbl { margin-top: 8px; font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.5); }

        /* Features */
        .feat-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; grid-auto-rows: minmax(200px, auto); }
        .feat-card {
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 16px; padding: 28px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .feat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
        .feat-card svg { margin-bottom: 18px; }
        .feat-card h4 { font-family: var(--display); font-weight: 500; font-size: 22px; line-height: 1.15; letter-spacing: -0.018em; margin: 0 0 10px; }
        .feat-card p { color: var(--muted); font-size: 14px; line-height: 1.5; margin: 0; }
        .feat-card-lg { grid-row: span 2; }
        .feat-card-dark { background: var(--ink); color: var(--bg); border: 0; }
        .feat-card-dark h4 { color: var(--bg); }
        .feat-card-dark p { color: rgba(255,255,255,0.6); }
        .feat-card-lime { background: var(--accent); border: 0; }
        .feat-card-lime p { color: rgba(0,0,0,0.7); }
        .feat-code {
          margin: 24px 0 0; padding: 18px; background: rgba(0,0,0,0.3);
          border-radius: 10px; font-family: var(--mono); font-size: 12px;
          line-height: 1.7; color: #d6cfb9; overflow: auto; white-space: pre;
        }

        /* Testimonials */
        .testimonials { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .testimonial {
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 16px; padding: 28px; display: flex; flex-direction: column; gap: 24px;
        }
        .testimonial-quote { font-family: var(--display); font-weight: 500; font-size: 19px; line-height: 1.35; letter-spacing: -0.015em; flex: 1; }
        .testimonial-who { display: flex; align-items: center; gap: 12px; }
        .testimonial-name { font-weight: 500; font-size: 14px; display: flex; align-items: center; gap: 6px; }
        .testimonial-name span { font-size: 16px; }
        .testimonial-role { font-size: 12px; color: var(--muted); margin-top: 2px; }

        /* CTA */
        .lv-cta-section { padding: 60px 0; }
        .lv-cta-block {
          background: var(--ink); color: var(--bg); border-radius: 24px;
          padding: 72px 56px; position: relative; overflow: hidden;
        }
        .lv-cta-bg-orb { position: absolute; border-radius: 50%; filter: blur(60px); }
        .lv-cta-orb-1 { width: 360px; height: 360px; background: var(--accent); opacity: 0.3; right: -80px; bottom: -100px; animation: orbFloat 8s ease-in-out infinite; }
        .lv-cta-orb-2 { width: 240px; height: 240px; background: var(--primary); opacity: 0.4; right: 20%; top: -80px; animation: orbFloat 6s ease-in-out infinite -3s; }
        .lv-cta-content { position: relative; z-index: 1; max-width: 720px; }
        .lv-cta-eyebrow { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); }
        .lv-cta-block h2 { font-family: var(--display); font-weight: 500; font-size: clamp(36px,5vw,60px); line-height: 1.04; letter-spacing: -0.028em; margin: 14px 0 16px; }
        .lv-cta-block p { color: rgba(255,255,255,0.6); font-size: 16px; line-height: 1.5; margin: 0 0 32px; max-width: 520px; }
        .lv-cta-buttons { display: flex; gap: 12px; flex-wrap: wrap; }

        /* Footer */
        .lv-footer { padding: 64px 0 32px; border-top: 1px solid var(--line); }
        .lv-footer-grid { display: grid; grid-template-columns: 1.6fr repeat(4,1fr); gap: 40px; }
        .lv-footer h5 { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 14px; font-weight: 500; }
        .lv-footer ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px; }
        .lv-footer a { color: var(--ink); text-decoration: none; font-size: 13px; }
        .lv-footer a:hover { color: var(--primary); }
        .lv-footer-tag { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 14px 0; max-width: 260px; }
        .lv-footer-flags { display: flex; gap: 4px; flex-wrap: wrap; font-size: 20px; }
        .lv-footer-flags-more { font-family: var(--mono); font-size: 11px; font-weight: 600; background: var(--ink); color: var(--accent); padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; }
        .lv-footer-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 11px; color: var(--muted); }

        /* Responsive */
        @media (max-width: 980px) {
          .lv-hero-inner, .hub-stats, .feat-grid, .how-grid, .testimonials, .lv-footer-grid { grid-template-columns: 1fr; }
          .feat-card-lg { grid-row: auto; }
          .lv-stats-grid { grid-template-columns: repeat(2,1fr); }
          .cov-cloud-grid { grid-template-columns: repeat(3,1fr); }
          .lv-nav-links { display: none; }
        }
      `}</style>

      <PublicNav />

      {/* Hero */}
      <section className="lv-hero">
        <div className="lv-hero-bg">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <svg className="bg-grid" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs><pattern id="dotgrid" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.3" fill="var(--ink)" opacity="0.15" /></pattern></defs>
            <rect width="100" height="100" fill="url(#dotgrid)" />
          </svg>
        </div>
        <div className="lv-container lv-hero-inner">
          <div>
            <span className="lv-hero-eyebrow">
              <span className="lv-hero-flag-row">
                {["🇨🇲","🇸🇳","🇨🇮","🇧🇫","🇲🇱","🇬🇦","🇨🇩"].map((f, i) => (
                  <span key={i} style={{ animationDelay: `${i * 100}ms` }}>{f}</span>
                ))}
              </span>
              <span className="lv-hero-eyebrow-text">
                <span className="lv-hero-eyebrow-dot" />
                <T fr="18 pays · 16 opérateurs · 1 API" en="18 countries · 16 operators · 1 API" />
              </span>
            </span>

            <h1 className="lv-hero-title">
              <T
                fr={<>L{"'"}API <span className="lv-hl">de paiement</span> faite pour l{"'"}Afrique.</>}
                en={<>The payment <span className="lv-hl">API built</span> for Africa.</>}
              />
            </h1>

            <p className="lv-hero-sub">
              <T
                fr="Mobile Money, cartes, Wave, virement bancaire — encaissez de Dakar à Kinshasa avec une seule intégration. Règlement quotidien en F CFA."
                en="Mobile Money, cards, Wave, bank transfer — collect payments from Dakar to Kinshasa with one integration. Daily XAF settlement."
              />
            </p>

            <div className="lv-hero-cta">
              <Link href="/merchant/register" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>
                <T fr="Créer un compte gratuit" en="Create a free account" />
                <Icon name="arrow" size={14} color="white" />
              </Link>
              <Link href="/docs" className="btn btn-ghost btn-lg" style={{ textDecoration: "none" }}>
                <Icon name="play" size={13} />
                <T fr="Voir la démo" en="Watch the demo" />
              </Link>
            </div>

            <div className="lv-hero-trust">
              <span><Icon name="check" size={12} color="var(--success)" /><T fr="Sandbox illimité" en="Unlimited sandbox" /></span>
              <span><Icon name="check" size={12} color="var(--success)" /><T fr="Aucune CB requise" en="No card needed" /></span>
              <span><Icon name="check" size={12} color="var(--success)" /><T fr="Activation 4 min" en="Live in 4 min" /></span>
            </div>
          </div>

          <div className="lv-hero-right">
            <LiveTerminal />
          </div>
        </div>
      </section>

      {/* Operator marquee */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <OperatorMarquee speed={70} />
      </div>

      {/* Coverage */}
      <section className="lv-section lv-section-dark" id="coverage">
        <div className="lv-container">
          <Reveal>
            <div className="lv-section-eyebrow"><span className="lv-section-num">01</span><T fr="Couverture" en="Coverage" /></div>
            <h2 className="lv-section-title" style={{ color: "var(--bg)" }}>
              <T
                fr={<>Une seule API. <span className="lv-hl-lime">18 pays</span><br />francophones et anglophones.</>}
                en={<>One API. <span className="lv-hl-lime">18 countries</span><br />across francophone and anglophone Africa.</>}
              />
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="hub-stats">
              {HUBS.map((h) => {
                const countries = COVERAGE.filter((c) => c.hub === h.id);
                const ops = new Set(countries.flatMap((c) => c.ops));
                return (
                  <div className="hub-stat" key={h.id}>
                    <div className="hub-stat-bar" style={{ background: h.color }} />
                    <div className="hub-stat-label">{h.label}</div>
                    <div className="hub-stat-num"><Counter value={countries.length} /></div>
                    <div className="hub-stat-sub"><T fr="pays" en="countries" /> · {ops.size} <T fr="opérateurs" en="operators" /></div>
                    <div className="hub-stat-flags">{countries.slice(0, 8).map((c) => <span key={c.code}>{c.flag}</span>)}</div>
                  </div>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={200}>
            <CoverageCloud />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <HowSection />

      {/* Stats strip */}
      <StatsStrip />

      {/* Features */}
      <section className="lv-section">
        <div className="lv-container">
          <Reveal>
            <div className="lv-section-eyebrow"><span className="lv-section-num">03</span><T fr="Plateforme" en="Platform" /></div>
            <h2 className="lv-section-title">
              <T
                fr={<>Conçue pour développeurs.<br /><span className="lv-hl">Finie pour financiers.</span></>}
                en={<>Built for developers.<br /><span className="lv-hl">Polished for finance.</span></>}
              />
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="feat-grid">
              <div className="feat-card feat-card-dark feat-card-lg">
                <Icon name="code" size={22} color="var(--accent)" />
                <h4><T fr="Une API à intégrer ce soir." en="An API you can ship tonight." /></h4>
                <p><T fr="3 endpoints, webhooks signés HMAC, SDKs Flutter et Node. Documentation lisible, exemples copiables." en="3 endpoints, HMAC-signed webhooks, Flutter & Node SDKs. Clear docs, copy-paste examples." /></p>
                <div className="feat-code">{`POST /api/v1/payments
{
  "amount": 75000,
  "currency": "XAF",
  "country": "CM"
}

→ 201 payment_url`}</div>
              </div>
              <div className="feat-card feat-card-lime">
                <Icon name="shield" size={22} />
                <h4><T fr="Conforme COBAC & BCEAO." en="COBAC & BCEAO compliant." /></h4>
                <p><T fr="Agréments bancaires CEMAC et UEMOA. AML/CFT 2021. Audits annuels." en="CEMAC and WAEMU banking licences. AML/CFT 2021. Annual audits." /></p>
              </div>
              <div className="feat-card">
                <Icon name="bank" size={22} />
                <h4><T fr="Règlement T+1." en="T+1 settlement." /></h4>
                <p><T fr="Virement quotidien vers votre banque. Ou wallet mobile money en instantané." en="Daily wire to your bank. Or instant push to mobile money wallet." /></p>
              </div>
              <div className="feat-card">
                <Icon name="chart" size={22} />
                <h4><T fr="Dashboard bilingue." en="Bilingual dashboard." /></h4>
                <p><T fr="Paiements temps réel, rapports CSV, gestion des remboursements. FR/EN." en="Real-time payments, CSV reports, refund management. FR/EN." /></p>
              </div>
              <div className="feat-card">
                <Icon name="users" size={22} />
                <h4><T fr="Équipes & sous-comptes." en="Teams & sub-accounts." /></h4>
                <p><T fr="Rôles fine-grained. Sub-merchants pour vos clients. Webhooks par compte." en="Fine-grained roles. Sub-merchants for your customers. Per-account webhooks." /></p>
              </div>
              <div className="feat-card">
                <Icon name="globe" size={22} />
                <h4><T fr="Multi-devises native." en="Native multi-currency." /></h4>
                <p><T fr="XAF, XOF, NGN, KES, UGX, EUR, USD. Conversion au taux du jour." en="XAF, XOF, NGN, KES, UGX, EUR, USD. Daily market rates." /></p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="lv-section">
        <div className="lv-container">
          <Reveal>
            <div className="lv-section-eyebrow"><span className="lv-section-num">04</span><T fr="Adoption" en="Adoption" /></div>
            <h2 className="lv-section-title">
              <T
                fr={<>2 482 marchands. <span className="lv-hl">14 secteurs.</span><br />3 continents intégrés.</>}
                en={<>2,482 merchants. <span className="lv-hl">14 sectors.</span><br />3 continents connected.</>}
              />
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="testimonials">
              {[
                { q: <T fr="« Intégré en une après-midi. Notre CA en ligne a doublé en 6 semaines. »" en={'"Integrated in one afternoon. Online revenue doubled in 6 weeks."'} />, who: "Marie K.", role: "CEO, Boutique Mami", flag: "🇨🇲", c: "var(--orange-money)" },
                { q: <T fr="« On a couvert 8 pays en 2 semaines. Avant Nkap, il fallait 6 mois par pays. »" en={'"We covered 8 countries in 2 weeks. Before Nkap, each country took 6 months."'} />, who: "Sébastien K.", role: "CTO, KILIMO SARL", flag: "🇨🇮", c: "var(--primary)" },
                { q: <T fr="« Le taux de réussite des paiements MTN est passé de 78% à 96% chez nous. »" en={'"MTN payment success jumped from 78% to 96%."'} />, who: "Awa D.", role: "Founder, École Pro", flag: "🇸🇳", c: "var(--wave)" },
              ].map((t, i) => (
                <div className="testimonial" key={i}>
                  <div className="testimonial-quote">{t.q}</div>
                  <div className="testimonial-who">
                    <Avatar name={t.who} size={36} color={t.c} />
                    <div>
                      <div className="testimonial-name">{t.who} <span>{t.flag}</span></div>
                      <div className="testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="lv-cta-section">
        <div className="lv-container">
          <Reveal>
            <div className="lv-cta-block">
              <div className="lv-cta-bg-orb lv-cta-orb-1" />
              <div className="lv-cta-bg-orb lv-cta-orb-2" />
              <div className="lv-cta-content">
                <div className="lv-cta-eyebrow"><T fr="Prêt en 4 minutes" en="Live in 4 minutes" /></div>
                <h2>
                  <T
                    fr={<>Encaissez votre <span className="lv-hl-lime">premier paiement</span> dès aujourd{"'"}hui.</>}
                    en={<>Take your <span className="lv-hl-lime">first payment</span> today.</>}
                  />
                </h2>
                <p><T fr="Compte sans pièce. Mode test illimité. Activation production après KYC simplifié." en="Account creation without documents. Unlimited test mode. Live after light KYC." /></p>
                <div className="lv-cta-buttons">
                  <Link href="/merchant/register" className="btn btn-accent btn-lg" style={{ textDecoration: "none" }}>
                    <T fr="Démarrer maintenant" en="Get started" /> <Icon name="arrow" size={14} />
                  </Link>
                  <button className="btn btn-lg" style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <T fr="Parler à un commercial" en="Talk to sales" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── Stats Strip (separate for hook usage) ──────────── */

function StatsStrip() {
  const [ref, visible] = useReveal();
  return (
    <section className="lv-stats" ref={ref}>
      <div className="lv-container">
        <div className="lv-stats-grid">
          {[
            { v: 18, suf: "", lbl: <T fr="Pays couverts" en="Countries live" /> },
            { v: 16, suf: "", lbl: <T fr="Opérateurs intégrés" en="Operators integrated" /> },
            { v: 1.5, decimals: 1, suf: "%", lbl: <T fr="Frais à partir de" en="Fees starting from" /> },
            { v: 99.98, decimals: 2, suf: "%", lbl: <T fr="Uptime 90j" en="Uptime 90d" /> },
            { v: 4, suf: " min", lbl: <T fr="Activation" en="Time to live" /> },
          ].map((s, i) => (
            <div className="lv-stat" key={i}>
              <div className="lv-stat-num"><Counter value={s.v} decimals={s.decimals} trigger={visible} />{s.suf}</div>
              <div className="lv-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
