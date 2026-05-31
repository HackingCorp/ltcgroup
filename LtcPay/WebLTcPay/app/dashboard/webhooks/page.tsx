"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { adminDashboardService } from "@/services/admin-dashboard.service";

/* ── helpers ─────────────────────────────────────────────────── */

function methodColor(m: string): string {
  const lower = (m || "").toLowerCase();
  if (lower === "orange" || lower.includes("orange")) return "var(--orange-money)";
  if (lower === "mtn" || lower.includes("mtn")) return "var(--mtn)";
  if (lower === "wave" || lower.includes("wave")) return "var(--wave)";
  return "var(--primary)";
}

function methodLabel(m: string): string {
  const lower = (m || "").toLowerCase();
  if (lower === "orange" || lower.includes("orange")) return "Orange Money";
  if (lower === "mtn" || lower.includes("mtn")) return "MTN MoMo";
  if (lower === "wave" || lower.includes("wave")) return "Wave";
  return "Carte";
}

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
  return `il y a ${diffD} j`;
}

/* ── webhook chart (static visualization) ───────────────────── */

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
  const [stats, setStats] = useState<any>(null);
  const [methodBreakdown, setMethodBreakdown] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, methodRes, errorsRes, logsRes] = await Promise.all([
          adminDashboardService.getWebhookStats(),
          adminDashboardService.getWebhookMethodBreakdown(),
          adminDashboardService.getWebhookErrors(),
          adminDashboardService.getWebhookLogs({ page: 1, page_size: 10 }),
        ]);
        setStats(statsRes);
        setMethodBreakdown(methodRes?.items || methodRes?.breakdown || []);
        setErrors(errorsRes?.items || errorsRes?.errors || []);
        setLogs(logsRes?.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Webhooks TouchPay" en="TouchPay Webhooks" />]}
        title={<T fr="Monitoring webhooks TouchPay" en="TouchPay webhook monitoring" />}
        sub={<T fr="Callbacks recus de TouchPay vers LtcPay." en="Callbacks from TouchPay to LtcPay." />}
      >
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
      </PageWrapper>
    );
  }

  const maxCount = methodBreakdown.length > 0 ? Math.max(...methodBreakdown.map((r: any) => r.count || 0)) : 1;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Webhooks TouchPay" en="TouchPay Webhooks" />]}
      title={<T fr="Monitoring webhooks TouchPay" en="TouchPay webhook monitoring" />}
      sub={<T fr="Callbacks recus de TouchPay vers LtcPay. Signature HMAC, idempotence, retry." en="Callbacks from TouchPay to LtcPay. HMAC signature, idempotency, retry." />}
      actions={<>
        <button className="btn btn-ghost btn-sm">
          <Icon name="refresh" size={13} /> <T fr="Rejouer manques" en="Replay missed" />
        </button>
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} /> <T fr="Export 24h" en="Export 24h" />
        </button>
      </>}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
        <KpiCard hero label={<T fr="Callbacks 24h" en="Callbacks 24h" />} value={stats?.callbacks_24h != null ? String(stats.callbacks_24h) : "—"} />
        <KpiCard label={<T fr="Taux de succes" en="Success rate" />} value={stats?.success_rate != null ? String(stats.success_rate) : "—"} unit="%">
          {stats?.success_rate >= 99.9 && (
            <div style={{ fontSize: 12, color: "var(--success)", marginTop: 8 }}>
              &#10003; <T fr="dans SLA 99,9%" en="within 99.9% SLA" />
            </div>
          )}
        </KpiCard>
        <KpiCard label={<T fr="Latence p95" en="p95 latency" />} value={stats?.p95_latency_ms != null ? String(stats.p95_latency_ms) : "—"} unit="ms" />
        <KpiCard label={<T fr="En retry" en="In retry queue" />} value={stats?.retry_queue_size != null ? String(stats.retry_queue_size) : "—"} after={stats?.retry_queue_size > 0 ? <Pill tone="warn">live</Pill> : undefined} />
      </div>

      {/* Volume / errors 24h chart */}
      <div className="nk-card" style={{ marginBottom: 12 }}>
        <div className="card-head" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Volume / erreurs sur 24 heures" en="Volume / errors over 24 hours" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Callbacks recus par minute" en="Callbacks received per minute" />
            </p>
          </div>
        </div>
        <WebhookChart />
      </div>

      {/* Par methode + Erreurs recentes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* By method */}
        <div className="nk-card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Par methode" en="By method" />
          </h3>
          {methodBreakdown.length > 0 ? methodBreakdown.map((r: any, i: number) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color || methodColor(r.method || r.label || ""), flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{r.label || methodLabel(r.method || "")}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span className="mono">{(r.count || 0).toLocaleString("fr-FR")}</span>
                  <span className="mono" style={{ color: (r.err || r.error_count || 0) > 20 ? "var(--rose)" : "var(--muted)" }}>{r.err || r.error_count || 0} err</span>
                  <span className="mono" style={{ color: (r.p95 || r.p95_ms || 0) > 300 ? "var(--warn)" : "var(--success)" }}>p95 {r.p95 || r.p95_ms || 0}ms</span>
                </div>
              </div>
              <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: ((r.count || 0) / maxCount * 100) + "%", height: "100%", background: r.color || methodColor(r.method || r.label || "") }} />
              </div>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Aucune donnee" en="No data" />
            </div>
          )}
        </div>

        {/* Recent errors */}
        <div className="nk-card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Erreurs recentes" en="Recent errors" />
          </h3>
          {errors.length > 0 ? errors.map((e: any, i: number) => (
            <div key={e.id || i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", alignItems: "center" }}>
              <Pill tone={(e.retry_count >= e.max_retries) || e.retry === "FATAL" ? "fail" : "warn"} plain>{e.http_status || e.code || "—"}</Pill>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.error_message || e.msg || "Error"}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{e.payment_reference || e.ref || "—"} &middot; {e.created_at ? timeAgo(e.created_at) : e.time || "—"}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: (e.retry_count >= e.max_retries) ? "var(--rose)" : "var(--warn)" }}>
                {e.retry_count != null && e.max_retries != null ? `${e.retry_count}/${e.max_retries}` : e.retry || "—"}
              </div>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <Icon name="check" size={20} color="var(--success)" />
              <p style={{ marginTop: 8 }}><T fr="Aucune erreur recente" en="No recent errors" /></p>
            </div>
          )}
        </div>
      </div>

      {/* Recent callbacks table */}
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Callbacks recents" en="Recent callbacks" />
          </h3>
        </div>
        {logs.length > 0 ? (
          <div className="tbl">
            <div className="row head" style={{ gridTemplateColumns: "1fr 1.4fr 0.7fr 0.7fr 0.7fr 0.8fr 0.6fr" }}>
              <span>ID</span>
              <span><T fr="Reference paiement" en="Payment ref" /></span>
              <span><T fr="Methode" en="Method" /></span>
              <span><T fr="Code" en="Code" /></span>
              <span><T fr="Latence" en="Latency" /></span>
              <span><T fr="Heure" en="Time" /></span>
              <span><T fr="HMAC" en="HMAC" /></span>
            </div>
            {logs.map((c: any) => (
              <div className="row clickable" key={c.id} style={{ gridTemplateColumns: "1fr 1.4fr 0.7fr 0.7fr 0.7fr 0.8fr 0.6fr" }}>
                <div className="mono" style={{ fontSize: 12 }}>{c.id?.substring(0, 12) || "—"}</div>
                <div className="mono" style={{ fontSize: 11 }}>{c.payment_reference || "—"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 1, background: methodColor(c.method || ""), flexShrink: 0 }} />
                  <span style={{ fontSize: 12 }}>{methodLabel(c.method || "")}</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: c.http_status === 200 ? "var(--success)" : "var(--rose)", fontWeight: 600 }}>{c.http_status || "—"}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.latency_ms || "—"}ms</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.created_at ? new Date(c.created_at).toLocaleTimeString("fr-FR") : "—"}</div>
                <Pill tone={c.hmac_valid ? "success" : "fail"} plain>{c.hmac_valid ? "✓" : "✗"}</Pill>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            <T fr="Aucun callback recent" en="No recent callbacks" />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
