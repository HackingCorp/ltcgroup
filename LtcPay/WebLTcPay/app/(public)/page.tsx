"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { T, useLang } from "@/lib/i18n";

const COVERAGE = [
  { hub: "central", country: "Cameroun", code: "CM", flag: "\u{1F1E8}\u{1F1F2}", ops: ["MTN Money", "Orange Money"] },
  { hub: "central", country: "Gabon", code: "GA", flag: "\u{1F1EC}\u{1F1E6}", ops: ["Airtel Money", "Moov Money"] },
  { hub: "central", country: "RDC", code: "CD", flag: "\u{1F1E8}\u{1F1E9}", ops: ["Airtel Money", "Orange Money", "M-Pesa"] },
  { hub: "central", country: "Congo", code: "CG", flag: "\u{1F1E8}\u{1F1EC}", ops: ["Airtel Money", "MTN Money"] },
  { hub: "central", country: "Tchad", code: "TD", flag: "\u{1F1F9}\u{1F1E9}", ops: ["Moov Money", "Airtel Money"] },
  { hub: "central", country: "RCA", code: "CF", flag: "\u{1F1E8}\u{1F1EB}", ops: ["Orange Money"] },
  { hub: "west", country: "S\u00e9n\u00e9gal", code: "SN", flag: "\u{1F1F8}\u{1F1F3}", ops: ["Orange Money", "Wave", "Free Money"] },
  { hub: "west", country: "C\u00f4te d'Ivoire", code: "CI", flag: "\u{1F1E8}\u{1F1EE}", ops: ["Orange Money", "MTN Money", "Wave"] },
  { hub: "west", country: "B\u00e9nin", code: "BJ", flag: "\u{1F1E7}\u{1F1EF}", ops: ["MTN Money", "Moov Money"] },
  { hub: "west", country: "Togo", code: "TG", flag: "\u{1F1F9}\u{1F1EC}", ops: ["T-Money", "Moov Money"] },
  { hub: "west", country: "Burkina Faso", code: "BF", flag: "\u{1F1E7}\u{1F1EB}", ops: ["Moov Money", "Orange Money"] },
  { hub: "west", country: "Mali", code: "ML", flag: "\u{1F1F2}\u{1F1F1}", ops: ["Orange Money", "Moov Money", "Wave"] },
  { hub: "west", country: "Niger", code: "NE", flag: "\u{1F1F3}\u{1F1EA}", ops: ["Airtel Money"] },
  { hub: "west", country: "Guin\u00e9e", code: "GN", flag: "\u{1F1EC}\u{1F1F3}", ops: ["MTN Money", "Orange Money"] },
  { hub: "east", country: "Uganda", code: "UG", flag: "\u{1F1FA}\u{1F1EC}", ops: ["MTN", "Airtel"] },
  { hub: "east", country: "Kenya", code: "KE", flag: "\u{1F1F0}\u{1F1EA}", ops: ["Airtel Money", "M-Pesa"] },
  { hub: "east", country: "Nigeria", code: "NG", flag: "\u{1F1F3}\u{1F1EC}", ops: ["Bank transfer"] },
  { hub: "central", country: "Guin\u00e9e \u00c9q.", code: "GQ", flag: "\u{1F1EC}\u{1F1F6}", ops: ["Muni"] },
];

const ALL_OPERATORS = ["MTN Money", "Orange Money", "Airtel Money", "Moov Money", "Wave", "M-Pesa", "T-Money", "Coris Money", "Digital Cash", "Sama Money", "Afrimoney", "Free Money", "Bank transfer", "GIM-UEMOA", "Visa", "Mastercard"];

function PublicNav() {
  const { lang, setLang } = useLang();
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(250, 250, 247, 0.85)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--line)",
    }}>
      <div style={{
        maxWidth: 1240, margin: "0 auto", padding: "14px 32px",
        display: "flex", alignItems: "center", gap: 32,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--ink)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
          <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 19, letterSpacing: "-0.02em" }}>Nkap <em style={{ fontStyle: "italic", fontWeight: 400, opacity: 0.7 }}>Pay</em></span>
        </Link>
        <div style={{ display: "flex", gap: 28, marginLeft: 16, flex: 1 }}>
          {[
            { href: "/pricing", label: <T fr="Tarifs" en="Pricing" /> },
            { href: "/how-it-works", label: <T fr="Comment \u00e7a marche" en="How it works" /> },
            { href: "/docs", label: <T fr="Documentation" en="Docs" /> },
            { href: "/status", label: "Status" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ color: "var(--ink-3)", fontSize: 14, fontWeight: 450, textDecoration: "none", padding: "6px 0" }}>{l.label}</Link>
          ))}
        </div>
        <div style={{ display: "flex", padding: 2, background: "var(--bg-2)", borderRadius: 6, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600 }}>
          <button onClick={() => setLang("fr")} style={{ appearance: "none", border: 0, background: lang === "fr" ? "var(--ink)" : "transparent", color: lang === "fr" ? "var(--bg)" : "var(--muted)", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", letterSpacing: "0.05em" }}>FR</button>
          <button onClick={() => setLang("en")} style={{ appearance: "none", border: 0, background: lang === "en" ? "var(--ink)" : "transparent", color: lang === "en" ? "var(--bg)" : "var(--muted)", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", letterSpacing: "0.05em" }}>EN</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/merchant/login" style={{ fontSize: 14, color: "var(--ink-2)", textDecoration: "none", fontWeight: 450 }}><T fr="Connexion" en="Sign in" /></Link>
          <Link href="/merchant/register" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            <T fr="Commencer" en="Get started" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "64px 0 32px", borderTop: "1px solid var(--line)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(4, 1fr)", gap: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--ink)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
              Nkap Pay
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, margin: "14px 0", maxWidth: 260 }}>
              <T fr="La passerelle de paiement pour l'Afrique. Une filiale du groupe LTC." en="The payment gateway for Africa. A subsidiary of LTC Group." />
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", fontSize: 20 }}>
              {COVERAGE.slice(0, 12).map(c => <span key={c.code}>{c.flag}</span>)}
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, background: "var(--ink)", color: "var(--accent)", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center" }}>+6</span>
            </div>
          </div>
          {[
            { h: <T fr="Produit" en="Product" />, items: [["Tarifs", "/pricing"], ["Comment \u00e7a marche", "/how-it-works"], ["Liens de paiement", "#"], ["Sous-comptes", "#"]] },
            { h: <T fr="D\u00e9veloppeurs" en="Developers" />, items: [["Documentation", "/docs"], ["Status", "/status"], ["Changelog", "#"], ["SDK Flutter", "#"]] },
            { h: <T fr="Soci\u00e9t\u00e9" en="Company" />, items: [["\u00c0 propos", "#"], ["Conformit\u00e9", "#"], ["Terms", "#"], ["Privacy", "#"]] },
            { h: "Contact", items: [["hello@nkap.pay", "#"], ["+237 222 22 11 00", "#"], ["Yaound\u00e9 \u00b7 Douala", "#"], ["Abidjan \u00b7 Dakar", "#"]] },
          ].map((col, i) => (
            <div key={i}>
              <h5 style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: "0 0 14px", fontWeight: 500 }}>{col.h}</h5>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {col.items.map(([label, href], j) => (
                  <li key={j}><Link href={href || "#"} style={{ color: "var(--ink)", textDecoration: "none", fontSize: 13 }}>{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 56, paddingTop: 24, borderTop: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
          <span>{"\u00a9"} 2026 LTC Group SARL</span>
          <span>XAF {"\u00b7"} XOF {"\u00b7"} NGN {"\u00b7"} KES {"\u00b7"} UGX {"\u00b7"} EUR {"\u00b7"} USD</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg)", overflowX: "hidden", minHeight: "100vh" }}>
      <PublicNav />

      {/* Hero */}
      <section style={{ position: "relative", padding: "64px 0 80px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "6px 14px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--line)" }}>
              <span style={{ display: "flex", gap: 2, fontSize: 18 }}>
                {["\u{1F1E8}\u{1F1F2}", "\u{1F1F8}\u{1F1F3}", "\u{1F1E8}\u{1F1EE}", "\u{1F1E7}\u{1F1EB}", "\u{1F1F2}\u{1F1F1}", "\u{1F1EC}\u{1F1E6}", "\u{1F1E8}\u{1F1E9}"].map((f, i) => <span key={i}>{f}</span>)}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500, color: "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
                <T fr="18 pays \u00b7 16 op\u00e9rateurs \u00b7 1 API" en="18 countries \u00b7 16 operators \u00b7 1 API" />
              </span>
            </span>

            <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: "clamp(44px, 6.5vw, 72px)", lineHeight: 0.98, letterSpacing: "-0.035em", margin: "24px 0 0" }}>
              <T
                fr={<>L{"'"}API <span style={{ background: "var(--accent)", padding: "0 8px", borderRadius: 8 }}>de paiement</span> faite pour l{"'"}Afrique.</>}
                en={<>The payment <span style={{ background: "var(--accent)", padding: "0 8px", borderRadius: 8 }}>API built</span> for Africa.</>}
              />
            </h1>

            <p style={{ fontSize: 19, lineHeight: 1.4, color: "var(--ink-3)", maxWidth: 560, margin: "28px 0 32px" }}>
              <T
                fr="Mobile Money, cartes, Wave, virement bancaire \u2014 encaissez de Dakar \u00e0 Kinshasa avec une seule int\u00e9gration. R\u00e8glement quotidien en F CFA."
                en="Mobile Money, cards, Wave, bank transfer \u2014 collect payments from Dakar to Kinshasa with one integration. Daily XAF settlement."
              />
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/merchant/register" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>
                <T fr="Cr\u00e9er un compte gratuit" en="Create a free account" />
                <Icon name="arrow" size={14} color="white" />
              </Link>
              <Link href="/docs" className="btn btn-ghost btn-lg" style={{ textDecoration: "none" }}>
                <Icon name="play" size={13} />
                <T fr="Voir la d\u00e9mo" en="Watch the demo" />
              </Link>
            </div>

            <div style={{ display: "flex", gap: 22, marginTop: 28, fontSize: 13, color: "var(--muted)", flexWrap: "wrap" }}>
              {[
                <T key="1" fr="Sandbox illimit\u00e9" en="Unlimited sandbox" />,
                <T key="2" fr="Aucune CB requise" en="No card needed" />,
                <T key="3" fr="Activation 4 min" en="Live in 4 min" />,
              ].map((t, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="check" size={12} color="var(--success)" />{t}
                </span>
              ))}
            </div>
          </div>

          {/* Terminal */}
          <div style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px -10px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <span style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>~ /api/v1/payments</span>
              <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{"\u25cf"} live</span>
            </div>
            <div style={{ padding: "20px 22px", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 2 }}>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>$</span> nkap pay --create</div>
              <div><span style={{ color: "#ff9d9d" }}>amount</span><span style={{ color: "rgba(255,255,255,0.4)" }}>=</span><span style={{ color: "var(--accent)" }}>75 000</span></div>
              <div><span style={{ color: "#ff9d9d" }}>country</span><span style={{ color: "rgba(255,255,255,0.4)" }}>=</span><span style={{ color: "var(--accent)" }}>{'"'}{"\u{1F1E8}\u{1F1F2}"} Cameroun{'"'}</span></div>
              <div><span style={{ color: "#ff9d9d" }}>method</span><span style={{ color: "rgba(255,255,255,0.4)" }}>=</span><span style={{ color: "var(--accent)" }}>{'"'}Orange Money{'"'}</span></div>
              <div><span style={{ color: "#ff9d9d" }}>phone</span><span style={{ color: "rgba(255,255,255,0.4)" }}>=</span><span style={{ color: "var(--accent)" }}>{'"'}+237 670 12 34 56{'"'}</span></div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />
              {[
                { time: "0.04s", text: <T fr="Paiement cr\u00e9\u00e9" en="Payment created" /> },
                { time: "0.8s", text: <T fr="Demande envoy\u00e9e \u00e0 Orange Money" en="Pushed to Orange Money" /> },
                { time: "2.4s", text: <T fr="Client a confirm\u00e9 l'OTP" en="Customer confirmed OTP" /> },
                { time: "3.2s", text: <T fr="Webhook livr\u00e9 200 OK" en="Webhook delivered 200 OK" />, success: true },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 26 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 36, flexShrink: 0 }}>{step.time}</span>
                  <span style={{ fontWeight: step.success ? 600 : 400, color: step.success ? "var(--accent)" : "var(--bg)" }}>{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Operator marquee */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", overflow: "hidden", padding: "14px 0" }}>
        <div style={{ display: "flex", gap: 12, animation: "none", whiteSpace: "nowrap" }}>
          {[...ALL_OPERATORS, ...ALL_OPERATORS.slice(0, 8)].map((name, i) => (
            <span key={i} style={{ whiteSpace: "nowrap", padding: "8px 16px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 14, fontWeight: 500, color: "var(--ink-2)" }}>{name}</span>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <section style={{ padding: "64px 0", background: "var(--ink)", color: "var(--bg)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 32 }}>
            {[
              { v: "18", label: <T fr="Pays couverts" en="Countries live" /> },
              { v: "16", label: <T fr="Op\u00e9rateurs int\u00e9gr\u00e9s" en="Operators integrated" /> },
              { v: "1,5%", label: <T fr="Frais \u00e0 partir de" en="Fees starting from" /> },
              { v: "99,98%", label: <T fr="Uptime 90j" en="Uptime 90d" /> },
              { v: "4 min", label: <T fr="Activation" en="Time to live" /> },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1, letterSpacing: "-0.03em", color: "var(--accent)" }}>{s.v}</div>
                <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "100px 0" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ padding: "2px 8px", background: "var(--ink)", color: "var(--bg)", borderRadius: 4 }}>03</span>
            <T fr="Plateforme" en="Platform" />
          </div>
          <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.04, letterSpacing: "-0.028em", margin: "0 0 56px", maxWidth: 880 }}>
            <T fr={<>Con\u00e7ue pour d\u00e9veloppeurs. <span style={{ background: "var(--accent)", padding: "0 8px", borderRadius: 8 }}>Finie pour financiers.</span></>}
               en={<>Built for developers. <span style={{ background: "var(--accent)", padding: "0 8px", borderRadius: 8 }}>Polished for finance.</span></>} />
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { icon: "code", title: <T fr="Une API \u00e0 int\u00e9grer ce soir." en="An API you can ship tonight." />, desc: <T fr="3 endpoints, webhooks sign\u00e9s HMAC, SDKs Flutter et Node." en="3 endpoints, HMAC-signed webhooks, Flutter & Node SDKs." /> },
              { icon: "shield", title: <T fr="Conforme COBAC & BCEAO." en="COBAC & BCEAO compliant." />, desc: <T fr="Agr\u00e9ments bancaires CEMAC et UEMOA. AML/CFT 2021." en="CEMAC and WAEMU banking licences. AML/CFT 2021." /> },
              { icon: "bank", title: <T fr="R\u00e8glement T+1." en="T+1 settlement." />, desc: <T fr="Virement quotidien vers votre banque ou wallet instantan\u00e9." en="Daily wire to your bank or instant wallet push." /> },
              { icon: "chart", title: <T fr="Dashboard bilingue." en="Bilingual dashboard." />, desc: <T fr="Paiements temps r\u00e9el, rapports CSV, gestion remboursements." en="Real-time payments, CSV reports, refund management." /> },
              { icon: "users", title: <T fr="\u00c9quipes & sous-comptes." en="Teams & sub-accounts." />, desc: <T fr="R\u00f4les fine-grained. Sub-merchants pour vos clients." en="Fine-grained roles. Sub-merchants for your customers." /> },
              { icon: "globe", title: <T fr="Multi-devises native." en="Native multi-currency." />, desc: <T fr="XAF, XOF, NGN, KES, UGX, EUR, USD." en="XAF, XOF, NGN, KES, UGX, EUR, USD." /> },
            ].map((f, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 28, transition: "transform 0.2s" }}>
                <Icon name={f.icon} size={22} />
                <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.018em", margin: "18px 0 10px" }}>{f.title}</h4>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "100px 0" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { q: <T fr="\u00ab Int\u00e9gr\u00e9 en une apr\u00e8s-midi. Notre CA en ligne a doubl\u00e9 en 6 semaines. \u00bb" en="\u201cIntegrated in one afternoon. Online revenue doubled in 6 weeks.\u201d" />, who: "Marie K.", role: "CEO, Boutique Mami", color: "var(--orange-money)" },
              { q: <T fr="\u00ab On a couvert 8 pays en 2 semaines. Avant Nkap, il fallait 6 mois par pays. \u00bb" en="\u201cWe covered 8 countries in 2 weeks. Before Nkap, each country took 6 months.\u201d" />, who: "S\u00e9bastien K.", role: "CTO, KILIMO SARL", color: "var(--primary)" },
              { q: <T fr="\u00ab Le taux de r\u00e9ussite MTN est pass\u00e9 de 78% \u00e0 96% chez nous. \u00bb" en="\u201cMTN payment success jumped from 78% to 96%.\u201d" />, who: "Awa D.", role: "Founder, \u00c9cole Pro", color: "var(--wave)" },
            ].map((t, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 19, lineHeight: 1.35, letterSpacing: "-0.015em", flex: 1 }}>{t.q}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={t.who} size={36} color={t.color} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{t.who}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 0" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 24, padding: "72px 56px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "relative", zIndex: 1, maxWidth: 720 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}>
                <T fr="Pr\u00eat en 4 minutes" en="Live in 4 minutes" />
              </div>
              <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.04, letterSpacing: "-0.028em", margin: "14px 0 16px" }}>
                <T fr={<>Encaissez votre <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 10px", borderRadius: 8 }}>premier paiement</span> d\u00e8s aujourd{"'"}hui.</>}
                   en={<>Take your <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 10px", borderRadius: 8 }}>first payment</span> today.</>} />
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, lineHeight: 1.5, margin: "0 0 32px", maxWidth: 520 }}>
                <T fr="Compte sans pi\u00e8ce. Mode test illimit\u00e9. Activation production apr\u00e8s KYC simplifi\u00e9." en="Account creation without documents. Unlimited test mode. Live after light KYC." />
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/merchant/register" className="btn btn-accent btn-lg" style={{ textDecoration: "none" }}>
                  <T fr="D\u00e9marrer maintenant" en="Get started" /> <Icon name="arrow" size={14} />
                </Link>
                <button className="btn btn-lg" style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <T fr="Parler \u00e0 un commercial" en="Talk to sales" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
