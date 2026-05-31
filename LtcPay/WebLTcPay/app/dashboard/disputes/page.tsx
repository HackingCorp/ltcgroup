"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Avatar } from "@/components/ui/avatar";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";

/* ── mock data ─────────────────────────────────────────────── */

const DISPUTES = [
  { id: "DSP-4201", merchant: "ShopEase",   customer: "+237 690 112 345", amount: 125_000, reason: "Non livré",          status: "open",      date: "29 mai 2026" },
  { id: "DSP-4200", merchant: "PayGate CM", customer: "+237 677 889 012", amount: 85_000,  reason: "Double débit",        status: "open",      date: "28 mai 2026" },
  { id: "DSP-4199", merchant: "AfroBuy",    customer: "+237 655 234 567", amount: 210_000, reason: "Produit défectueux",  status: "under_review", date: "27 mai 2026" },
  { id: "DSP-4198", merchant: "TechMarket", customer: "+237 699 345 678", amount: 45_000,  reason: "Montant incorrect",    status: "resolved",  date: "26 mai 2026" },
  { id: "DSP-4197", merchant: "FastFood DLA", customer: "+237 670 456 789", amount: 18_500, reason: "Non autorisé",       status: "resolved",  date: "25 mai 2026" },
  { id: "DSP-4196", merchant: "ShopEase",   customer: "+237 691 567 890", amount: 320_000, reason: "Non livré",          status: "escalated", date: "24 mai 2026" },
  { id: "DSP-4195", merchant: "PayGate CM", customer: "+237 678 678 901", amount: 92_000,  reason: "Double débit",        status: "open",      date: "23 mai 2026" },
];

type DisputeStatus = "all" | "open" | "under_review" | "escalated" | "resolved";

const STATUS_FILTERS: { key: DisputeStatus; fr: string; en: string }[] = [
  { key: "all",          fr: "Tous",        en: "All" },
  { key: "open",         fr: "Ouverts",     en: "Open" },
  { key: "under_review", fr: "En examen",   en: "Under review" },
  { key: "escalated",    fr: "Escaladés",  en: "Escalated" },
  { key: "resolved",     fr: "Résolus",    en: "Resolved" },
];

function disputeTone(s: string): "warn" | "info" | "fail" | "success" | "neutral" {
  if (s === "open") return "warn";
  if (s === "under_review") return "info";
  if (s === "escalated") return "fail";
  if (s === "resolved") return "success";
  return "neutral";
}

/* ── page ──────────────────────────────────────────────────── */

export default function DisputesPage() {
  const [filter, setFilter] = useState<DisputeStatus>("all");

  const filtered = filter === "all" ? DISPUTES : DISPUTES.filter((d) => d.status === filter);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Opérations" en="Operations" />, <T key="c2" fr="Litiges & remboursements" en="Disputes & Refunds" />]}
      title={<T fr="Litiges & remboursements" en="Disputes & Refunds" />}
      sub={<T fr="Gestion des réclamations et remboursements clients" en="Customer complaints and refunds management" />}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="Litiges ouverts" en="Open disputes" />} value="7" delta="+2 cette semaine" deltaDir="up" />
        <KpiCard label={<T fr="Taux de résolution" en="Resolution rate" />} value="92" unit="%" delta="+3%" deltaDir="up" />
        <KpiCard label={<T fr="Temps moy. résolution" en="Avg resolution time" />} value="2,1" unit="j" delta="-0.5j" deltaDir="down" />
        <KpiCard label={<T fr="Montant litigé" en="Total disputed" />} value="890K" unit="F" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setFilter(sf.key)}
            className={filter === sf.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            style={{ fontSize: 12 }}
          >
            <T fr={sf.fr} en={sf.en} />
          </button>
        ))}
      </div>

      {/* Disputes table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row head" style={{ gridTemplateColumns: "0.8fr 1fr 1fr 0.8fr 1fr 0.8fr 0.8fr" }}>
          <div>ID</div>
          <div><T fr="Marchand" en="Merchant" /></div>
          <div><T fr="Client" en="Customer" /></div>
          <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
          <div><T fr="Raison" en="Reason" /></div>
          <div><T fr="Statut" en="Status" /></div>
          <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
        </div>
        <div className="tbl">
          {filtered.map((d) => (
            <div key={d.id} className="row clickable" style={{ gridTemplateColumns: "0.8fr 1fr 1fr 0.8fr 1fr 0.8fr 0.8fr" }}>
              <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{d.id}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar name={d.merchant} size={22} />
                <span style={{ fontSize: 13 }}>{d.merchant}</span>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{d.customer}</div>
              <div style={{ textAlign: "right", fontWeight: 500 }}>{fmtXAF(d.amount)}</div>
              <div style={{ fontSize: 13 }}>{d.reason}</div>
              <div><Pill tone={disputeTone(d.status)}>{d.status.replace("_", " ")}</Pill></div>
              <div style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{d.date}</div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="check" size={28} color="var(--success)" />
            <p style={{ marginTop: 8 }}><T fr="Aucun litige trouvé" en="No disputes found" /></p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
