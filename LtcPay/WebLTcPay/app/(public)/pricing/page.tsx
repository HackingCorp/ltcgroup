"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { T, useLang } from "@/lib/i18n";
import Link from "next/link";

const PRICING_GRID = [
  { hub: "central", country: "Cameroun", flag: "\u{1F1E8}\u{1F1F2}", op: "MTN Money", rate: "2,5%" },
  { hub: "central", country: "Cameroun", flag: "\u{1F1E8}\u{1F1F2}", op: "Orange Money", rate: "2,5%" },
  { hub: "central", country: "Gabon", flag: "\u{1F1EC}\u{1F1E6}", op: "Airtel Money", rate: "3,5%" },
  { hub: "central", country: "Gabon", flag: "\u{1F1EC}\u{1F1E6}", op: "Moov Money", rate: "3,5%" },
  { hub: "central", country: "RDC", flag: "\u{1F1E8}\u{1F1E9}", op: "Airtel Money", rate: "4%" },
  { hub: "central", country: "RDC", flag: "\u{1F1E8}\u{1F1E9}", op: "Orange Money", rate: "4%" },
  { hub: "central", country: "RDC", flag: "\u{1F1E8}\u{1F1E9}", op: "M-Pesa", rate: "4%" },
  { hub: "central", country: "Congo", flag: "\u{1F1E8}\u{1F1EC}", op: "Airtel Money", rate: "5%" },
  { hub: "central", country: "Congo", flag: "\u{1F1E8}\u{1F1EC}", op: "MTN Money", rate: "4,5%" },
  { hub: "central", country: "Tchad", flag: "\u{1F1F9}\u{1F1E9}", op: "Moov Money", rate: "4%" },
  { hub: "central", country: "RCA", flag: "\u{1F1E8}\u{1F1EB}", op: "Orange Money", rate: "4%" },
  { hub: "west", country: "Bénin", flag: "\u{1F1E7}\u{1F1EF}", op: "MTN Money", rate: "3,5%" },
  { hub: "west", country: "Bénin", flag: "\u{1F1E7}\u{1F1EF}", op: "Moov Money", rate: "3,5%" },
  { hub: "west", country: "Togo", flag: "\u{1F1F9}\u{1F1EC}", op: "T-Money", rate: "3,5%" },
  { hub: "west", country: "Togo", flag: "\u{1F1F9}\u{1F1EC}", op: "Moov Money", rate: "3,5%" },
  { hub: "west", country: "Burkina Faso", flag: "\u{1F1E7}\u{1F1EB}", op: "Moov Money", rate: "3,5%" },
  { hub: "west", country: "Burkina Faso", flag: "\u{1F1E7}\u{1F1EB}", op: "Orange Money", rate: "3,5%" },
  { hub: "west", country: "Burkina Faso", flag: "\u{1F1E7}\u{1F1EB}", op: "Digital Cash", rate: "2,5%" },
  { hub: "west", country: "Mali", flag: "\u{1F1F2}\u{1F1F1}", op: "Orange Money", rate: "3,5%" },
  { hub: "west", country: "Mali", flag: "\u{1F1F2}\u{1F1F1}", op: "Wave", rate: "3,5%" },
  { hub: "west", country: "Sénégal", flag: "\u{1F1F8}\u{1F1F3}", op: "Orange Money", rate: "3%" },
  { hub: "west", country: "Sénégal", flag: "\u{1F1F8}\u{1F1F3}", op: "Wave", rate: "3%" },
  { hub: "west", country: "Côte d'Ivoire", flag: "\u{1F1E8}\u{1F1EE}", op: "Orange Money", rate: "3%" },
  { hub: "west", country: "Côte d'Ivoire", flag: "\u{1F1E8}\u{1F1EE}", op: "MTN Money", rate: "3%" },
  { hub: "east", country: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", op: "M-Pesa", rate: "3%" },
  { hub: "east", country: "Uganda", flag: "\u{1F1FA}\u{1F1EC}", op: "MTN", rate: "4%" },
  { hub: "east", country: "Nigeria", flag: "\u{1F1F3}\u{1F1EC}", op: "Bank transfer", rate: "2,5%" },
];

const HUB_META: Record<string, { fr: string; en: string; color: string }> = {
  central: { fr: "Afrique Centrale", en: "Central Africa", color: "var(--primary)" },
  west: { fr: "Afrique de l'Ouest", en: "West Africa", color: "var(--orange-money)" },
  east: { fr: "Afrique de l'Est", en: "East Africa", color: "var(--success)" },
};

export default function PricingPage() {
  const { lang } = useLang();
  const [hub, setHub] = useState("all");
  const [query, setQuery] = useState("");

  const rows = PRICING_GRID.filter(r =>
    (hub === "all" || r.hub === hub) &&
    (query === "" || r.country.toLowerCase().includes(query.toLowerCase()) || r.op.toLowerCase().includes(query.toLowerCase()))
  );

  const grouped: Record<string, Record<string, { flag: string; ops: typeof PRICING_GRID }>> = {};
  rows.forEach(r => {
    grouped[r.hub] = grouped[r.hub] || {};
    grouped[r.hub][r.country] = grouped[r.hub][r.country] || { flag: r.flag, ops: [] };
    grouped[r.hub][r.country].ops.push(r);
  });

  return (
    <div style={{ background: "var(--bg)", padding: "56px 32px 80px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <header style={{ maxWidth: 760, margin: "0 0 40px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500, color: "var(--ink-2)", letterSpacing: "0.04em" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
            <T fr="Tarifs · 18 pays" en="Pricing · 18 countries" />
          </span>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1.02, letterSpacing: "-0.03em", margin: "20px 0 16px" }}>
            <T fr={<>Un tarif clair, <span style={{ background: "var(--accent)", padding: "0 8px", borderRadius: 8 }}>par pays</span> et par opérateur.</>}
               en={<>Clear pricing, <span style={{ background: "var(--accent)", padding: "0 8px", borderRadius: 8 }}>by country</span> and operator.</>} />
          </h1>
          <p style={{ color: "var(--ink-3)", fontSize: 17, lineHeight: 1.45, margin: 0, maxWidth: 620 }}>
            <T fr="Frais de pay-in déduits automatiquement à chaque encaissement. Pas d'abonnement, pas de frais cachés."
               en="Pay-in fees auto-deducted on each collection. No subscription, no hidden fees." />
          </p>
        </header>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "36px 0" }}>
          <div style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 14, padding: 22 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}><T fr="À partir de" en="Starting from" /></div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 44, letterSpacing: "-0.025em", lineHeight: 1.05, marginTop: 8 }}>2,5<small style={{ fontSize: 18, opacity: 0.5 }}>%</small></div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 6 }}>Digital Cash {"·"} Burkina & Mali</div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 22 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}><T fr="Taux médian" en="Median rate" /></div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 44, letterSpacing: "-0.025em", lineHeight: 1.05, marginTop: 8 }}>3,5<small style={{ fontSize: 18, opacity: 0.5 }}>%</small></div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}><T fr="Mobile money Afrique de l'Ouest" en="West Africa mobile money" /></div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 22 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}><T fr="Couverture" en="Coverage" /></div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 44, letterSpacing: "-0.025em", lineHeight: 1.05, marginTop: 8 }}>{new Set(PRICING_GRID.map(r => r.country)).size}<small style={{ fontSize: 18, opacity: 0.5 }}> <T fr="pays" en="countries" /></small></div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{PRICING_GRID.length} <T fr="routes opérateur actives" en="active operator routes" /></div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <Icon name="search" size={14} color="var(--muted)" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={lang === "en" ? "Search country or operator…" : "Rechercher un pays ou opérateur…"} style={{ border: 0, background: "transparent", outline: "none", flex: 1, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink)" }} />
          </div>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-2)", borderRadius: 8 }}>
            {[
              { id: "all", label: <T fr="Tous" en="All" /> },
              { id: "central", label: <T fr="Centrale" en="Central" /> },
              { id: "west", label: <T fr="Ouest" en="West" /> },
              { id: "east", label: <T fr="Est" en="East" /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setHub(tab.id)} style={{ appearance: "none", border: 0, cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontFamily: "var(--body)", fontSize: 12, fontWeight: 500, color: hub === tab.id ? "var(--bg)" : "var(--muted)", background: hub === tab.id ? "var(--ink)" : "transparent" }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Grid by hub */}
        {(Object.keys(HUB_META) as Array<keyof typeof HUB_META>).filter(h => grouped[h]).map(h => {
          const countries = grouped[h];
          const meta = HUB_META[h];
          const routeCount = Object.values(countries).reduce((a, c) => a + c.ops.length, 0);
          return (
            <div key={h} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ width: 28, height: 4, borderRadius: 2, background: meta.color }} />
                <span style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.015em" }}>{lang === "en" ? meta.en : meta.fr}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>{Object.keys(countries).length} <T fr="pays" en="countries" /> {"·"} {routeCount} routes</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {Object.entries(countries).map(([country, data]) => (
                  <div key={country} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
                      <span style={{ fontSize: 24 }}>{data.flag}</span>
                      <span style={{ fontWeight: 500, fontSize: 15 }}>{country}</span>
                      <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>{data.ops.length} ops</span>
                    </div>
                    {data.ops.map((o, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 18px", borderBottom: i < data.ops.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-2)" }} />
                          {o.op}
                        </span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600 }}>{o.rate}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted)" }}>
            <T fr="Aucun résultat. Essayez un autre pays ou opérateur." en="No results. Try another country or operator." />
          </div>
        )}

        {/* Note */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--primary-faint)", border: "1px solid var(--primary-soft)", borderRadius: 14, padding: 18, marginTop: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="info" size={16} color="white" />
          </div>
          <div>
            <strong style={{ fontWeight: 500 }}><T fr="Comment lire ces taux" en="How to read these rates" /></strong>
            <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13, lineHeight: 1.5 }}>
              <T fr="Le pourcentage est prélevé sur chaque encaissement. Les cartes bancaires et virements internationaux sont tarifés sur devis."
                 en="The percentage is taken on each collection. Bank cards and international transfers are quoted on request." />
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 32, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/merchant/register" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>
            <T fr="Créer un compte gratuit" en="Create a free account" /> <Icon name="arrow" size={14} color="white" />
          </Link>
          <button className="btn btn-ghost btn-lg"><T fr="Demander un tarif sur mesure" en="Request custom pricing" /></button>
        </div>
      </div>
    </div>
  );
}
