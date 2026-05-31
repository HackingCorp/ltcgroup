"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Sparkline } from "@/components/ui/sparkline";
import { T } from "@/lib/i18n";
import { fmtCompact } from "@/lib/format";
import { adminDashboardService } from "@/services/admin-dashboard.service";

/* ── page ──────────────────────────────────────────────────── */

export default function FinancePage() {
  const [stats, setStats] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [revenueSplit, setRevenueSplit] = useState<any[]>([]);
  const [operatingAccounts, setOperatingAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, settlementsRes, splitRes] = await Promise.all([
          adminDashboardService.getFinanceStats(),
          adminDashboardService.getSettlements({ page: 1, page_size: 5 }),
          adminDashboardService.getRevenueSplit(),
        ]);
        setStats(statsRes);
        setSettlements(settlementsRes.items || []);
        setRevenueSplit(splitRes.items || []);
        setOperatingAccounts(splitRes.operating_accounts || []);
      } catch (err) {
        console.error("Failed to load finance data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <span key="c2">Finance</span>]}
        title={<T fr="Finance LTC" en="LTC finance" />}
        sub=""
      >
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
      </PageWrapper>
    );
  }

  const netRevenue = stats?.net_revenue_30d ?? 0;
  const gmv = stats?.gmv_30d ?? 0;
  const takeRate = stats?.take_rate_avg ?? 0;
  const grossMargin = stats?.gross_margin_pct ?? 0;
  const sparkline = stats?.revenue_sparkline || [];

  // Format large numbers for display
  const netRevenueDisplay = netRevenue >= 1000000 ? (netRevenue / 1000000).toFixed(1).replace(".", ",") : String(Math.round(netRevenue));
  const netRevenueUnit = netRevenue >= 1000000 ? "M F" : "F";
  const gmvDisplay = gmv >= 1000000000 ? (gmv / 1000000000).toFixed(2).replace(".", ",") + " Md" : gmv >= 1000000 ? (gmv / 1000000).toFixed(1).replace(".", ",") + "M" : String(Math.round(gmv));
  const grossMarginAbs = grossMargin > 0 && netRevenue > 0 ? (grossMargin / 100) * netRevenue : 0;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <span key="c2">Finance</span>]}
      title={<T fr="Finance LTC" en="LTC finance" />}
      sub={<T fr="Revenus de la plateforme, settlements bancaires, comptabilite" en="Platform revenue, bank settlements, accounting" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} /> <T fr="Rapport mensuel" en="Monthly report" />
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", marginBottom: 12 }}>
        <KpiCard hero label={<T fr="Revenu net 30 jours" en="Net revenue 30 days" />} value={netRevenueDisplay} unit={netRevenueUnit}>
          {sparkline.length > 0 && (
            <div style={{ marginTop: 12 }}><Sparkline data={sparkline} width={240} height={36} color="var(--accent)" /></div>
          )}
        </KpiCard>
        <KpiCard label={<T fr="GMV / Revenu" en="GMV / Revenue" />} value={gmv > 0 && netRevenue > 0 ? Math.round(gmv / netRevenue) + "x" : "---"}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{gmvDisplay} / {netRevenueDisplay}{netRevenueUnit}</div>
        </KpiCard>
        <KpiCard label={<T fr="Take rate moyen" en="Avg take rate" />} value={takeRate.toFixed(2).replace(".", ",")} unit="%" />
        <KpiCard label={<T fr="Marge brute" en="Gross margin" />} value={Math.round(grossMargin).toString()} unit="%">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            {grossMarginAbs > 0 ? fmtCompact(grossMarginAbs) + " F / " + netRevenueDisplay + netRevenueUnit : "---"}
          </div>
        </KpiCard>
      </div>

      {/* Settlements table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Settlements bancaires" en="Bank settlements" /></h3>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}><T fr="Virements de TouchPay vers les comptes de reglement marchands" en="TouchPay -> merchant payout accounts" /></p>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.8fr" }}>
            <span>ID</span>
            <span><T fr="Date" en="Date" /></span>
            <span style={{ textAlign: "right" }}><T fr="Volume brut" en="Gross volume" /></span>
            <span style={{ textAlign: "right" }}><T fr="Frais LTC" en="LTC fees" /></span>
            <span style={{ textAlign: "right" }}><T fr="Verse marchands" en="Paid to merchants" /></span>
            <span><T fr="Statut" en="Status" /></span>
          </div>
          {settlements.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun settlement" en="No settlements" />
            </div>
          )}
          {settlements.map((s: any) => (
            <div className="row" key={s.id} style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.8fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{s.id}</div>
              <div className="mono" style={{ fontSize: 11 }}>{s.date ? new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "---"}</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 15, textAlign: "right" }}>{fmtCompact(s.gross)} F</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 15, textAlign: "right", color: "var(--success)" }}>{fmtCompact(s.fees)} F</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 15, textAlign: "right" }}>{fmtCompact(s.net)} F</div>
              <Pill tone={s.status?.toLowerCase() === "completed" ? "success" : "info"}>{s.status}</Pill>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom two-column: Revenue/cost split + Operating accounts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Revenue / cost split */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Repartition revenus / couts" en="Revenue / cost split" /></h3>
          {revenueSplit.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Aucune donnee" en="No data" />
            </div>
          )}
          {revenueSplit.map((r: any, i: number) => (
            <div key={i} style={{ padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}><T fr={r.name_fr} en={r.name_en} /></span>
                <span className="display" style={{ fontWeight: 500, fontSize: 14, color: r.value < 0 ? "var(--rose)" : (r.name_en || "").includes("EBITDA") ? "var(--success)" : "var(--ink)" }}>
                  {r.value < 0 ? "---" : ""}{fmtCompact(Math.abs(r.value))} F
                </span>
              </div>
              <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2 }}>
                <div style={{ width: `${r.pct || 0}%`, height: "100%", background: r.color || "var(--primary)", borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Operating accounts */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Comptes operationnels" en="Operating accounts" /></h3>
          {operatingAccounts.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Aucune donnee" en="No data" />
            </div>
          )}
          {operatingAccounts.map((a: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <Icon name={a.status === "float" ? "clock" : "bank"} size={16} color={a.status === "main" ? "var(--primary)" : "var(--muted)"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                <Pill tone={a.status === "main" ? "info" : a.status === "float" ? "warn" : "neutral"} plain>{a.status}</Pill>
              </div>
              <div className="display" style={{ fontWeight: 500, fontSize: 16 }}>{fmtCompact(a.balance)} {a.currency === "XAF" ? "F" : a.currency}</div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
