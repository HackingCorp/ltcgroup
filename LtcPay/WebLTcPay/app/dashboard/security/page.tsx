"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

/* ── mock data ─────────────────────────────────────────────── */

type Severity = "all" | "critical" | "warning" | "info";

interface AuditEvent {
  time: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  severity: "critical" | "warning" | "info";
}

const AUDIT_LOG: AuditEvent[] = [
  { time: "14:32:18", actor: "admin@nkap.cm",    action: "login_success",       target: "Dashboard",       ip: "41.204.89.12",   severity: "info" },
  { time: "14:28:05", actor: "ops@nkap.cm",      action: "merchant_deactivated", target: "FraudShop Inc",  ip: "41.204.89.12",   severity: "critical" },
  { time: "14:15:42", actor: "admin@nkap.cm",    action: "api_key_rotated",     target: "ShopEase",        ip: "41.204.89.12",   severity: "warning" },
  { time: "13:58:30", actor: "unknown",          action: "login_failed",        target: "admin@nkap.cm",   ip: "185.220.101.45", severity: "critical" },
  { time: "13:45:12", actor: "unknown",          action: "login_failed",        target: "admin@nkap.cm",   ip: "185.220.101.45", severity: "critical" },
  { time: "13:30:00", actor: "support@nkap.cm",  action: "dispute_resolved",    target: "DSP-4198",        ip: "41.204.89.15",   severity: "info" },
  { time: "13:22:18", actor: "admin@nkap.cm",    action: "fee_rate_updated",    target: "PayGate CM",      ip: "41.204.89.12",   severity: "warning" },
  { time: "13:10:55", actor: "ops@nkap.cm",      action: "withdrawal_approved", target: "WDR-8842",        ip: "41.204.89.12",   severity: "info" },
  { time: "12:58:33", actor: "admin@nkap.cm",    action: "user_created",        target: "viewer@nkap.cm",  ip: "41.204.89.12",   severity: "info" },
  { time: "12:45:10", actor: "unknown",          action: "login_failed",        target: "ops@nkap.cm",     ip: "103.152.34.78",  severity: "critical" },
  { time: "12:30:22", actor: "admin@nkap.cm",    action: "webhook_secret_rotated", target: "AfroBuy",     ip: "41.204.89.12",   severity: "warning" },
  { time: "12:15:00", actor: "support@nkap.cm",  action: "merchant_verified",   target: "TechMarket",      ip: "41.204.89.15",   severity: "info" },
];

const SEVERITY_FILTERS: { key: Severity; fr: string; en: string }[] = [
  { key: "all",      fr: "Tous",      en: "All" },
  { key: "critical", fr: "Critique",  en: "Critical" },
  { key: "warning",  fr: "Avertissement", en: "Warning" },
  { key: "info",     fr: "Info",      en: "Info" },
];

function severityTone(s: string): "fail" | "warn" | "info" | "neutral" {
  if (s === "critical") return "fail";
  if (s === "warning") return "warn";
  return "info";
}

function actionLabel(a: string): string {
  const map: Record<string, string> = {
    login_success: "Connexion r\u00e9ussie",
    login_failed: "Tentative de connexion \u00e9chou\u00e9e",
    merchant_deactivated: "Marchand d\u00e9sactiv\u00e9",
    api_key_rotated: "Cl\u00e9 API r\u00e9g\u00e9n\u00e9r\u00e9e",
    dispute_resolved: "Litige r\u00e9solu",
    fee_rate_updated: "Taux de frais modifi\u00e9",
    withdrawal_approved: "Retrait approuv\u00e9",
    user_created: "Utilisateur cr\u00e9\u00e9",
    webhook_secret_rotated: "Secret webhook r\u00e9g\u00e9n\u00e9r\u00e9",
    merchant_verified: "Marchand v\u00e9rifi\u00e9",
  };
  return map[a] || a;
}

/* ── page ──────────────────────────────────────────────────── */

export default function SecurityPage() {
  const [filter, setFilter] = useState<Severity>("all");

  const filtered = filter === "all" ? AUDIT_LOG : AUDIT_LOG.filter((e) => e.severity === filter);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="S\u00e9curit\u00e9 & audit" en="Security & Audit" />]}
      title={<T fr="S\u00e9curit\u00e9 & journal d\u2019audit" en="Security & Audit Log" />}
      sub={<T fr="\u00c9v\u00e9nements de s\u00e9curit\u00e9 et tra\u00e7abilit\u00e9 des actions" en="Security events and action traceability" />}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="\u00c9v\u00e9nements 24h" en="Events 24h" />} value="342" delta="+12% vs hier" deltaDir="up" />
        <KpiCard label={<T fr="Connexions \u00e9chou\u00e9es" en="Failed logins" />} value="3" after={<Pill tone="fail"><T fr="bloqu\u00e9es" en="blocked" /></Pill>} />
        <KpiCard label={<T fr="Rotations cl\u00e9s API" en="API key rotations" />} value="1" />
        <KpiCard label={<T fr="Sessions actives" en="Active sessions" />} value="12" />
      </div>

      {/* Severity filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {SEVERITY_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setFilter(sf.key)}
            className={filter === sf.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            style={{ fontSize: 12 }}
          >
            <T fr={sf.fr} en={sf.en} />
          </button>
        ))}
      </div>

      {/* Audit log table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row head" style={{ gridTemplateColumns: "0.6fr 1fr 1.2fr 1fr 0.8fr 0.7fr" }}>
          <div><T fr="Heure" en="Time" /></div>
          <div><T fr="Acteur" en="Actor" /></div>
          <div><T fr="Action" en="Action" /></div>
          <div><T fr="Cible" en="Target" /></div>
          <div><T fr="Adresse IP" en="IP Address" /></div>
          <div><T fr="S\u00e9v\u00e9rit\u00e9" en="Severity" /></div>
        </div>
        <div className="tbl">
          {filtered.map((e, i) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "0.6fr 1fr 1.2fr 1fr 0.8fr 0.7fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{e.time}</div>
              <div style={{ fontSize: 13, fontWeight: e.actor === "unknown" ? 600 : 400, color: e.actor === "unknown" ? "var(--rose)" : undefined }}>
                {e.actor}
              </div>
              <div style={{ fontSize: 13 }}>{actionLabel(e.action)}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{e.target}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{e.ip}</div>
              <div><Pill tone={severityTone(e.severity)}>{e.severity}</Pill></div>
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
