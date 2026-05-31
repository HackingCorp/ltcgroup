"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

const REPORT_TYPES = [
  { icon: "receipt", titleFr: "Encaissements d\u00e9taill\u00e9s", titleEn: "Detailed collections", descFr: "Toutes les transactions, p\u00e9riode personnalis\u00e9e", descEn: "All transactions, custom date range" },
  { icon: "chart", titleFr: "R\u00e9conciliation comptable", titleEn: "Accounting reconciliation", descFr: "Format SAGE / SAARI / Excel", descEn: "SAGE / SAARI / Excel format" },
  { icon: "download", titleFr: "Re\u00e7us fiscaux clients", titleEn: "Tax receipts", descFr: "ZIP de tous les re\u00e7us \u00e9mis", descEn: "ZIP of all issued receipts" },
  { icon: "refresh", titleFr: "Rapport de remboursements", titleEn: "Refund report", descFr: "Tous les remboursements + motifs", descEn: "All refunds + reasons" },
  { icon: "bar", titleFr: "Performance par m\u00e9thode", titleEn: "Performance by method", descFr: "Taux de r\u00e9ussite, d\u00e9lai moyen par op\u00e9rateur", descEn: "Success rate, avg latency by carrier" },
  { icon: "users", titleFr: "Top clients", titleEn: "Top customers", descFr: "Classement par volume cumul\u00e9", descEn: "Ranked by cumulative volume" },
];

const RECENT_REPORTS = [
  { name: "Encaissements_2026-05.csv", period: "01-26 mai 2026", periodEn: "01-26 May 2026", size: "1,2 MB", time: "il y a 2 h", timeEn: "2h ago" },
  { name: "Reconciliation_avril.xlsx", period: "Avril 2026", periodEn: "April 2026", size: "847 KB", time: "il y a 4 jours", timeEn: "4 days ago" },
  { name: "Recus_Q1_2026.zip", period: "Jan-Mars 2026", periodEn: "Jan-Mar 2026", size: "12,4 MB", time: "il y a 1 semaine", timeEn: "1 week ago" },
  { name: "Top_clients_2026.csv", period: "Ann\u00e9e en cours", periodEn: "Year to date", size: "256 KB", time: "il y a 2 semaines", timeEn: "2 weeks ago" },
];

export default function MerchantReportsPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Rapports" en="Reports" />]}
      title={<T fr="Rapports & exports" en="Reports & exports" />}
      sub={<T fr="Exports CSV et rapports financiers personnalis\u00e9s" en="CSV exports and custom financial reports" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Nouveau rapport" en="New report" />
        </button>
      }
    >
      {/* Report type cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {REPORT_TYPES.map((r, i) => (
          <div key={i} className="card" style={{ cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-2)", display: "grid", placeItems: "center", marginBottom: 14 }}>
              <Icon name={r.icon} size={17} />
            </div>
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 6px" }}>
              <T fr={r.titleFr} en={r.titleEn} />
            </h4>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              <T fr={r.descFr} en={r.descEn} />
            </p>
            <button className="btn btn-link" style={{ marginTop: 14, padding: 0, background: "none", border: "none", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, textDecoration: "underline" }}>
              <T fr="G\u00e9n\u00e9rer" en="Generate" /> {"\u2192"}
            </button>
          </div>
        ))}
      </div>

      {/* Recent reports table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Rapports r\u00e9cents" en="Recent reports" />
          </h3>
          <button className="btn btn-link" style={{ fontSize: 13, padding: 0, background: "none", border: "none", color: "var(--ink)", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
            <T fr="Journal complet" en="Full log" />
          </button>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr" }}>
            <span><T fr="Nom" en="Name" /></span>
            <span><T fr="P\u00e9riode" en="Period" /></span>
            <span><T fr="Taille" en="Size" /></span>
            <span><T fr="G\u00e9n\u00e9r\u00e9" en="Generated" /></span>
            <span style={{ textAlign: "right" }}><T fr="Action" en="Action" /></span>
          </div>
          {RECENT_REPORTS.map((r, i) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{r.name}</div>
              <div style={{ fontSize: 12 }}>
                <T fr={r.period} en={r.periodEn} />
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{r.size}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                <T fr={r.time} en={r.timeEn} />
              </div>
              <div style={{ textAlign: "right" }}>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="download" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
