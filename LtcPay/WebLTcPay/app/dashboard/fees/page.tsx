"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Toggle } from "@/components/ui/toggle";
import { Avatar } from "@/components/ui/avatar";
import { T } from "@/lib/i18n";

/* ── mock data ─────────────────────────────────────────────── */

const STANDARD_RATES = [
  { method: "Orange Money", country: "CM", rate: "1.5%", minFee: "100 F", settlement: "T+1", color: "var(--orange-money)" },
  { method: "MTN MoMo",    country: "CM", rate: "1.5%", minFee: "100 F", settlement: "T+1", color: "var(--mtn)" },
  { method: "Wave",        country: "SN", rate: "1.5%", minFee: "75 F",  settlement: "T+2", color: "var(--wave)" },
  { method: "Wave",        country: "CI", rate: "1.5%", minFee: "75 F",  settlement: "T+2", color: "var(--wave)" },
  { method: "Airtel Money",country: "GA", rate: "2.0%", minFee: "150 F", settlement: "T+2", color: "var(--primary)" },
  { method: "Carte bancaire", country: "CEMAC", rate: "2.5%", minFee: "200 F", settlement: "T+3", color: "var(--ink)" },
];

const CUSTOM_OVERRIDES = [
  { merchant: "ShopEase", rate: "1.2%", reason: "Volume > 50M/mois", since: "Jan 2026" },
  { merchant: "PayGate CM", rate: "1.0%", reason: "Partenaire stratégique", since: "Mar 2026" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function FeesPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Pricing & frais" en="Pricing & fees" />]}
      title={<T fr="Configuration des frais" en="Fee Configuration" />}
      sub={<T fr="Taux standard, plans et surcharges personnalisées" en="Standard rates, plans and custom overrides" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Nouveau plan" en="New plan" />
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="Taux standard" en="Standard rate" />} value="1,5" unit="%" />
        <KpiCard label={<T fr="Plans actifs" en="Active plans" />} value="3" />
        <KpiCard label={<T fr="Taux personnalisés" en="Custom rates" />} value="2" after={<Pill tone="info"><T fr="marchands" en="merchants" /></Pill>} />
        <KpiCard label={<T fr="Frais moy. collecté" en="Avg fee collected" />} value="412" unit="F" delta="+5% vs M-1" deltaDir="up" />
      </div>

      {/* Standard rates table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
            <T fr="Grille tarifaire standard" en="Standard rate schedule" />
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
            <T fr="Appliquée par défaut à tous les marchands" en="Applied by default to all merchants" />
          </p>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "1.4fr 0.6fr 0.7fr 0.7fr 0.8fr" }}>
          <div><T fr="Méthode" en="Method" /></div>
          <div><T fr="Pays" en="Country" /></div>
          <div style={{ textAlign: "right" }}><T fr="Taux" en="Rate" /></div>
          <div style={{ textAlign: "right" }}><T fr="Min frais" en="Min fee" /></div>
          <div style={{ textAlign: "right" }}><T fr="Règlement" en="Settlement" /></div>
        </div>
        <div className="tbl">
          {STANDARD_RATES.map((r, i) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "1.4fr 0.6fr 0.7fr 0.7fr 0.8fr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{r.method}</span>
              </div>
              <div><Pill tone="neutral">{r.country}</Pill></div>
              <div style={{ textAlign: "right", fontWeight: 600 }}>{r.rate}</div>
              <div style={{ textAlign: "right", color: "var(--muted)" }}>{r.minFee}</div>
              <div style={{ textAlign: "right" }}><Pill tone="info">{r.settlement}</Pill></div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom overrides */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
              <T fr="Surcharges personnalisées" en="Custom merchant overrides" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Marchands avec tarification négociée" en="Merchants with negotiated pricing" />
            </p>
          </div>
          <button className="btn btn-ghost btn-sm">
            <Icon name="plus" size={13} /> <T fr="Ajouter" en="Add" />
          </button>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "1.2fr 0.6fr 1.4fr 0.8fr" }}>
          <div><T fr="Marchand" en="Merchant" /></div>
          <div style={{ textAlign: "right" }}><T fr="Taux" en="Rate" /></div>
          <div><T fr="Raison" en="Reason" /></div>
          <div style={{ textAlign: "right" }}><T fr="Depuis" en="Since" /></div>
        </div>
        <div className="tbl">
          {CUSTOM_OVERRIDES.map((o) => (
            <div key={o.merchant} className="row" style={{ gridTemplateColumns: "1.2fr 0.6fr 1.4fr 0.8fr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={o.merchant} size={24} />
                <span style={{ fontWeight: 500 }}>{o.merchant}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="mono" style={{ fontWeight: 600, color: "var(--success)" }}>{o.rate}</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{o.reason}</div>
              <div style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{o.since}</div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
