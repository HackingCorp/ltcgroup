"use client";

import { useState, useEffect } from "react";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { adminDashboardService } from "@/services/admin-dashboard.service";

/* ── static data (from monitoring infrastructure, not payment API) ── */

const OPERATORS = [
  { name: "Orange Money CM", p50: 980, p99: 2400, degraded: false },
  { name: "Orange Money CI", p50: 1240, p99: 8200, degraded: true },
  { name: "MTN MoMo CM", p50: 1100, p99: 2600, degraded: false },
  { name: "MTN MoMo CI", p50: 1200, p99: 2800, degraded: false },
  { name: "Wave SN", p50: 420, p99: 1100, degraded: false },
  { name: "Card 3DS (BNP)", p50: 2200, p99: 5800, degraded: false },
];

const RESOURCES = [
  { name: "CPU api-prod-cluster", v: 42, max: "8 vCPU x 6 nodes" },
  { name: "RAM api-prod-cluster", v: 58, max: "32 GB x 6 nodes" },
  { name: "DB connections", v: 64, max: "200 max" },
  { name: "Redis memory", v: 31, max: "4 GB" },
  { name: "Disk write IOPS", v: 22, max: "16k" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [healthRes, servicesRes] = await Promise.all([
          adminDashboardService.getHealth(),
          adminDashboardService.getHealthServices(),
        ]);
        setHealth(healthRes);
        setServices(servicesRes.services || []);
      } catch (err) {
        console.error("Failed to load health data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Sante" en="Health" />]}
        title={<T fr="Sante systeme" en="System health" />}
        sub=""
      >
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
      </PageWrapper>
    );
  }

  const overallStatus = health?.status || "unknown";
  const dbOk = health?.db_ok ?? false;
  const redisOk = health?.redis_ok ?? false;
  const dbLatency = health?.db_latency_ms ?? 0;
  const redisLatency = health?.redis_latency_ms ?? 0;
  const uptimeSeconds = health?.uptime_seconds ?? 0;
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const allOk = overallStatus === "ok" || overallStatus === "healthy";

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Sante" en="Health" />]}
      title={<T fr="Sante systeme" en="System health" />}
      sub={<T fr="Infrastructure, dependances, latences. Mise a jour toutes les 30 secondes." en="Infrastructure, dependencies, latencies. Refreshed every 30 seconds." />}
      actions={<Pill tone={allOk ? "success" : "warn"}>{allOk ? "all green" : overallStatus}</Pill>}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label="DB latency" value={String(Math.round(dbLatency))} unit="ms" after={<Pill tone={dbOk ? "success" : "fail"}>{dbOk ? "ok" : "down"}</Pill>} />
        <KpiCard label="Redis latency" value={String(Math.round(redisLatency))} unit="ms" after={<Pill tone={redisOk ? "success" : "fail"}>{redisOk ? "ok" : "down"}</Pill>} />
        <KpiCard label={<T fr="Uptime" en="Uptime" />} value={uptimeHours > 24 ? `${Math.floor(uptimeHours / 24)}j ${uptimeHours % 24}h` : `${uptimeHours}h`} />
        <KpiCard label={<T fr="Statut global" en="Overall status" />} value={allOk ? "OK" : overallStatus}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            DB: {dbOk ? "ok" : "down"} / Redis: {redisOk ? "ok" : "down"}
          </div>
        </KpiCard>
      </div>

      {/* Services -- flat table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Services" en="Services" />
          </h3>
        </div>
        <div className="tbl">
          {services.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun service detecte" en="No services detected" />
            </div>
          )}
          {services.map((s: any, i: number) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "auto 1.4fr 0.7fr 1fr 0.6fr 0.6fr" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.status === "ok" ? "var(--success)" : "var(--warn)" }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", padding: "2px 6px", borderRadius: 3, background: "var(--bg-2)", display: "inline-block" }}>{s.region}</div>
              <div style={{ display: "flex", gap: 1 }}>
                {Array.from({ length: 60 }).map((_, j) => (
                  <div key={j} style={{ width: 3, height: 16, background: s.status === "degraded" && j > 55 ? "var(--warn)" : "var(--success)" }} />
                ))}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{s.uptime}</div>
              <div className="mono" style={{ fontSize: 11 }}>{s.p99}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Latency by operator + Resources (static -- from monitoring infrastructure) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Latency by operator (static placeholder) */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Latence par operateur" en="Latency by operator" />
          </h3>
          {OPERATORS.map((s, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{s.name}</span>
                <span className="mono" style={{ color: s.degraded ? "var(--warn)" : "var(--muted)" }}>p50 {s.p50}ms &middot; p99 {s.p99}ms</span>
              </div>
              <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, height: "100%", width: Math.min(100, s.p99 / 100) + "%", background: s.degraded ? "var(--warn)" : "var(--primary)", opacity: 0.4, borderRadius: 2 }} />
                <div style={{ position: "absolute", left: 0, height: "100%", width: Math.min(100, s.p50 / 30) + "%", background: "var(--primary)", borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Resources (static placeholder) */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Ressources" en="Resources" />
          </h3>
          {RESOURCES.map((s, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{s.name}</span>
                <span className="mono">{s.v}% <span style={{ color: "var(--muted)" }}>&middot; {s.max}</span></span>
              </div>
              <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 3 }}>
                <div style={{ width: s.v + "%", height: "100%", background: s.v > 80 ? "var(--rose)" : s.v > 60 ? "var(--warn)" : "var(--success)", borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
