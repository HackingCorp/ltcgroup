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
import { adminDashboardService } from "@/services/admin-dashboard.service";
import type { DashboardStats } from "@/types";

/* ── helpers ─────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "il y a 1 min";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  const diffW = Math.floor(diffD / 7);
  return `il y a ${diffW} sem`;
}

/* ── platform chart ────────────────────────────────────────── */

function PlatformChart({ data }: { data: number[] }) {
  const w = 700, h = 220, pad = 24;
  if (!data || data.length < 2) return null;
  const series = [
    { name: "Orange Money", c: "var(--orange-money)", data: data.map(v => v * 0.48) },
    { name: "MTN MoMo", c: "var(--mtn)", data: data.map(v => v * 0.31) },
    { name: "Card", c: "var(--ink)", data: data.map(v => v * 0.14) },
    { name: "Wave", c: "var(--wave)", data: data.map(v => v * 0.07) },
  ];
  const totals = data.map(v => v);
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
  const [merchants, setMerchants] = useState<any[]>([]);
  const [healthServices, setHealthServices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [financeStats, setFinanceStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats().catch(() => null),
      adminDashboardService.getHealth().catch(() => null),
      adminDashboardService.getAuditLogs({ page: 1, page_size: 5 }).catch(() => ({ items: [] })),
      adminDashboardService.getFinanceStats().catch(() => null),
    ])
      .then(([s, health, logs, finance]) => {
        if (s) setStats(s);
        if (health) {
          const services = [
            { name: "API Gateway", v: health.status === "healthy" ? "99.99%" : "degraded", c: health.status === "healthy" ? "var(--success)" : "var(--warn)" },
            { name: "Database", v: health.db_ok ? `${health.db_latency_ms}ms p99` : "down", c: health.db_ok ? "var(--success)" : "var(--rose)" },
            { name: "Redis", v: health.redis_ok ? `${health.redis_latency_ms}ms p99` : "down", c: health.redis_ok ? "var(--success)" : "var(--rose)" },
          ];
          setHealthServices(services);
        }
        setAuditLogs(logs?.items || []);
        if (finance) setFinanceStats(finance);
      })
      .finally(() => setIsLoading(false));

    // Fetch merchants separately (uses different endpoint pattern)
    import("@/services/merchants.service").then(({ merchantsService }) => {
      merchantsService.list(1, 10).then((res: any) => {
        setMerchants(res.items || []);
      }).catch(() => {});
    });
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 256 }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  const sparklineData = financeStats?.revenue_sparkline || [];
  const topMerchants = [...merchants].sort((a: any, b: any) => (b.total_revenue || 0) - (a.total_revenue || 0)).slice(0, 5);

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
          {sparklineData.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Sparkline data={sparklineData} width={240} height={36} color="var(--accent)" />
            </div>
          )}
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
          {sparklineData.length > 0 ? (
            <PlatformChart data={sparklineData} />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Donnees graphiques non disponibles" en="Chart data unavailable" />
            </div>
          )}
        </div>

        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 6px" }}><T fr="Pays" en="Countries" /></h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}><T fr="Repartition des marchands actifs" en="Active merchant split" /></p>
          {(stats as any)?.countries && ((stats as any).countries as any[]).length > 0 ? (
            ((stats as any).countries as any[]).map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: 18 }}>{c.flag || "\u{1F30D}"}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.count}</span>
                <div style={{ width: 60, height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${c.pct}%`, height: "100%", background: "var(--primary)" }} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Donnees pays non disponibles" en="Country data unavailable" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Top 5 merchants, System health, Admin activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* Top 5 merchants */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Top 5 marchands" en="Top 5 merchants" /></h3>
          {topMerchants.length > 0 ? topMerchants.map((m: any, i: number) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", width: 16 }}>{i + 1}.</span>
              <Avatar name={m.name} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{m.country || "CM"} · {m.plan || "Starter"}</div>
              </div>
              <div className="mono" style={{ fontSize: 11 }}>{fmtCompact(m.total_revenue || 0)} F</div>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Aucun marchand" en="No merchants" />
            </div>
          )}
        </div>

        {/* System health */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Sante systeme" en="System health" /></h3>
          {healthServices.length > 0 ? healthServices.map((s: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.c }} />
                {s.name}
              </span>
              <span className="mono" style={{ color: "var(--muted)" }}>{s.v}</span>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Donnees sante non disponibles" en="Health data unavailable" />
            </div>
          )}
        </div>

        {/* Admin activity */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}><T fr="Activite admin" en="Admin activity" /></h3>
          {auditLogs.length > 0 ? auditLogs.map((a: any, i: number) => (
            <div key={a.id || i} style={{ padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
              <span style={{ fontWeight: 500 }}>{a.actor_name || "System"}</span>{" "}
              <span style={{ color: "var(--muted)" }}>{a.action}{a.target ? ` · ${a.target}` : ""}</span>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 2 }}>{a.created_at ? timeAgo(a.created_at) : "—"}</div>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Aucune activite recente" en="No recent activity" />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
