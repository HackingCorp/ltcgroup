"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";

export default function MerchantBillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [invoicesRes, currentRes] = await Promise.all([
          merchantDashboardService.getBillingInvoices({ page: 1 }),
          merchantDashboardService.getBillingCurrent(),
        ]);
        setInvoices(invoicesRes.items || []);
        setCurrent(currentRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Facturation Nkap" en="Nkap billing" />]} title={<T fr="Facturation Nkap" en="Nkap billing" />} sub={<T fr="Factures emises par LTC Group SARL pour les frais de service Nkap Pay" en="Invoices issued by LTC Group SARL for Nkap Pay service fees" />}><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  const currentFees = current?.amount ?? 0;
  const currentVolume = current?.volume_processed ?? 0;
  const currentRate = current?.fee_rate_applied ?? 0;
  const ratePercent = (currentRate * 100).toFixed(2);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Facturation Nkap" en="Nkap billing" />]}
      title={<T fr="Facturation Nkap" en="Nkap billing" />}
      sub={<T fr="Factures emises par LTC Group SARL pour les frais de service Nkap Pay" en="Invoices issued by LTC Group SARL for Nkap Pay service fees" />}
      actions={<button className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> <T fr="Tout telecharger" en="Download all" /></button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
        <KpiCard label={<T fr="Plan actuel" en="Current plan" />} value={current?.status === "current" ? "Growth" : "Starter"}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{ratePercent}% {"\u00b7"} <T fr="Renouvellement automatique le 1er" en="Auto-renew on the 1st" /></div>
        </KpiCard>
        <KpiCard label={<T fr="Frais ce mois" en="Fees this month" />} value={fmtXAF(currentFees)} unit="">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}><T fr={`Sur ${fmtXAF(currentVolume)} encaisses (${ratePercent}%)`} en={`On ${fmtXAF(currentVolume)} collected (${ratePercent}%)`} /></div>
        </KpiCard>
        <KpiCard label={<T fr="Periode" en="Period" />} value={current?.period_label || ""}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}><T fr="Periode en cours" en="Current period" /></div>
        </KpiCard>
      </div>

      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Factures" en="Invoices" /></h3>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
            <span>ID</span>
            <span><T fr="Periode" en="Period" /></span>
            <span style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {invoices.map(inv => (
            <div className="row" key={inv.id || inv.reference} style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{inv.reference || inv.id}</div>
              <div>{inv.period_label || ""}</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 16, textAlign: "right" }}>{fmtXAF(inv.amount)}</div>
              <div>
                <Pill tone={inv.status?.toLowerCase() === "paid" ? "success" : "warn"}>
                  {(inv.status || "").toLowerCase()}{inv.status?.toLowerCase() === "paid" && inv.paid_at ? ` \u00b7 ${inv.paid_at}` : ""}
                </Pill>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost btn-sm"><Icon name="eye" size={12} /></button>
                <button className="btn btn-ghost btn-sm"><Icon name="download" size={12} /> PDF</button>
              </div>
            </div>
          ))}
        </div>
        {invoices.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <T fr="Aucune facture." en="No invoices." />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
