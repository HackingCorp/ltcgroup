"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

/* ── mock data ─────────────────────────────────────────────── */

type SeverityKey = "high" | "medium" | "info" | "low";

interface AuditEvent {
  sev: SeverityKey;
  action: string;
  who: string;
  target: string;
  ip: string;
  time: string;
  reason: string;
}

const AUDIT_LOG: AuditEvent[] = [
  { sev: "high", action: "merchant.suspended", who: "system", target: "MER-008 \u00b7 Mobile Plus Center", ip: "\u2014", time: "il y a 2 h", reason: "auto-fraud-detection: 18 chargebacks/24h" },
  { sev: "info", action: "admin.login", who: "Sarah Mendomo", target: "\u2014", ip: "41.202.143.22", time: "il y a 3 h", reason: "MFA TOTP" },
  { sev: "medium", action: "fees.modified", who: "Jean Kameni", target: "MER-009 \u00b7 Agro Export", ip: "41.202.143.18", time: "il y a 1 h", reason: "Custom rate 0,9% \u2192 0,8%" },
  { sev: "info", action: "kyc.approved", who: "Nad\u00e8ge Tchana", target: "MER-247 \u00b7 Studio Foto Pro", ip: "41.202.143.31", time: "il y a 12 min", reason: "manual review" },
  { sev: "high", action: "api_key.rotated", who: "system", target: "MER-003 \u00b7 KILIMO SARL", ip: "\u2014", time: "il y a 4 h", reason: "rotation auto 90j" },
  { sev: "low", action: "report.generated", who: "A\u00efcha Bello", target: "Encaissements_2026-05.csv", ip: "154.0.42.18", time: "il y a 6 h", reason: "\u2014" },
  { sev: "medium", action: "user.invited", who: "Sarah Mendomo", target: "patrick@ltc.cm \u00b7 role analyst", ip: "41.202.143.22", time: "il y a 8 h", reason: "\u2014" },
  { sev: "high", action: "secret.accessed", who: "Sarah Mendomo", target: "TOUCHPAY_SECRET", ip: "41.202.143.22", time: "il y a 9 h", reason: "rotation pr\u00e9paration" },
];

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

/* ── page ──────────────────────────────────────────────────── */

export default function SecurityPage() {
  const [filter, setFilter] = useState<"all" | SeverityKey>("all");

  const filtered = filter === "all" ? AUDIT_LOG : AUDIT_LOG.filter((e) => e.sev === filter);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="S\u00e9curit\u00e9 & audit" en="Security & audit" />]}
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
        <KpiCard hero label={<T fr="\u00c9v\u00e9nements 24h" en="Events 24h" />} value="1 842" />
        <KpiCard label={<T fr="S\u00e9v\u00e9rit\u00e9 haute" en="High severity" />} value="12" after={<Pill tone="fail">!</Pill>} />
        <KpiCard label={<T fr="\u00c9checs MFA" en="MFA failures" />} value="3" delta="+2" deltaDir="up" />
        <KpiCard label={<T fr="Nouveaux secrets" en="New secrets" />} value="2" />
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
          26 mai 2026 &middot; 24h
        </span>
      </div>

      {/* Audit log table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "0.5fr 1.2fr 1fr 1.4fr 1fr 0.8fr" }}>
            <span><T fr="S\u00e9v." en="Sev." /></span>
            <span><T fr="Action" en="Action" /></span>
            <span><T fr="Acteur" en="Actor" /></span>
            <span><T fr="Cible" en="Target" /></span>
            <span><T fr="Raison" en="Reason" /></span>
            <span><T fr="Quand" en="When" /></span>
          </div>
          {filtered.map((e, i) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "0.5fr 1.2fr 1fr 1.4fr 1fr 0.8fr" }}>
              <Pill tone={SEV_TONE[e.sev]}>{e.sev}</Pill>
              <div className="mono" style={{ fontSize: 12 }}>{e.action}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.who}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{e.ip}</div>
              </div>
              <div style={{ fontSize: 12 }}>{e.target}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.reason}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{e.time}</div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="shield" size={28} color="var(--success)" />
            <p style={{ marginTop: 8 }}><T fr="Aucun \u00e9v\u00e9nement trouv\u00e9" en="No events found" /></p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
