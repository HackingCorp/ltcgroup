"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";

/* ── mock data ─────────────────────────────────────────────── */

const DISPUTES: { id: string; merchant: string; ref: string; customer: string; amount: number; reason: string; filed: string; deadline: string; status: string; priority?: boolean }[] = [
  { id: "DSP-2026-0142", merchant: "Boutique Mami SARL", ref: "PAY-1A4C82E7", customer: "Cabinet Atangana", amount: 15000, reason: "Service non rendu", filed: "il y a 2 j", deadline: "5 j", status: "evidence_required" },
  { id: "DSP-2026-0141", merchant: "Restaurant Le Baobab", ref: "PAY-7A9F1B2C", customer: "Olivier Mbu", amount: 8500, reason: "Double facturation", filed: "il y a 1 j", deadline: "6 j", status: "evidence_received" },
  { id: "DSP-2026-0140", merchant: "KILIMO SARL", ref: "PAY-4F2D9E8B", customer: "Cooperative Bafia", amount: 245000, reason: "Produit non conforme", filed: "il y a 3 j", deadline: "4 j", status: "under_review" },
  { id: "DSP-2026-0139", merchant: "Agro Export Cameroun", ref: "PAY-3B7C82A1", customer: "Wholesale Lagos", amount: 1850000, reason: "Fraude presumee", filed: "il y a 5 j", deadline: "2 j", status: "escalated", priority: true },
  { id: "DSP-2026-0138", merchant: "Beaute Africaine", ref: "PAY-9E1D7F3C", customer: "Adele Toure", amount: 32000, reason: "Annulation tardive", filed: "il y a 6 j", deadline: "1 j", status: "won" },
  { id: "DSP-2026-0137", merchant: "Boutique Mami SARL", ref: "PAY-2A8B71D4", customer: "Marc Belinga", amount: 67000, reason: "Erreur livraison", filed: "il y a 1 sem", deadline: "expiree", status: "lost" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function DisputesPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Litiges" en="Disputes" />]}
      title={<T fr="Litiges & remboursements" en="Disputes & refunds" />}
      sub={<T fr="7 actifs · 1 prioritaire · 2 delais < 24h" en="7 active · 1 priority · 2 deadlines < 24h" />}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard label={<T fr="Litiges actifs" en="Active disputes" />} value="7" after={<Pill tone="warn">deadline</Pill>} />
        <KpiCard label={<T fr="Taux de gain" en="Win rate" />} value="78" unit="%" delta="+4 pt" />
        <KpiCard label={<T fr="Delai moyen" en="Avg resolution" />} value="3,2" unit="j" />
        <KpiCard label={<T fr="Exposition" en="Exposure" />} value="2,2" unit="M F" />
      </div>

      {/* Disputes table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1.4fr 1fr 0.9fr 1.4fr 0.8fr 0.6fr 24px" }}>
            <span>ID</span>
            <span><T fr="Marchand" en="Merchant" /></span>
            <span><T fr="Client" en="Customer" /></span>
            <span style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></span>
            <span><T fr="Motif" en="Reason" /></span>
            <span><T fr="Delai" en="Deadline" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span></span>
          </div>
          {DISPUTES.map(d => (
            <div
              className="row clickable"
              key={d.id}
              style={{
                gridTemplateColumns: "1fr 1.4fr 1fr 0.9fr 1.4fr 0.8fr 0.6fr 24px",
                background: d.priority ? "var(--rose-soft)" : undefined,
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: 12 }}>{d.id}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{d.ref}</div>
              </div>
              <div style={{ fontSize: 13 }}>{d.merchant}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.customer}</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{fmtXAF(d.amount)}</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{d.reason}</div>
              <div className="mono" style={{
                fontSize: 11,
                color: d.deadline === "expiree" ? "var(--rose)"
                  : d.deadline.includes("1 j") || d.deadline.includes("2 j") ? "var(--warn)"
                  : "var(--muted)",
              }}>{d.deadline}</div>
              <Pill tone={d.status === "won" ? "success" : d.status === "lost" ? "fail" : d.status === "escalated" ? "fail" : "warn"}>{d.status}</Pill>
              <Icon name="chevR" size={14} color="var(--muted)" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
