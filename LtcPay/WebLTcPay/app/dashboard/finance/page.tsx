"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmt } from "@/lib/format";

/* ── mock data ─────────────────────────────────────────────── */

const REVENUE_BREAKDOWN = [
  { method: "Orange Money", country: "CM", volume: 14_320, gross: 412_800_000, fees: 6_192_000, net: 406_608_000, color: "var(--orange-money)" },
  { method: "MTN MoMo",    country: "CM", volume: 11_840, gross: 298_400_000, fees: 4_476_000, net: 293_924_000, color: "var(--mtn)" },
  { method: "Wave",        country: "SN", volume: 4_210,  gross: 86_200_000,  fees: 1_293_000, net: 84_907_000,  color: "var(--wave)" },
  { method: "Carte bancaire", country: "CM", volume: 1_980,  gross: 26_600_000,  fees: 399_000,   net: 26_201_000,  color: "var(--primary)" },
];

const SETTLEMENTS = [
  { id: "SET-20260528", merchant: "ShopEase", amount: 4_200_000, status: "completed", date: "28 mai 2026" },
  { id: "SET-20260527", merchant: "PayGate CM", amount: 2_800_000, status: "completed", date: "27 mai 2026" },
  { id: "SET-20260526", merchant: "AfroBuy", amount: 1_950_000, status: "processing", date: "26 mai 2026" },
  { id: "SET-20260525", merchant: "TechMarket", amount: 3_100_000, status: "completed", date: "25 mai 2026" },
  { id: "SET-20260524", merchant: "FastFood DLA", amount: 890_000, status: "pending", date: "24 mai 2026" },
];

function settlementTone(s: string): "success" | "warn" | "info" | "neutral" {
  if (s === "completed") return "success";
  if (s === "processing") return "info";
  if (s === "pending") return "warn";
  return "neutral";
}

/* ── page ──────────────────────────────────────────────────── */

export default function FinancePage() {
  const [period] = useState("30d");

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Finance" en="Finance" />]}
      title={<T fr="Vue d'ensemble financière" en="Finance Overview" />}
      sub={<T fr="Revenus, frais et règlements" en="Revenue, fees and settlements" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} /> <T fr="Export" en="Export" />
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="Revenu net" en="Net revenue" />} value="12,4M" unit="F" delta="+18.2% vs M-1" deltaDir="up" />
        <KpiCard label={<T fr="GMV (Volume brut)" en="GMV (Gross volume)" />} value="824M" unit="F" delta="+12%" deltaDir="up" />
        <KpiCard label={<T fr="Frais collectés" en="Total fees collected" />} value="12,4M" unit="F" delta="+15.5%" deltaDir="up" />
        <KpiCard label={<T fr="Règlements en attente" en="Pending settlements" />} value="2,1M" unit="F" />
      </div>

      {/* Revenue breakdown */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
              <T fr="Décomposition par méthode" en="Revenue breakdown by method" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Période : 30 derniers jours" en="Period: last 30 days" />
            </p>
          </div>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "1.4fr 0.6fr 0.8fr 1fr 1fr 1fr" }}>
          <div><T fr="Méthode" en="Method" /></div>
          <div><T fr="Pays" en="Country" /></div>
          <div style={{ textAlign: "right" }}><T fr="Volume" en="Volume" /></div>
          <div style={{ textAlign: "right" }}><T fr="Montant brut" en="Gross amount" /></div>
          <div style={{ textAlign: "right" }}><T fr="Frais" en="Fees" /></div>
          <div style={{ textAlign: "right" }}><T fr="Net" en="Net" /></div>
        </div>
        <div className="tbl">
          {REVENUE_BREAKDOWN.map((r) => (
            <div key={r.method} className="row" style={{ gridTemplateColumns: "1.4fr 0.6fr 0.8fr 1fr 1fr 1fr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{r.method}</span>
              </div>
              <div><Pill tone="neutral">{r.country}</Pill></div>
              <div style={{ textAlign: "right" }} className="mono">{fmt(r.volume)}</div>
              <div style={{ textAlign: "right", fontWeight: 500 }}>{fmtXAF(r.gross)}</div>
              <div style={{ textAlign: "right", color: "var(--muted)" }}>{fmtXAF(r.fees)}</div>
              <div style={{ textAlign: "right", fontWeight: 500, color: "var(--success)" }}>{fmtXAF(r.net)}</div>
            </div>
          ))}
        </div>
        {/* Totals */}
        <div className="row" style={{ gridTemplateColumns: "1.4fr 0.6fr 0.8fr 1fr 1fr 1fr", borderTop: "2px solid var(--line)", fontWeight: 600 }}>
          <div><T fr="Total" en="Total" /></div>
          <div />
          <div style={{ textAlign: "right" }} className="mono">{fmt(REVENUE_BREAKDOWN.reduce((a, r) => a + r.volume, 0))}</div>
          <div style={{ textAlign: "right" }}>{fmtXAF(REVENUE_BREAKDOWN.reduce((a, r) => a + r.gross, 0))}</div>
          <div style={{ textAlign: "right", color: "var(--muted)" }}>{fmtXAF(REVENUE_BREAKDOWN.reduce((a, r) => a + r.fees, 0))}</div>
          <div style={{ textAlign: "right", color: "var(--success)" }}>{fmtXAF(REVENUE_BREAKDOWN.reduce((a, r) => a + r.net, 0))}</div>
        </div>
      </div>

      {/* Settlement schedule */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
            <T fr="Derniers règlements" en="Recent settlements" />
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
            <T fr="5 derniers règlements programmés" en="Last 5 scheduled settlements" />
          </p>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "1fr 1.2fr 1fr 0.8fr 0.8fr" }}>
          <div><T fr="ID" en="ID" /></div>
          <div><T fr="Marchand" en="Merchant" /></div>
          <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
          <div><T fr="Statut" en="Status" /></div>
          <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
        </div>
        <div className="tbl">
          {SETTLEMENTS.map((s) => (
            <div key={s.id} className="row" style={{ gridTemplateColumns: "1fr 1.2fr 1fr 0.8fr 0.8fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{s.id}</div>
              <div style={{ fontWeight: 500 }}>{s.merchant}</div>
              <div style={{ textAlign: "right", fontWeight: 500 }}>{fmtXAF(s.amount)}</div>
              <div><Pill tone={settlementTone(s.status)}>{s.status}</Pill></div>
              <div style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{s.date}</div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
