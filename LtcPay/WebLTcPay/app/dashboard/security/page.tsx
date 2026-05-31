"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { adminDashboardService } from "@/services/admin-dashboard.service";

/* ── types & helpers ──────────────────────────────────────── */

type SeverityKey = "high" | "medium" | "info" | "low";

const SEV_TONE: Record<SeverityKey, "fail" | "warn" | "info" | "neutral"> = {
  high: "fail",
  medium: "warn",
  info: "info",
  low: "neutral",
};

const SEVERITY_FILTERS: { key: "all" | SeverityKey; label: string }[] = [
  { key: "all", label: "all" },
  { key: "high", label: "high" },
  { key: "medium", label: "medium" },
  { key: "info", label: "info" },
  { key: "low", label: "low" },
];

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

/* ── page ──────────────────────────────────────────────────── */

export default function SecurityPage() {
  const [filter, setFilter] = useState<"all" | SeverityKey>("all");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [logsRes, statsRes] = await Promise.all([
          adminDashboardService.getAuditLogs({ page: 1, page_size: 20 }),
          adminDashboardService.getSecurityStats(),
        ]);
        setAuditLogs(logsRes.items || []);
        setStats(statsRes);
      } catch (err) {
        console.error("Failed to load security data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="Securite & audit" en="Security & audit" />]}
        title={<T fr="Journal d'audit" en="Audit log" />}
        sub=""
      >
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
      </PageWrapper>
    );
  }

  const filtered = filter === "all" ? auditLogs : auditLogs.filter((e) => e.severity === filter);

  const events24h = stats?.events_24h ?? 0;
  const highSev = stats?.high_severity_24h ?? 0;
  const mediumSev = stats?.medium_severity_24h ?? 0;
  const totalEvents = stats?.total_events ?? 0;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="Securite & audit" en="Security & audit" />]}
      title={<T fr="Journal d'audit" en="Audit log" />}
      sub={<T fr="Toutes les actions sensibles sur la plateforme. Conservation 7 ans, immutable." en="All sensitive actions on the platform. 7-year retention, immutable." />}
      actions={<>
        <button className="btn btn-ghost btn-sm">
          <Icon name="filter" size={13} /> <T fr="Filtres" en="Filters" />
        </button>
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} /> <T fr="Export forensic" en="Export forensic" />
        </button>
      </>}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="Evenements 24h" en="Events 24h" />} value={events24h.toLocaleString("fr-FR")} />
        <KpiCard label={<T fr="Severite haute" en="High severity" />} value={String(highSev)} after={highSev > 0 ? <Pill tone="fail">!</Pill> : undefined} />
        <KpiCard label={<T fr="Severite moyenne" en="Medium severity" />} value={String(mediumSev)} />
        <KpiCard label={<T fr="Total evenements" en="Total events" />} value={totalEvents.toLocaleString("fr-FR")} />
      </div>

      {/* Severity filter pills + date context */}
      <div className="card" style={{ padding: 14, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {SEVERITY_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setFilter(sf.key)}
            style={{ appearance: "none", border: 0, cursor: "pointer", background: "none", padding: 0 }}
          >
            <Pill tone={sf.key === "all" ? "info" : SEV_TONE[sf.key]} className={filter === sf.key ? "pill-active" : ""}>
              {sf.label}
            </Pill>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="mono" style={{
          fontSize: 11,
          color: "var(--muted)",
          background: "var(--bg-2)",
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid var(--line)",
        }}>
          {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} &middot; 24h
        </span>
      </div>

      {/* Audit log table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "0.5fr 1.2fr 1fr 1.4fr 1fr 0.8fr" }}>
            <span><T fr="Sev." en="Sev." /></span>
            <span><T fr="Action" en="Action" /></span>
            <span><T fr="Acteur" en="Actor" /></span>
            <span><T fr="Cible" en="Target" /></span>
            <span><T fr="Raison" en="Reason" /></span>
            <span><T fr="Quand" en="When" /></span>
          </div>
          {filtered.map((e: any, i: number) => (
            <div key={e.id || i} className="row" style={{ gridTemplateColumns: "0.5fr 1.2fr 1fr 1.4fr 1fr 0.8fr" }}>
              <Pill tone={SEV_TONE[e.severity as SeverityKey] || "neutral"}>{e.severity}</Pill>
              <div className="mono" style={{ fontSize: 12 }}>{e.action}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.actor_name || e.actor_id || "system"}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{e.ip_address || "---"}</div>
              </div>
              <div style={{ fontSize: 12 }}>{e.target || "---"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.reason || "---"}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{e.created_at ? timeAgo(e.created_at) : "---"}</div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="shield" size={28} color="var(--success)" />
            <p style={{ marginTop: 8 }}><T fr="Aucun evenement trouve" en="No events found" /></p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
