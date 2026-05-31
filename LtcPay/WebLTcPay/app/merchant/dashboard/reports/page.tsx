"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

const REPORT_TYPES = [
  {
    icon: "receipt",
    titleFr: "Encaissements détaillés",
    titleEn: "Detailed collections",
    descFr: "Toutes les transactions avec détails client, méthode et frais",
    descEn: "All transactions with customer details, method and fees",
    formatFr: "CSV, Excel, PDF",
    formatEn: "CSV, Excel, PDF",
  },
  {
    icon: "bank",
    titleFr: "Rapprochement comptable",
    titleEn: "Accounting reconciliation",
    descFr: "Soldes, règlements et écarts par période",
    descEn: "Balances, payouts and discrepancies by period",
    formatFr: "Excel, PDF",
    formatEn: "Excel, PDF",
  },
  {
    icon: "briefcase",
    titleFr: "Reçus fiscaux",
    titleEn: "Tax receipts",
    descFr: "Documents fiscaux pour la déclaration TVA/IS",
    descEn: "Tax documents for VAT/CIT declaration",
    formatFr: "PDF",
    formatEn: "PDF",
  },
  {
    icon: "refresh",
    titleFr: "Rapport de remboursements",
    titleEn: "Refund report",
    descFr: "Historique complet des remboursements et motifs",
    descEn: "Complete refund history and reasons",
    formatFr: "CSV, PDF",
    formatEn: "CSV, PDF",
  },
  {
    icon: "chart",
    titleFr: "Performance par méthode",
    titleEn: "Performance by method",
    descFr: "Taux de succès, montants moyens par canal de paiement",
    descEn: "Success rates, average amounts by payment channel",
    formatFr: "PDF",
    formatEn: "PDF",
  },
  {
    icon: "users",
    titleFr: "Top clients",
    titleEn: "Top customers",
    descFr: "Classement des clients par volume et fréquence",
    descEn: "Customer ranking by volume and frequency",
    formatFr: "CSV, Excel",
    formatEn: "CSV, Excel",
  },
];

const RECENT_REPORTS = [
  { name: "encaissements_mai_2026.csv", type: "Encaissements détaillés", typeEn: "Detailed collections", date: "29 mai 2026", size: "1,2 Mo", status: "ready" as const },
  { name: "rapprochement_avril_2026.xlsx", type: "Rapprochement comptable", typeEn: "Accounting reconciliation", date: "01 mai 2026", size: "845 Ko", status: "ready" as const },
  { name: "fiscal_q1_2026.pdf", type: "Reçus fiscaux", typeEn: "Tax receipts", date: "05 avr 2026", size: "320 Ko", status: "ready" as const },
  { name: "performance_mars_2026.pdf", type: "Performance par méthode", typeEn: "Performance by method", date: "01 avr 2026", size: "520 Ko", status: "ready" as const },
  { name: "encaissements_juin_2026.csv", type: "Encaissements détaillés", typeEn: "Detailed collections", date: "En cours...", size: "—", status: "generating" as const },
];

export default function MerchantReportsPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Rapports" en="Reports" />]}
      title={<T fr="Rapports" en="Reports" />}
      sub={<T fr="Générez et téléchargez des rapports détaillés pour votre activité" en="Generate and download detailed reports for your activity" />}
    >
      {/* Report types grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {REPORT_TYPES.map(rt => (
          <div key={rt.icon + rt.titleFr} className="card" style={{ padding: 20, cursor: "pointer", transition: "box-shadow 0.15s" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--bg-2)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}>
                <Icon name={rt.icon} size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  <T fr={rt.titleFr} en={rt.titleEn} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
                  <T fr={rt.descFr} en={rt.descEn} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                <T fr={rt.formatFr} en={rt.formatEn} />
              </div>
              <button className="btn btn-primary btn-sm">
                <T fr="Générer" en="Generate" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent reports table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Rapports récents" en="Recent reports" />
          </h3>
          <button className="btn btn-ghost btn-sm">
            <Icon name="refresh" size={13} /> <T fr="Actualiser" en="Refresh" />
          </button>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "2fr 1.5fr 1fr 80px 1fr 80px" }}>
            <span><T fr="Fichier" en="File" /></span>
            <span><T fr="Type" en="Type" /></span>
            <span><T fr="Date" en="Date" /></span>
            <span><T fr="Taille" en="Size" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {RECENT_REPORTS.map(r => (
            <div className="row" key={r.name} style={{ gridTemplateColumns: "2fr 1.5fr 1fr 80px 1fr 80px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="receipt" size={14} color="var(--muted)" />
                <span className="mono" style={{ fontSize: 12 }}>{r.name}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                <T fr={r.type} en={r.typeEn} />
              </div>
              <div style={{ fontSize: 12 }}>{r.date}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.size}</div>
              <div>
                <Pill tone={r.status === "ready" ? "success" : "info"}>
                  {r.status === "ready" ? <T fr="prêt" en="ready" /> : <T fr="en cours" en="generating" />}
                </Pill>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {r.status === "ready" ? (
                  <button className="btn btn-ghost btn-sm"><Icon name="download" size={12} /></button>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled><Icon name="clock" size={12} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
