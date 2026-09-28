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
import { adminDashboardService, type PlatformOverview } from "@/services/admin-dashboard.service";
import { providersService, type TouchPayBalance } from "@/services/providers.service";
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

/* ── GMV by operator ─────────────────────────────────────────── */
// This used to take one revenue series and multiply it by fixed shares —
// 48% Orange, 31% MTN, 14% card, 7% Wave — under a "Realtime" badge. The
// proportions were invented. These are the amounts actually collected.

function OperatorBars({ rows }: { rows: { country: string; operator: string; provider: string; count: number; amount: number }[] }) {
  const max = Math.max(...rows.map(r => r.amount), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((r, i) => (
        <div key={`${r.country}-${r.operator}-${r.provider}-${i}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, minWidth: 0 }}>
              <span className="mono" style={{ color: "var(--muted-2)", fontSize: 10 }}>{r.country}</span>{" "}
              <span style={{ fontWeight: 500 }}>{r.operator}</span>{" "}
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{r.provider.toLowerCase()}</span>
            </span>
            <span className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {fmtCompact(r.amount)}{" "}
              <span style={{ color: "var(--muted)", fontSize: 10 }}>· {r.count}</span>
            </span>
          </div>
          <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(r.amount / max) * 100}%`, height: "100%", background: "var(--primary)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [healthServices, setHealthServices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [financeStats, setFinanceStats] = useState<any>(null);
  const [balances, setBalances] = useState<TouchPayBalance[] | null>(null);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats().catch(() => null),
      adminDashboardService.getHealth().catch(() => null),
      adminDashboardService.getAuditLogs({ page: 1, page_size: 5 }).catch(() => ({ items: [] })),
      adminDashboardService.getFinanceStats().catch(() => null),
      adminDashboardService.getPlatformOverview(30).catch(() => null),
    ])
      .then(([s, health, logs, finance, ov]) => {
        if (ov) setOverview(ov);
        if (s) setStats(s);
        if (health) {
          // Read the shape the endpoint actually returns. This used to look
          // for db_ok / redis_ok, which it has never sent, so both rendered
          // "down" on a platform that was collecting payments throughout.
          const dbStatus = health.db?.status ?? (health.db_ok ? "operational" : "down");
          const redisStatus = health.redis?.status ?? (health.redis_ok ? "operational" : "down");
          const tone = (st: string) =>
            st === "operational" ? "var(--success)" : st === "disabled" ? "var(--muted)" : "var(--rose)";
          const label = (st: string, ms?: number) =>
            st === "operational" ? `${ms ?? 0}ms` : st === "disabled" ? "desactive" : "down";
          const services = [
            { name: "API Gateway", v: health.status === "healthy" ? "99.99%" : "degraded", c: health.status === "healthy" ? "var(--success)" : "var(--warn)" },
            { name: "Database", v: label(dbStatus, health.db?.latency_ms), c: tone(dbStatus) },
            { name: "Redis", v: label(redisStatus, health.redis?.latency_ms), c: tone(redisStatus) },
          ];
          setHealthServices(services);
        }
        setAuditLogs(logs?.items || []);
        if (finance) setFinanceStats(finance);
      })
      .finally(() => setIsLoading(false));

    // Balances call every configured agency in turn, so it is slower than
    // the rest of the page — loaded on its own so it never delays it.
    providersService.getTouchPayBalances()
      .then((r) => setBalances(r.balances))
      .catch(() => setBalances([]));

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
  // Ranked on what they actually collected, not on a total_revenue field
  // the merchant list does not carry.
  const topMerchants = overview?.top_merchants ?? [];

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
          {overview && overview.gmv_by_operator.length > 0 ? (
            <OperatorBars rows={overview.gmv_by_operator} />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Donnees graphiques non disponibles" en="Chart data unavailable" />
            </div>
          )}
        </div>

        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 6px" }}><T fr="Pays" en="Countries" /></h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}><T fr="Repartition des marchands actifs" en="Active merchant split" /></p>
          {overview && overview.countries.length > 0 ? (
            overview.countries.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: 18 }}>{c.flag || "\u{1F30D}"}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {c.completed}/{c.attempts}
                </span>
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
          {topMerchants.length > 0 ? topMerchants.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)", width: 16 }}>{i + 1}.</span>
              <Avatar name={m.name} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                  {m.count} <T fr="encaisses" en="collected" />
                </div>
              </div>
              <div className="mono" style={{ fontSize: 11 }}>{fmtCompact(m.amount)} F</div>
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

        {/* TouchPay float per country */}
        <div className="nk-card">
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 4px" }}>
            <T fr="Soldes TouchPay" en="TouchPay float" />
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 14px" }}>
            <T fr="Solde de chaque agence, en direct" en="Live float of each agency" />
          </p>
          {balances === null ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Lecture des soldes..." en="Reading balances..." />
            </div>
          ) : balances.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Soldes non disponibles" en="Balances unavailable" />
            </div>
          ) : (
            balances.map((b, i) => (
              <div
                key={b.country_code}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  gap: 8, padding: "9px 0",
                  borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12,
                }}
              >
                <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                  <span className="mono" style={{ color: "var(--muted-2)", fontSize: 10 }}>{b.country_code}</span>
                  <span style={{ fontWeight: 500 }}>{b.country_name}</span>
                </span>
                {b.amount != null ? (
                  <span className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    {b.amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}{" "}
                    <span style={{ color: "var(--muted)", fontWeight: 400 }}>{b.currency}</span>
                  </span>
                ) : (
                  /* Never show 0 for an unreadable balance: an empty agency
                     and an unconfigured one call for opposite reactions. */
                  <span
                    style={{ color: b.configured ? "var(--rose)" : "var(--muted)", fontSize: 11, textAlign: "right" }}
                    title={b.error || undefined}
                  >
                    {!b.configured
                      ? <T fr="non configure" en="not configured" />
                      : b.refused
                        ? <><T fr="refuse" en="refused" />{b.status_code ? ` ${b.status_code}` : ""}</>
                        : <T fr="illisible" en="unreadable" />}
                  </span>
                )}
              </div>
            ))
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
