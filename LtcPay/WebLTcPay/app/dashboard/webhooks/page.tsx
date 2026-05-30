"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmt } from "@/lib/format";

/* ── mock data ─────────────────────────────────────────────── */

const METHOD_BREAKDOWN = [
  { method: "Orange Money", volume: 542, errors: 1, successRate: "99.8%", avgLatency: "128ms", color: "var(--orange-money)" },
  { method: "MTN MoMo",    volume: 489, errors: 1, successRate: "99.8%", avgLatency: "145ms", color: "var(--mtn)" },
  { method: "Wave",        volume: 186, errors: 1, successRate: "99.5%", avgLatency: "162ms", color: "var(--wave)" },
  { method: "Carte",       volume: 30,  errors: 0, successRate: "100%",  avgLatency: "98ms",  color: "var(--primary)" },
];

const RECENT_CALLBACKS = [
  { time: "14:32:18", method: "Orange Money", reference: "PAY-20260530-A8K2", statusCode: 200, latency: "112ms", status: "success" },
  { time: "14:31:55", method: "MTN MoMo",     reference: "PAY-20260530-B3F1", statusCode: 200, latency: "134ms", status: "success" },
  { time: "14:31:42", method: "Wave",         reference: "PAY-20260530-C7D4", statusCode: 200, latency: "189ms", status: "success" },
  { time: "14:31:20", method: "Orange Money", reference: "PAY-20260530-D2E9", statusCode: 200, latency: "98ms",  status: "success" },
  { time: "14:30:58", method: "MTN MoMo",     reference: "PAY-20260530-E5G3", statusCode: 504, latency: "5012ms", status: "error" },
  { time: "14:30:41", method: "Orange Money", reference: "PAY-20260530-F1H8", statusCode: 200, latency: "121ms", status: "success" },
  { time: "14:30:22", method: "Wave",         reference: "PAY-20260530-G4J6", statusCode: 200, latency: "167ms", status: "success" },
  { time: "14:29:58", method: "MTN MoMo",     reference: "PAY-20260530-H9K1", statusCode: 200, latency: "142ms", status: "success" },
  { time: "14:29:33", method: "Orange Money", reference: "PAY-20260530-I2L5", statusCode: 502, latency: "3200ms", status: "error" },
  { time: "14:29:10", method: "Orange Money", reference: "PAY-20260530-J6M7", statusCode: 200, latency: "105ms", status: "success" },
];

function methodColor(m: string): string {
  if (m.includes("Orange")) return "var(--orange-money)";
  if (m.includes("MTN")) return "var(--mtn)";
  if (m.includes("Wave")) return "var(--wave)";
  return "var(--primary)";
}

/* ── page ──────────────────────────────────────────────────── */

export default function WebhooksPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Op\u00e9rations" en="Operations" />, <T key="c2" fr="Webhooks TouchPay" en="TouchPay Webhooks" />]}
      title={<T fr="Monitoring des webhooks TouchPay" en="TouchPay Webhook Monitoring" />}
      sub={<T fr="Callbacks re\u00e7us et performance en temps r\u00e9el" en="Received callbacks and real-time performance" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="refresh" size={13} /> <T fr="Actualiser" en="Refresh" />
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="Callbacks 24h" en="Callbacks 24h" />} value={fmt(1247)} delta="+8% vs hier" deltaDir="up" />
        <KpiCard label={<T fr="Taux de succ\u00e8s" en="Success rate" />} value="99,8" unit="%" delta="+0.1%" deltaDir="up" />
        <KpiCard label={<T fr="Latence moyenne" en="Avg latency" />} value="142" unit="ms" delta="-12ms" deltaDir="down" />
        <KpiCard label={<T fr="Erreurs 24h" en="Errors 24h" />} value="3" after={<Pill tone="fail"><T fr="alerte" en="alert" /></Pill>} />
      </div>

      {/* By-method breakdown */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
            <T fr="Par m\u00e9thode de paiement" en="By payment method" />
          </h3>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "1.4fr 0.8fr 0.6fr 0.8fr 0.8fr" }}>
          <div><T fr="M\u00e9thode" en="Method" /></div>
          <div style={{ textAlign: "right" }}><T fr="Volume" en="Volume" /></div>
          <div style={{ textAlign: "right" }}><T fr="Erreurs" en="Errors" /></div>
          <div style={{ textAlign: "right" }}><T fr="Taux succ\u00e8s" en="Success rate" /></div>
          <div style={{ textAlign: "right" }}><T fr="Latence moy." en="Avg latency" /></div>
        </div>
        <div className="tbl">
          {METHOD_BREAKDOWN.map((m) => (
            <div key={m.method} className="row" style={{ gridTemplateColumns: "1.4fr 0.8fr 0.6fr 0.8fr 0.8fr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{m.method}</span>
              </div>
              <div style={{ textAlign: "right" }} className="mono">{fmt(m.volume)}</div>
              <div style={{ textAlign: "right" }}>
                {m.errors > 0
                  ? <span style={{ color: "var(--rose)", fontWeight: 600 }}>{m.errors}</span>
                  : <span style={{ color: "var(--success)" }}>0</span>
                }
              </div>
              <div style={{ textAlign: "right" }}><Pill tone="success">{m.successRate}</Pill></div>
              <div style={{ textAlign: "right", color: "var(--muted)" }} className="mono">{m.avgLatency}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent callbacks */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
              <T fr="Callbacks r\u00e9cents" en="Recent callbacks" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Derniers callbacks re\u00e7us de TouchPay" en="Latest callbacks received from TouchPay" />
            </p>
          </div>
          <Pill tone="live"><T fr="Temps r\u00e9el" en="Live" /></Pill>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "0.7fr 1fr 1.4fr 0.6fr 0.7fr 0.6fr" }}>
          <div><T fr="Heure" en="Time" /></div>
          <div><T fr="M\u00e9thode" en="Method" /></div>
          <div><T fr="R\u00e9f\u00e9rence" en="Reference" /></div>
          <div style={{ textAlign: "right" }}><T fr="Code" en="Status code" /></div>
          <div style={{ textAlign: "right" }}><T fr="Latence" en="Latency" /></div>
          <div><T fr="Statut" en="Status" /></div>
        </div>
        <div className="tbl">
          {RECENT_CALLBACKS.map((cb, i) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "0.7fr 1fr 1.4fr 0.6fr 0.7fr 0.6fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{cb.time}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: methodColor(cb.method), flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{cb.method}</span>
              </div>
              <div className="mono" style={{ fontSize: 12 }}>{cb.reference}</div>
              <div style={{ textAlign: "right" }}>
                <span className="mono" style={{ fontWeight: 500, color: cb.statusCode === 200 ? "var(--success)" : "var(--rose)" }}>
                  {cb.statusCode}
                </span>
              </div>
              <div className="mono" style={{ textAlign: "right", fontSize: 12, color: parseInt(cb.latency) > 1000 ? "var(--rose)" : "var(--muted)" }}>
                {cb.latency}
              </div>
              <div>
                <Pill tone={cb.status === "success" ? "success" : "fail"}>
                  {cb.status === "success" ? "OK" : "ERR"}
                </Pill>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
