"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { MethodChip } from "@/components/ui/method-chip";
import { T } from "@/lib/i18n";

/* ── mock data ─────────────────────────────────────────────── */

const STANDARD_RULES = [
  { method: "orange", name: "Orange Money", s: "2,5%", g: "1,5%", sc: "0,9%", t: "T+1" },
  { method: "mtn", name: "MTN MoMo", s: "2,5%", g: "1,5%", sc: "0,9%", t: "T+1" },
  { method: "wave", name: "Wave", s: "1,5%", g: "1,0%", sc: "0,7%", t: "T+1" },
  { method: "card", name: "Carte bancaire", s: "2,9% + 100 F", g: "2,5% + 100 F", sc: "2,2% + 50 F", t: "T+3" },
];

const CUSTOM_RATES = [
  { merch: "Agro Export Cameroun (MER-009)", method: "orange", std: "1,5%", custom: "0,8%", exp: "31 dec 2026" },
  { merch: "Agro Export Cameroun (MER-009)", method: "card", std: "2,5%", custom: "2,1%", exp: "31 dec 2026" },
  { merch: "Wave Senegal Reseller (MER-010)", method: "wave", std: "1,5%", custom: "1,2%", exp: "30 juin 2026" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function FeesPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Pricing & frais" en="Pricing & fees" />]}
      title={<T fr="Modulation tarifaire" en="Fee modulation" />}
      sub={<T fr="Tarifs par marchand, par methode, par pays. Modifications appliquees au prochain cycle." en="Fees per merchant, per method, per country. Edits applied next cycle." />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Nouvelle regle" en="New rule" />
        </button>
      }
    >
      {/* KPIs per plan tier */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard label="Starter" value="2,5" unit="%" after={<Pill tone="neutral" plain>2 184</Pill>} />
        <KpiCard label="Growth" value="1,5" unit="%" after={<Pill tone="info" plain>271</Pill>} />
        <KpiCard label="Scale" value="0,9" unit="%" after={<Pill tone="success" plain>24</Pill>} />
        <KpiCard label={<T fr="Tarifs custom" en="Custom rates" />} value="3" after={<Pill tone="warn" plain>actif</Pill>} />
      </div>

      {/* Standard rules per plan */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Regles standard par plan" en="Standard rules per plan" /></h3>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.8fr" }}>
            <span><T fr="Methode" en="Method" /></span>
            <span style={{ textAlign: "right" }}>Starter</span>
            <span style={{ textAlign: "right" }}>Growth</span>
            <span style={{ textAlign: "right" }}>Scale</span>
            <span><T fr="Delai reglement" en="Settle delay" /></span>
            <span style={{ textAlign: "right" }}><T fr="Action" en="Action" /></span>
          </div>
          {STANDARD_RULES.map((r, i) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.8fr" }}>
              <div><MethodChip kind={r.method} label={r.name} /></div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>{r.s}</div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>{r.g}</div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>{r.sc}</div>
              <div className="mono" style={{ fontSize: 12 }}>{r.t}</div>
              <div style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm"><T fr="Modifier" en="Edit" /></button></div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom rates (per-merchant override) */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Tarifs custom (override par marchand)" en="Custom rates (per-merchant override)" /></h3>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 0.8fr" }}>
            <span><T fr="Marchand" en="Merchant" /></span>
            <span><T fr="Methode" en="Method" /></span>
            <span style={{ textAlign: "right" }}><T fr="Tarif standard" en="Standard fee" /></span>
            <span style={{ textAlign: "right" }}><T fr="Tarif negocie" en="Negotiated fee" /></span>
            <span><T fr="Valide jusqu'au" en="Expires" /></span>
            <span style={{ textAlign: "right" }}><T fr="Action" en="Action" /></span>
          </div>
          {CUSTOM_RATES.map((r, i) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 0.8fr" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.merch}</div>
              <div><MethodChip kind={r.method} /></div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>{r.std}</div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right", color: "var(--success)", fontWeight: 600 }}>{r.custom}</div>
              <div className="mono" style={{ fontSize: 11 }}>{r.exp}</div>
              <div style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm"><T fr="Modifier" en="Edit" /></button></div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
