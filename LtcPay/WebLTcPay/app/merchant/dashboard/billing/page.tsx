"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";

const INVOICES = [
  { id: "NKAP-2026-05", period: "Mai 2026", amount: 78420, status: "current", paid: null },
  { id: "NKAP-2026-04", period: "Avril 2026", amount: 71250, status: "paid", paid: "01 mai 2026" },
  { id: "NKAP-2026-03", period: "Mars 2026", amount: 64800, status: "paid", paid: "01 avr 2026" },
  { id: "NKAP-2026-02", period: "Février 2026", amount: 58200, status: "paid", paid: "01 mars 2026" },
  { id: "NKAP-2026-01", period: "Janvier 2026", amount: 52100, status: "paid", paid: "01 fév 2026" },
];

export default function MerchantBillingPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Facturation Nkap" en="Nkap billing" />]}
      title={<T fr="Facturation Nkap" en="Nkap billing" />}
      sub={<T fr="Factures émises par LTC Group SARL pour les frais de service Nkap Pay" en="Invoices issued by LTC Group SARL for Nkap Pay service fees" />}
      actions={<button className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> <T fr="Tout télécharger" en="Download all" /></button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
        <KpiCard label={<T fr="Plan actuel" en="Current plan" />} value="Growth">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>1,5% {"·"} <T fr="Renouvellement automatique le 1er" en="Auto-renew on the 1st" /></div>
        </KpiCard>
        <KpiCard label={<T fr="Frais ce mois" en="Fees this month" />} value="78 420" unit="F">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}><T fr="Sur 5,2M F encaissés (1,51%)" en="On 5.2M F collected (1.51%)" /></div>
        </KpiCard>
        <KpiCard label={<T fr="Économisé vs Starter" en="Saved vs Starter" />} value="52 200" unit="F" delta="+8,4%">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}><T fr="Depuis le 1er janvier 2026" en="Since Jan 1, 2026" /></div>
        </KpiCard>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Factures" en="Invoices" /></h3>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
            <span>ID</span>
            <span><T fr="Période" en="Period" /></span>
            <span style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {INVOICES.map(inv => (
            <div className="row" key={inv.id} style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{inv.id}</div>
              <div>{inv.period}</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 16, textAlign: "right" }}>{fmtXAF(inv.amount)}</div>
              <div>
                <Pill tone={inv.status === "paid" ? "success" : "warn"}>
                  {inv.status === "paid" ? <><T fr="payée" en="paid" /> {"·"} {inv.paid}</> : <T fr="en cours" en="current" />}
                </Pill>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost btn-sm"><Icon name="eye" size={12} /></button>
                <button className="btn btn-ghost btn-sm"><Icon name="download" size={12} /> PDF</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
