"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

/* ── mock data ─────────────────────────────────────────────── */

const SERVICES = [
  { name: "API Gateway", region: "eu-west-3", status: "ok" as const, uptime: "100%", p99: "42ms" },
  { name: "Checkout pages", region: "eu-west-3", status: "ok" as const, uptime: "100%", p99: "180ms" },
  { name: "Webhook engine", region: "eu-west-3", status: "ok" as const, uptime: "99.94%", p99: "142ms" },
  { name: "Dashboard frontend", region: "eu-west-3", status: "ok" as const, uptime: "100%", p99: "240ms" },
  { name: "TouchPay client", region: "eu-west-3", status: "degraded" as const, uptime: "98.42%", p99: "1.2s" },
  { name: "S3P / Smobilpay", region: "africa-cm", status: "ok" as const, uptime: "99.92%", p99: "320ms" },
  { name: "E-nkap connector", region: "africa-cm", status: "ok" as const, uptime: "99.91%", p99: "412ms" },
  { name: "PostgreSQL primary", region: "eu-west-3", status: "ok" as const, uptime: "100%", p99: "12ms" },
  { name: "PostgreSQL replica", region: "eu-west-3", status: "ok" as const, uptime: "100%", p99: "14ms" },
  { name: "Redis cache", region: "eu-west-3", status: "ok" as const, uptime: "100%", p99: "1.2ms" },
  { name: "Object storage (S3)", region: "eu-west-3", status: "ok" as const, uptime: "100%", p99: "82ms" },
  { name: "Email delivery (SES)", region: "eu-west-3", status: "ok" as const, uptime: "99.98%", p99: "1.8s" },
];

const OPERATORS = [
  { name: "Orange Money CM", p50: 980, p99: 2400, degraded: false },
  { name: "Orange Money CI", p50: 1240, p99: 8200, degraded: true },
  { name: "MTN MoMo CM", p50: 1100, p99: 2600, degraded: false },
  { name: "MTN MoMo CI", p50: 1200, p99: 2800, degraded: false },
  { name: "Wave SN", p50: 420, p99: 1100, degraded: false },
  { name: "Card 3DS (BNP)", p50: 2200, p99: 5800, degraded: false },
];

const RESOURCES = [
  { name: "CPU api-prod-cluster", v: 42, max: "8 vCPU Ã 6 nodes" },
  { name: "RAM api-prod-cluster", v: 58, max: "32 GB Ã 6 nodes" },
  { name: "DB connections", v: 64, max: "200 max" },
  { name: "Redis memory", v: 31, max: "4 GB" },
  { name: "Disk write IOPS", v: 22, max: "16k" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function HealthPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Opérations" en="Operations" />, <T key="c2" fr="Santé" en="Health" />]}
      title={<T fr="Santé système" en="System health" />}
      sub={<T fr="Infrastructure, dépendances, latences. Mise Ã  jour toutes les 30 secondes." en="Infrastructure, dependencies, latencies. Refreshed every 30 seconds." />}
      actions={<Pill tone="success">all green</Pill>}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label="API p99 latency" value="42" unit="ms" delta={"−4 ms"} deltaDir="down" />
        <KpiCard label={<T fr="Disponibilité 30j" en="Uptime 30d" />} value="99,98" unit="%" />
        <KpiCard label="Requests / sec" value="1 284" delta="+8%" deltaDir="up" />
        <KpiCard label={<T fr="Containers actifs" en="Running pods" />} value="42 / 48">
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            <T fr="Auto-scaling actif" en="Auto-scaling on" />
          </div>
        </KpiCard>
      </div>

      {/* Services — flat table with sparklines */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Services" en="Services" />
          </h3>
        </div>
        <div className="tbl">
          {SERVICES.map((s, i) => (
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

      {/* Latency by operator + Resources */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Latency by operator */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Latence par opérateur" en="Latency by operator" />
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

        {/* Resources */}
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
