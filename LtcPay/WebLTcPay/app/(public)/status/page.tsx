"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { T } from "@/lib/i18n";

const SERVICES = [
  { name: "API Gateway", status: "operational", uptime: "99.99%" },
  { name: "Checkout Pages", status: "operational", uptime: "99.98%" },
  { name: "Webhook Delivery", status: "operational", uptime: "99.95%" },
  { name: "MTN Money (CM)", status: "operational", uptime: "99.87%" },
  { name: "Orange Money (CM)", status: "operational", uptime: "99.91%" },
  { name: "Wave (SN/CI)", status: "operational", uptime: "99.96%" },
  { name: "Airtel Money (GA)", status: "degraded", uptime: "98.2%" },
  { name: "M-Pesa (CD/KE)", status: "operational", uptime: "99.88%" },
  { name: "Dashboard", status: "operational", uptime: "99.99%" },
  { name: "Merchant API", status: "operational", uptime: "99.97%" },
];

const INCIDENTS = [
  {
    date: "28 Mai 2026",
    title: "Airtel Money Gabon \u2014 latence \u00e9lev\u00e9e",
    status: "monitoring",
    updates: [
      { time: "14:23", text: "Latence moyenne 8.2s sur Airtel GA. Investigation en cours." },
      { time: "14:45", text: "Cause identifi\u00e9e c\u00f4t\u00e9 op\u00e9rateur. Monitoring actif." },
    ],
  },
  {
    date: "22 Mai 2026",
    title: "Maintenance planifi\u00e9e \u2014 migration base de donn\u00e9es",
    status: "resolved",
    updates: [
      { time: "02:00", text: "D\u00e9but de la maintenance. Aucun impact sur les paiements." },
      { time: "02:18", text: "Migration termin\u00e9e. Tous les services op\u00e9rationnels." },
    ],
  },
];

export default function StatusPage() {
  const allOk = SERVICES.every(s => s.status === "operational");

  return (
    <div style={{ background: "var(--bg)", padding: "56px 32px 80px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <T fr="Statut syst\u00e8me" en="System status" />
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 48, lineHeight: 1.02, letterSpacing: "-0.03em", margin: "12px 0 24px" }}>
          <T fr="Statut des services" en="Service status" />
        </h1>

        {/* Global status banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: allOk ? "var(--success-soft)" : "var(--warn-soft)", borderRadius: 12, marginBottom: 32 }}>
          <Icon name={allOk ? "check" : "alert"} size={20} color={allOk ? "var(--success)" : "var(--warn)"} />
          <span style={{ fontWeight: 500, color: allOk ? "var(--success)" : "var(--warn)" }}>
            {allOk ? <T fr="Tous les syst\u00e8mes sont op\u00e9rationnels" en="All systems operational" /> : <T fr="D\u00e9gradation partielle" en="Partial degradation" />}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
            <T fr="Mis \u00e0 jour il y a 2 min" en="Updated 2 min ago" />
          </span>
        </div>

        {/* Service list */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
          {SERVICES.map((svc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: i < SERVICES.length - 1 ? "1px solid var(--line)" : "none", gap: 12 }}>
              <Icon name={svc.status === "operational" ? "check" : "alert"} size={14} color={svc.status === "operational" ? "var(--success)" : "var(--warn)"} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 450 }}>{svc.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>{svc.uptime}</span>
              <Pill tone={svc.status === "operational" ? "success" : "warn"}>
                {svc.status === "operational" ? <T fr="Op\u00e9rationnel" en="Operational" /> : <T fr="D\u00e9grad\u00e9" en="Degraded" />}
              </Pill>
            </div>
          ))}
        </div>

        {/* Uptime bar */}
        <div style={{ marginTop: 32, marginBottom: 8, display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span><T fr="90 derniers jours" en="Last 90 days" /></span>
          <span>99,98% uptime</span>
        </div>
        <div style={{ display: "flex", gap: 2, height: 32 }}>
          {Array.from({ length: 90 }, (_, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 2, background: i === 62 ? "var(--warn)" : "var(--success)", opacity: i === 62 ? 1 : 0.7 }} />
          ))}
        </div>

        {/* Incidents */}
        <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.015em", margin: "48px 0 16px" }}>
          <T fr="Incidents r\u00e9cents" en="Recent incidents" />
        </h2>
        {INCIDENTS.map((inc, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 20, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>{inc.date}</span>
              <Pill tone={inc.status === "resolved" ? "success" : "warn"} plain>
                {inc.status === "resolved" ? <T fr="R\u00e9solu" en="Resolved" /> : <T fr="Monitoring" en="Monitoring" />}
              </Pill>
            </div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 16, margin: "0 0 12px" }}>{inc.title}</h3>
            {inc.updates.map((u, j) => (
              <div key={j} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--ink-3)", padding: "6px 0" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", width: 40, flexShrink: 0 }}>{u.time}</span>
                <span>{u.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
