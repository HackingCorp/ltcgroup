"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";

export default function MerchantReportsPage() {
  const [reportTypes, setReportTypes] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [typesRes, reportsRes] = await Promise.all([
          merchantDashboardService.getReportTypes(),
          merchantDashboardService.getReports({ page: 1, page_size: 10 }),
        ]);
        setReportTypes(typesRes.types || []);
        setRecentReports(reportsRes.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Rapports" en="Reports" />]} title={<T fr="Rapports & exports" en="Reports & exports" />} sub={<T fr="Exports CSV et rapports financiers personnalises" en="CSV exports and custom financial reports" />}><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Rapports" en="Reports" />]}
      title={<T fr="Rapports & exports" en="Reports & exports" />}
      sub={<T fr="Exports CSV et rapports financiers personnalises" en="CSV exports and custom financial reports" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Nouveau rapport" en="New report" />
        </button>
      }
    >
      {/* Report type cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {reportTypes.map((r, i) => (
          <div key={r.key || i} className="card" style={{ cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-2)", display: "grid", placeItems: "center", marginBottom: 14 }}>
              <Icon name={r.icon || "receipt"} size={17} />
            </div>
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 6px" }}>
              <T fr={r.label_fr} en={r.label_en} />
            </h4>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              <T fr={r.desc_fr} en={r.desc_en} />
            </p>
            <button className="btn btn-link" style={{ marginTop: 14, padding: 0, background: "none", border: "none", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, textDecoration: "underline" }}>
              <T fr="Generer" en="Generate" /> {"->"}
            </button>
          </div>
        ))}
      </div>

      {/* Recent reports table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Rapports recents" en="Recent reports" />
          </h3>
          <button className="btn btn-link" style={{ fontSize: 13, padding: 0, background: "none", border: "none", color: "var(--ink)", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
            <T fr="Journal complet" en="Full log" />
          </button>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr" }}>
            <span><T fr="Nom" en="Name" /></span>
            <span><T fr="Periode" en="Period" /></span>
            <span><T fr="Taille" en="Size" /></span>
            <span><T fr="Genere" en="Generated" /></span>
            <span style={{ textAlign: "right" }}><T fr="Action" en="Action" /></span>
          </div>
          {recentReports.map((r, i) => (
            <div key={r.id || i} className="row" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{r.name}</div>
              <div style={{ fontSize: 12 }}>{r.period_label || ""}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{r.file_size || ""}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{r.created_at || ""}</div>
              <div style={{ textAlign: "right" }}>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="download" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {recentReports.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <T fr="Aucun rapport genere." en="No reports generated." />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
