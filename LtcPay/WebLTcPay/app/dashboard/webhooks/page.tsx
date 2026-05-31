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
  { method: "orange", label: "Orange Money", count: 28042, err: 12, p95: 138, color: "var(--orange-money)" },
  { method: "mtn", label: "MTN MoMo", count: 18211, err: 8, p95: 167, color: "var(--mtn)" },
  { method: "card", label: "Carte", count: 8124, err: 24, p95: 412, color: "var(--primary)" },
  { method: "wave", label: "Wave", count: 4035, err: 1, p95: 89, color: "var(--wave)" },
];

const RECENT_ERRORS = [
  { code: 500, msg: "TouchPay upstream timeout", ref: "TP-92481", time: "il y a 12 min", retry: "1/5" },
  { code: 503, msg: "Bank service unavailable", ref: "TP-92422", time: "il y a 31 min", retry: "2/5" },
  { code: 401, msg: "Signature HMAC invalide", ref: "TP-92301", time: "il y a 1 h", retry: "FATAL" },
  { code: 500, msg: "TouchPay upstream timeout", ref: "TP-91924", time: "il y a 2 h", retry: "5/5" },
  { code: 422, msg: "Merchant suspended", ref: "TP-91812", time: "il y a 3 h", retry: "FATAL" },
];

const RECENT_CALLBACKS = [
  { id: "TP-92481", ref: "PAY-9F4A2B7C", method: "orange", code: 200, ms: 142, time: "14:42:34" },
  { id: "TP-92480", ref: "PAY-8E2D71AC", method: "mtn", code: 200, ms: 188, time: "14:35:14" },
  { id: "TP-92479", ref: "PAY-6A1D34B8", method: "wave", code: 200, ms: 89, time: "14:22:51" },
  { id: "TP-92478", ref: "PAY-5B7E81C2", method: "orange", code: 200, ms: 164, time: "14:08:33" },
  { id: "TP-92477", ref: "PAY-9D8E1A2B", method: "card", code: 500, ms: 5022, time: "13:55:01" },
  { id: "TP-92476", ref: "PAY-4D9F22A6", method: "mtn", code: 200, ms: 158, time: "13:42:22" },
];

function methodColor(m: string): string {
  if (m === "orange") return "var(--orange-money)";
  if (m === "mtn") return "var(--mtn)";
  if (m === "wave") return "var(--wave)";
  return "var(--primary)";
}

function methodLabel(m: string): string {
  if (m === "orange") return "Orange Money";
  if (m === "mtn") return "MTN MoMo";
  if (m === "wave") return "Wave";
  return "Carte";
}

/* ── webhook chart ────────────────────────────────────────── */

function WebhookChart() {
  const w = 700, h = 180, pad = 24;
  const data = Array.from({ length: 48 }, (_, i) => ({
    v: 800 + Math.sin(i * 0.4) * 200 + Math.random() * 300,
    err: i > 30 && i < 33 ? 24 : Math.random() < 0.1 ? Math.random() * 8 : 0,
  }));
  const max = Math.max(...data.map(d => d.v));
  const step = (w - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + i * ((h - pad * 2) / 3)} y2={pad + i * ((h - pad * 2) / 3)} stroke="var(--line)" strokeDasharray="2,4" />
      ))}
      {data.map((d, i) => {
        const x = pad + i * step + 1;
        const barH = (d.v / max) * (h - pad * 2);
        const errH = (d.err / 30) * (h - pad * 2);
        return (
          <g key={i}>
            <rect x={x} y={h - pad - barH} width={step - 2} height={barH} fill="var(--primary)" rx="1" opacity="0.7" />
            {d.err > 0 && <rect x={x} y={h - pad - errH} width={step - 2} height={errH} fill="var(--rose)" rx="1" />}
          </g>
        );
      })}
      <g style={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--muted)" }}>
        <text x={pad} y={h - 6}>14:42 &middot; 24h ago</text>
        <text x={w / 2 - 16} y={h - 6}>02:42</text>
        <text x={w - pad - 30} y={h - 6}>now</text>
      </g>
    </svg>
  );
}

/* ── page ──────────────────────────────────────────────────── */

export default function WebhooksPage() {
  const maxCount = Math.max(...METHOD_BREAKDOWN.map(r => r.count));

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Opérations" en="Operations" />, <T key="c2" fr="Webhooks TouchPay" en="TouchPay Webhooks" />]}
      title={<T fr="Monitoring webhooks TouchPay" en="TouchPay webhook monitoring" />}
      sub={<T fr="Callbacks reçus de TouchPay vers LtcPay. Signature HMAC, idempotence, retry." en="Callbacks from TouchPay to LtcPay. HMAC signature, idempotency, retry." />}
      actions={<>
        <button className="btn btn-ghost btn-sm">
          <Icon name="refresh" size={13} /> <T fr="Rejouer manqués" en="Replay missed" />
        </button>
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} /> <T fr="Export 24h" en="Export 24h" />
        </button>
      </>}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
        <KpiCard hero label={<T fr="Callbacks 24h" en="Callbacks 24h" />} value="58 412" delta="+12%" deltaDir="up" />
        <KpiCard label={<T fr="Taux de succès" en="Success rate" />} value="99,94" unit="%">
          <div style={{ fontSize: 12, color: "var(--success)", marginTop: 8 }}>
            &#10003; <T fr="dans SLA 99,9%" en="within 99.9% SLA" />
          </div>
        </KpiCard>
        <KpiCard label={<T fr="Latence p95" en="p95 latency" />} value="142" unit="ms" delta={"−8 ms"} deltaDir="down" />
        <KpiCard label={<T fr="En retry" en="In retry queue" />} value="34" after={<Pill tone="warn">live</Pill>} />
      </div>

      {/* Volume / errors 24h chart */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Volume / erreurs sur 24 heures" en="Volume / errors over 24 hours" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Callbacks reçus par minute" en="Callbacks received per minute" />
            </p>
          </div>
        </div>
        <WebhookChart />
      </div>

      {/* Par methode + Erreurs recentes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* By method */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Par méthode" en="By method" />
          </h3>
          {METHOD_BREAKDOWN.map((r, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{r.label}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span className="mono">{r.count.toLocaleString("fr-FR")}</span>
                  <span className="mono" style={{ color: r.err > 20 ? "var(--rose)" : "var(--muted)" }}>{r.err} err</span>
                  <span className="mono" style={{ color: r.p95 > 300 ? "var(--warn)" : "var(--success)" }}>p95 {r.p95}ms</span>
                </div>
              </div>
              <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: (r.count / maxCount * 100) + "%", height: "100%", background: r.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent errors */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Erreurs récentes" en="Recent errors" />
          </h3>
          {RECENT_ERRORS.map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", alignItems: "center" }}>
              <Pill tone={e.retry === "FATAL" ? "fail" : "warn"} plain>{e.code}</Pill>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.msg}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{e.ref} &middot; {e.time}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: e.retry === "FATAL" ? "var(--rose)" : "var(--warn)" }}>{e.retry}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent callbacks table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Callbacks récents" en="Recent callbacks" />
          </h3>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1.4fr 0.7fr 0.7fr 0.7fr 0.8fr 0.6fr" }}>
            <span>ID</span>
            <span><T fr="Référence paiement" en="Payment ref" /></span>
            <span><T fr="Méthode" en="Method" /></span>
            <span><T fr="Code" en="Code" /></span>
            <span><T fr="Latence" en="Latency" /></span>
            <span><T fr="Heure" en="Time" /></span>
            <span><T fr="HMAC" en="HMAC" /></span>
          </div>
          {RECENT_CALLBACKS.map(c => (
            <div className="row clickable" key={c.id} style={{ gridTemplateColumns: "1fr 1.4fr 0.7fr 0.7fr 0.7fr 0.8fr 0.6fr" }}>
              <div className="mono" style={{ fontSize: 12 }}>{c.id}</div>
              <div className="mono" style={{ fontSize: 11 }}>{c.ref}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: methodColor(c.method), flexShrink: 0 }} />
                <span style={{ fontSize: 12 }}>{methodLabel(c.method)}</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: c.code === 200 ? "var(--success)" : "var(--rose)", fontWeight: 600 }}>{c.code}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.ms}ms</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.time}</div>
              <Pill tone="success" plain>&#10003;</Pill>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
