"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

/* ── mock data ─────────────────────────────────────────────── */

type ServiceStatus = "operational" | "degraded" | "down";

interface ServiceItem {
  name: string;
  status: ServiceStatus;
  uptime: string;
  latency: string;
  category: string;
}

const SERVICES: ServiceItem[] = [
  { name: "API Gateway",       status: "operational", uptime: "99.99%", latency: "45ms",  category: "core" },
  { name: "Checkout",          status: "operational", uptime: "99.98%", latency: "62ms",  category: "core" },
  { name: "Webhook Delivery",  status: "operational", uptime: "99.97%", latency: "142ms", category: "core" },
  { name: "MTN CM",            status: "operational", uptime: "99.95%", latency: "189ms", category: "provider" },
  { name: "Orange CM",         status: "operational", uptime: "99.93%", latency: "156ms", category: "provider" },
  { name: "Wave SN",           status: "operational", uptime: "99.90%", latency: "178ms", category: "provider" },
  { name: "Wave CI",           status: "operational", uptime: "99.88%", latency: "192ms", category: "provider" },
  { name: "Airtel GA",         status: "degraded",    uptime: "98.50%", latency: "890ms", category: "provider" },
  { name: "M-Pesa",            status: "operational", uptime: "99.80%", latency: "210ms", category: "provider" },
  { name: "Dashboard",         status: "operational", uptime: "99.99%", latency: "38ms",  category: "infra" },
  { name: "Merchant API",      status: "operational", uptime: "99.98%", latency: "52ms",  category: "infra" },
  { name: "Database",          status: "operational", uptime: "99.99%", latency: "12ms",  category: "infra" },
  { name: "Redis",             status: "operational", uptime: "99.99%", latency: "3ms",   category: "infra" },
];

function statusTone(s: ServiceStatus): "success" | "warn" | "fail" {
  if (s === "operational") return "success";
  if (s === "degraded") return "warn";
  return "fail";
}

function statusLabel(s: ServiceStatus, lang: "fr" | "en"): string {
  if (s === "operational") return lang === "fr" ? "Op\u00e9rationnel" : "Operational";
  if (s === "degraded") return lang === "fr" ? "D\u00e9grad\u00e9" : "Degraded";
  return lang === "fr" ? "Hors service" : "Down";
}

function categoryLabel(c: string, lang: "fr" | "en"): string {
  if (c === "core") return lang === "fr" ? "Services principaux" : "Core services";
  if (c === "provider") return lang === "fr" ? "Fournisseurs de paiement" : "Payment providers";
  return lang === "fr" ? "Infrastructure" : "Infrastructure";
}

/* ── page ──────────────────────────────────────────────────── */

export default function HealthPage() {
  const operationalCount = SERVICES.filter((s) => s.status === "operational").length;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Op\u00e9rations" en="Operations" />, <T key="c2" fr="Sant\u00e9 syst\u00e8me" en="System Health" />]}
      title={<T fr="Sant\u00e9 syst\u00e8me" en="System Health" />}
      sub={<T fr="Surveillance en temps r\u00e9el de tous les services" en="Real-time monitoring of all services" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="refresh" size={13} /> <T fr="Actualiser" en="Refresh" />
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="Disponibilit\u00e9 globale" en="Overall uptime" />} value="99,98" unit="%" delta="+0.01%" deltaDir="up" />
        <KpiCard label={<T fr="Services actifs" en="Active services" />} value={`${operationalCount}/${SERVICES.length}`} />
        <KpiCard label={<T fr="Temps de r\u00e9ponse moy." en="Avg response time" />} value="89" unit="ms" delta="-5ms" deltaDir="down" />
        <KpiCard label={<T fr="Incidents 30j" en="Incidents 30d" />} value="1" after={<Pill tone="warn"><T fr="mineur" en="minor" /></Pill>} />
      </div>

      {/* Overall status bar */}
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, padding: 18 }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: operationalCount === SERVICES.length ? "var(--success)" : "var(--warn)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {operationalCount === SERVICES.length
              ? <T fr="Tous les syst\u00e8mes sont op\u00e9rationnels" en="All systems operational" />
              : <T fr="Certains services sont d\u00e9grad\u00e9s" en="Some services are degraded" />
            }
          </span>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "2px 0 0" }}>
            <T fr="Derniere v\u00e9rification : il y a 30 secondes" en="Last checked: 30 seconds ago" />
          </p>
        </div>
        <Pill tone={operationalCount === SERVICES.length ? "success" : "warn"}>
          {operationalCount}/{SERVICES.length} <T fr="actifs" en="active" />
        </Pill>
      </div>

      {/* Services grouped by category */}
      {["core", "provider", "infra"].map((cat) => {
        const items = SERVICES.filter((s) => s.category === cat);
        return (
          <div key={cat} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
                <T fr={categoryLabel(cat, "fr")} en={categoryLabel(cat, "en")} />
              </h3>
            </div>
            <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 0.7fr" }}>
              <div><T fr="Service" en="Service" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div style={{ textAlign: "right" }}><T fr="Uptime" en="Uptime" /></div>
              <div style={{ textAlign: "right" }}><T fr="Latence" en="Latency" /></div>
            </div>
            <div className="tbl">
              {items.map((s) => (
                <div key={s.name} className="row" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 0.7fr" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: s.status === "operational" ? "var(--success)" : s.status === "degraded" ? "var(--warn)" : "var(--rose)",
                      flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                  </div>
                  <div>
                    <Pill tone={statusTone(s.status)}>
                      <T fr={statusLabel(s.status, "fr")} en={statusLabel(s.status, "en")} />
                    </Pill>
                  </div>
                  <div style={{ textAlign: "right" }} className="mono">{s.uptime}</div>
                  <div style={{ textAlign: "right", color: parseInt(s.latency) > 500 ? "var(--rose)" : "var(--muted)" }} className="mono">
                    {s.latency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </PageWrapper>
  );
}
