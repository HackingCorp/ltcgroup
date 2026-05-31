"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Sparkline } from "@/components/ui/sparkline";
import { Avatar } from "@/components/ui/avatar";
import { T } from "@/lib/i18n";
import { fmtCompact } from "@/lib/format";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardStats } from "@/types";

/* ── mock data for design elements ─────────────────────────── */

const A_REVENUE = [380, 412, 458, 502, 547, 612, 680, 725, 802, 884, 921, 1024, 1118, 1247, 1382, 1450, 1521, 1684, 1820, 1924, 2118, 2287, 2421, 2620, 2812, 3045, 3284, 3520, 3812, 4140];

const ADMIN_MERCHANTS = [
  { id: "MER-001", name: "Boutique Mami SARL", country: "CM", volume30: 5240000, txCount: 1247, status: "live", plan: "Growth", fee: "1,5%" },
  { id: "MER-002", name: "Restaurant Le Baobab", country: "CM", volume30: 2180000, txCount: 432, status: "live", plan: "Starter", fee: "2,5%" },
  { id: "MER-003", name: "KILIMO SARL", country: "CI", volume30: 18500000, txCount: 3287, status: "live", plan: "Growth", fee: "1,5%" },
  { id: "MER-006", name: "Beaute Africaine SAS", country: "CI", volume30: 8420000, txCount: 1820, status: "live", plan: "Growth", fee: "1,5%" },
  { id: "MER-009", name: "Agro Export Cameroun", country: "CM", volume30: 124500000, txCount: 412, status: "live", plan: "Scale", fee: "0,9%" },
  { id: "MER-010", name: "Wave Senegal Reseller", country: "SN", volume30: 6240000, txCount: 2148, status: "live", plan: "Growth", fee: "1,2%" },
];

const COUNTRIES = [
  { flag: "\u{1F1E8}\u{1F1F2}", name: "Cameroun", count: 1482, pct: 60 },
  { flag: "\u{1F1E8}\u{1F1EE}", name: "Cote d'Ivoire", count: 624, pct: 25 },
  { flag: "\u{1F1F8}\u{1F1F3}", name: "Senegal", count: 248, pct: 10 },
  { flag: "\u{1F1E7}\u{1F1EB}", name: "Burkina Faso", count: 87, pct: 4 },
  { flag: "\u{1F1F2}\u{1F1F1}", name: "Mali", count: 41, pct: 1 },
];

const SYSTEM_HEALTH = [
  { name: "API Gateway", v: "99.99%", c: "var(--success)" },
  { name: "TouchPay", v: "99.94%", c: "var(--success)" },
  { name: "Webhook delivery", v: "99.42%", c: "var(--warn)" },
  { name: "DB primary", v: "12ms p99", c: "var(--success)" },
  { name: "Redis cache", v: "1.2ms p99", c: "var(--success)" },
];

const ADMIN_ACTIVITY = [
  { who: "Sarah M.", whatFr: "a approuve KYC MER-247", whatEn: "approved KYC MER-247", time: "il y a 12 min" },
  { who: "Jean K.", whatFr: "a ajuste les fees de MER-009", whatEn: "adjusted MER-009 fees", time: "il y a 1 h" },
  { who: "System", whatFr: "a suspendu MER-008 pour fraude", whatEn: "suspended MER-008 for fraud", time: "il y a 2 h" },
  { who: "Nadege T.", whatFr: "a rembourse 4 transactions", whatEn: "refunded 4 transactions", time: "il y a 3 h" },
  { who: "Sarah M.", whatFr: "a invite un nouvel admin", whatEn: "invited a new admin", time: "il y a 5 h" },
];

/* ── platform chart ────────────────────────────────────────── */

function PlatformChart() {
  const w = 700, h = 220, pad = 24;
  const series = [
    { name: "Orange Money", c: "var(--orange-money)", data: A_REVENUE.map(v => v * 0.48) },
    { name: "MTN MoMo", c: "var(--mtn)", data: A_REVENUE.map(v => v * 0.31) },
    { name: "Card", c: "var(--ink)", data: A_REVENUE.map(v => v * 0.14) },
    { name: "Wave", c: "var(--wave)", data: A_REVENUE.map(v => v * 0.07) },
  ];
  const totals = A_REVENUE.map(v => v);
  const max = Math.max(...totals) * 1.1;
  const step = (w - pad * 2) / (totals.length - 1);

  const stacks = totals.map((_, i) => {
    let cum = 0;
    return series.map(s => {
      const v = s.data[i];
      const r = { y0: cum, y1: cum + v };
      cum += v;
      return r;
    });
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + i * ((h - pad * 2) / 3)} y2={pad + i * ((h - pad * 2) / 3)} stroke="var(--line)" strokeDasharray="2,4" />
      ))}
      {series.map((s, si) => {
        const pathParts = stacks.map((stack, i) => {
          const x = pad + i * step;
          const y = h - pad - (stack[si].y1 / max) * (h - pad * 2);
          return (i === 0 ? "M" : "L") + x + "," + y;
        });
        const bot = stacks.map((stack, i) => {
          const x = pad + (totals.length - 1 - i) * step;
          const y = h - pad - (stacks[totals.length - 1 - i][si].y0 / max) * (h - pad * 2);
          return "L" + x + "," + y;
        });
        return <path key={si} d={pathParts.join(" ") + " " + bot.join(" ") + " Z"} fill={s.c} opacity={0.85} />;
      })}
      <g style={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--muted)" }}>
        <text x={pad} y={h - 6}>26 avr</text>
        <text x={w / 2 - 16} y={h - 6}>10 mai</text>
        <text x={w - pad - 30} y={h - 6}>26 mai</text>
      </g>
    </svg>
  );
}

/* ── page ──────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 256 }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  const topMerchants = [...ADMIN_MERCHANTS].sort((a, b) => b.volume30 - a.volume30).slice(0, 5);

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Plateforme" en="Platform" />,
        <T key="c2" fr="Vue d'ensemble" en="Overview" />,
      ]}
      title={<T fr="Plateforme Nkap Pay" en="Nkap Pay platform" />}
      sub={<T fr="Metriques globales · production · CEMAC + UEMOA" en="Global metrics · production · CEMAC + WAEMU" />}
      actions={<>
        <div className="kbd-pill">24h · 7j · 30j · 90j</div>
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} /> <T fr="Export exec" en="Exec export" />
        </button>
      </>}
    >
      {/* KPI row */}
      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginBottom: 12 }}
      >
        <KpiCard hero label={<T fr="Revenu total" en="Total revenue" />} value={stats ? fmtCompact(stats.total_revenue) : "—"} unit="F">
          <div style={{ marginTop: 12 }}>
            <Sparkline data={A_REVENUE} width={240} height={36} color="var(--accent)" />
          </div>
        </KpiCard>
        <KpiCard label={<T fr="Total paiements" en="Total payments" />} value={stats ? String(stats.total_payments) : "—"}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}><T fr="Tous les paiements" en="All payments" /></div>
        </KpiCard>
        <KpiCard label={<T fr="Transactions traitees" en="Processed transactions" />} value={stats ? String(stats.total_transactions) : "—"}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}><T fr="Reussies + echouees + remboursees" en="Completed + failed + refunded" /></div>
        </KpiCard>
        <KpiCard label={<T fr="Taux de succes" en="Success rate" />} value={stats ? String(stats.success_rate) : "—"} unit="%">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}><T fr="Paiements reussis" en="Successful payments" /></div>
        </KpiCard>
      </div>

      {/* Charts row: GMV by method + Countries */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
        <div className="nk-card">
          <div className="card-head">
            <div>
              <h3><T fr="GMV par methode (30 jours)" en="GMV by method (30 days)" /></h3>
              <p className="sub" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}><T fr="Volume brut traite par operateur" en="Gross volume by carrier" /></p>
            </div>
            <Pill tone="live">Realtime</Pill>
          </div>
          <PlatformChart />
        </div>

        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 6px" }}><T fr="Pays" en="Countries" /></h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}><T fr="Repartition des marchands actifs" en="Active merchant split" /></p>
          {COUNTRIES.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: 18 }}>{c.flag}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.count}</span>
              <div style={{ width: 60, height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${c.pct}%`, height: "100%", background: "var(--primary)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: Top 5 merchants, System health, Admin activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* Top 5 merchants */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Top 5 marchands" en="Top 5 merchants" /></h3>
          {topMerchants.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", width: 16 }}>{i + 1}.</span>
              <Avatar name={m.name} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{m.country} · {m.plan}</div>
              </div>
              <div className="mono" style={{ fontSize: 11 }}>{fmtCompact(m.volume30)} F</div>
            </div>
          ))}
        </div>

        {/* System health */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Sante systeme" en="System health" /></h3>
          {SYSTEM_HEALTH.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.c }} />
                {s.name}
              </span>
              <span className="mono" style={{ color: "var(--muted)" }}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Admin activity */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Activite admin" en="Admin activity" /></h3>
          {ADMIN_ACTIVITY.map((a, i) => (
            <div key={i} style={{ padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
              <span style={{ fontWeight: 500 }}>{a.who}</span>{" "}
              <span style={{ color: "var(--muted)" }}><T fr={a.whatFr} en={a.whatEn} /></span>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 2 }}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
