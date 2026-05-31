"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Sparkline } from "@/components/ui/sparkline";
import { T } from "@/lib/i18n";
import { fmtCompact } from "@/lib/format";

/* ── mock data ─────────────────────────────────────────────── */

const A_REVENUE = [380, 412, 458, 502, 547, 612, 680, 725, 802, 884, 921, 1024, 1118, 1247, 1382, 1450, 1521, 1684, 1820, 1924, 2118, 2287, 2421, 2620, 2812, 3045, 3284, 3520, 3812, 4140];

const SETTLEMENTS = [
  { id: "SETT-26-MAI", date: "26 mai 2026", gross: 92420000, fees: 1556400, net: 90863600, status: "scheduled" },
  { id: "SETT-25-MAI", date: "25 mai 2026", gross: 86150000, fees: 1438200, net: 84711800, status: "completed" },
  { id: "SETT-24-MAI", date: "24 mai 2026", gross: 79200000, fees: 1322600, net: 77877400, status: "completed" },
  { id: "SETT-23-MAI", date: "23 mai 2026", gross: 72400000, fees: 1208400, net: 71191600, status: "completed" },
  { id: "SETT-22-MAI", date: "22 mai 2026", gross: 68900000, fees: 1150200, net: 67749800, status: "completed" },
];

const REVENUE_COST_SPLIT = [
  { nameFr: "Frais marchands", nameEn: "Merchant fees", v: 47400000, pct: 100, c: "var(--primary)" },
  { nameFr: "TouchPay (interchange)", nameEn: "TouchPay (interchange)", v: -12800000, pct: 27, c: "var(--rose)" },
  { nameFr: "Cout infrastructure", nameEn: "Infrastructure", v: -3200000, pct: 7, c: "var(--warn)" },
  { nameFr: "Support & operations", nameEn: "Support & ops", v: -2100000, pct: 4, c: "var(--warn)" },
  { nameFr: "EBITDA", nameEn: "EBITDA", v: 29300000, pct: 62, c: "var(--success)" },
];

const OPERATING_ACCOUNTS = [
  { name: "Afriland First Bank \u00B7 LTC Group", bal: 142800000, status: "main", cur: "XAF" },
  { name: "Societe Generale CI \u00B7 LTC Group", bal: 84200000, status: "secondary", cur: "XOF" },
  { name: "BNP Paribas \u00B7 LTC Europe", bal: 412000, status: "secondary", cur: "EUR" },
  { name: "Float TouchPay (en attente settle)", bal: 92420000, status: "float", cur: "XAF" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function FinancePage() {
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
        <KpiCard hero label={<T fr="Revenu net 30 jours" en="Net revenue 30 days" />} value="47,4" unit="M F" delta="+24,8%">
          <div style={{ marginTop: 12 }}><Sparkline data={A_REVENUE.map(v => v * 0.017)} width={240} height={36} color="var(--accent)" /></div>
        </KpiCard>
        <KpiCard label={<T fr="GMV / Revenu" en="GMV / Revenue" />} value="60\u00D7">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>2,84 Md / 47,4M</div>
        </KpiCard>
        <KpiCard label={<T fr="Take rate moyen" en="Avg take rate" />} value="1,67" unit="%" delta={"\u22120,03 pt"} deltaDir="down" />
        <KpiCard label={<T fr="Marge brute" en="Gross margin" />} value="62" unit="%">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>29,4M F / 47,4M F</div>
        </KpiCard>
      </div>

      {/* Settlements table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Settlements bancaires" en="Bank settlements" /></h3>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}><T fr="Virements de TouchPay vers les comptes de reglement marchands" en="TouchPay \u2192 merchant payout accounts" /></p>
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
          {SETTLEMENTS.map(s => (
            <div className="row" key={s.id} style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.8fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{s.id}</div>
              <div className="mono" style={{ fontSize: 11 }}>{s.date}</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 15, textAlign: "right" }}>{fmtCompact(s.gross)} F</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 15, textAlign: "right", color: "var(--success)" }}>{fmtCompact(s.fees)} F</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 15, textAlign: "right" }}>{fmtCompact(s.net)} F</div>
              <Pill tone={s.status === "completed" ? "success" : "info"}>{s.status}</Pill>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom two-column: Revenue/cost split + Operating accounts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Revenue / cost split */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Repartition revenus / couts" en="Revenue / cost split" /></h3>
          {REVENUE_COST_SPLIT.map((r, i) => (
            <div key={i} style={{ padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}><T fr={r.nameFr} en={r.nameEn} /></span>
                <span className="display" style={{ fontWeight: 500, fontSize: 14, color: r.v < 0 ? "var(--rose)" : r.nameEn === "EBITDA" ? "var(--success)" : "var(--ink)" }}>
                  {r.v < 0 ? "\u2212" : ""}{fmtCompact(Math.abs(r.v))} F
                </span>
              </div>
              <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2 }}>
                <div style={{ width: `${r.pct}%`, height: "100%", background: r.c, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Operating accounts */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Comptes operationnels" en="Operating accounts" /></h3>
          {OPERATING_ACCOUNTS.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <Icon name={a.status === "float" ? "clock" : "bank"} size={16} color={a.status === "main" ? "var(--primary)" : "var(--muted)"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                <Pill tone={a.status === "main" ? "info" : a.status === "float" ? "warn" : "neutral"} plain>{a.status}</Pill>
              </div>
              <div className="display" style={{ fontWeight: 500, fontSize: 16 }}>{fmtCompact(a.bal)} {a.cur === "XAF" ? "F" : a.cur}</div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
