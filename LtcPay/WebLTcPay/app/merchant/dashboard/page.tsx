"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sparkline } from "@/components/ui/sparkline";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmtDate, fmtTime } from "@/lib/format";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import type { MerchantDashboardStats, BalanceInfo } from "@/types";

/* ── Helpers ───────────────────────────────────────────────── */

function methodKind(method?: string, operator?: string): string {
  const op = (operator || "").toLowerCase();
  if (op.includes("orange") || op === "om") return "orange";
  if (op.includes("mtn")) return "mtn";
  if (op.includes("wave")) return "wave";
  const m = (method || "").toLowerCase();
  if (m.includes("orange") || m.includes("om")) return "orange";
  if (m.includes("mtn") || m.includes("momo")) return "mtn";
  if (m.includes("wave")) return "wave";
  if (m === "sdk" || m === "direct_api" || m === "mobile_money") return "orange";
  return "card";
}

function statusTone(s: string): "success" | "warn" | "fail" | "neutral" {
  const lower = s.toLowerCase();
  if (lower === "completed") return "success";
  if (lower === "pending" || lower === "processing") return "warn";
  if (lower === "failed" || lower === "expired" || lower === "cancelled") return "fail";
  return "neutral";
}

/* ── helpers: method colors/labels ─────────────────────────── */

function methodColorVar(m: string): string {
  const lower = (m || "").toLowerCase();
  if (lower.includes("orange") || lower === "om") return "var(--orange-money)";
  if (lower.includes("mtn")) return "var(--mtn)";
  if (lower.includes("wave")) return "var(--wave)";
  return "var(--ink)";
}

function methodDisplayName(m: string): { name?: string; nameFr?: string; nameEn?: string } {
  const lower = (m || "").toLowerCase();
  if (lower.includes("orange") || lower === "om") return { name: "Orange Money" };
  if (lower.includes("mtn")) return { name: "MTN MoMo" };
  if (lower.includes("wave")) return { name: "Wave" };
  return { nameFr: "Cartes", nameEn: "Cards" };
}

/* ── SVG charts ─────────────────────────────────────────────── */

function RevenueChartSVG({ data, labels }: { data: number[]; labels?: string[] }) {
  const w = 700, h = 220, padL = 56, padR = 12, padT = 12, padB = 32;
  if (!data || data.length < 2) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}><T fr="Pas assez de donnees" en="Not enough data" /></div>;

  const max = Math.max(...data) * 1.15 || 1;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const barGap = 3;
  const barW = Math.max(4, (chartW - barGap * (data.length - 1)) / data.length);

  // Y-axis grid lines (4 ticks)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {/* Y-axis grid + labels */}
      {ticks.map((val, i) => {
        const y = padT + chartH - (val / max) * chartH;
        return (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--line)" strokeWidth="0.7" />
            <text x={padL - 8} y={y + 3} textAnchor="end" style={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--muted)" }}>
              {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((v, i) => {
        const barH = (v / max) * chartH;
        const x = padL + i * (barW + barGap);
        const y = padT + chartH - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={Math.min(barW / 2, 3)}
              fill="var(--primary)"
              opacity={0.85}
            />
            {/* X-axis label — show every ~5th label to avoid overlap */}
            {labels && i % Math.max(1, Math.floor(data.length / 7)) === 0 && (
              <text
                x={x + barW / 2}
                y={h - 6}
                textAnchor="middle"
                style={{ fontFamily: "var(--mono)", fontSize: 8, fill: "var(--muted)" }}
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MethodDonutSVG({ breakdown }: { breakdown: { method: string; pct: number }[] }) {
  const size = 120;
  const cx = size / 2, cy = size / 2, r = 44, sw = 16;
  const pcts = breakdown.map(b => b.pct);
  const colors = breakdown.map(b => methodColorVar(b.method));
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = pcts.map((pct, i) => {
    const dash = (pct / 100) * circ;
    const gap = circ - dash;
    const o = offset;
    offset += dash;
    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={colors[i]}
        strokeWidth={sw}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-o}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="butt"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, fill: "var(--ink)" }}>{breakdown.length}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>methods</text>
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────── */

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<MerchantDashboardStats | null>(null);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, balanceData] = await Promise.all([
          merchantDashboardService.getStats(),
          merchantDashboardService.getBalance(),
        ]);
        setStats(statsData);
        setBalance(balanceData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ── Loading state ──────────────────────────────────────── */
  if (loading) {
    return (
      <PageWrapper
        crumb={[
          <T key="c1" fr="Encaissement" en="Collect" />,
          <T key="c2" fr="Vue d'ensemble" en="Overview" />,
        ]}
        title={<T fr="Chargement…" en="Loading…" />}
        sub={<T fr="Récupération des données" en="Fetching data" />}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 320,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid var(--line)",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageWrapper>
    );
  }

  const recentPayments = stats?.recent_payments ?? [];
  const revenueChart = stats?.revenue_chart ?? [];
  const revenueChartData: number[] = revenueChart.map((d) => d.amount);
  const revenueChartLabels: string[] = revenueChart.map((d) => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });
  const methodBreakdown = stats?.method_breakdown ?? [];

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Encaissement" en="Collect" />,
        <T key="c2" fr="Vue d'ensemble" en="Overview" />,
      ]}
      title={
        <T
          fr={`Aujourd'hui, vous avez encaissé ${fmtXAF(stats?.today_revenue ?? 0)}`}
          en={`Today, you collected ${fmtXAF(stats?.today_revenue ?? 0)}`}
        />
      }
      sub={
        <T
          fr="Solde temps réel · règlement programmé demain"
          en="Live balance · settlement scheduled tomorrow"
        />
      }
      actions={
        <>
          <div className="kbd-pill">7j</div>
          <button className="btn btn-ghost btn-sm">
            <Icon name="download" size={13} />{" "}
            <T fr="Export" en="Export" />
          </button>
          <Link
            href="/merchant/dashboard/payments"
            className="btn btn-primary btn-sm"
            style={{ textDecoration: "none" }}
          >
            <Icon name="plus" size={13} color="white" />{" "}
            <T fr="Créer un paiement" en="Create payment" />
          </Link>
        </>
      }
    >
      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div
        className="kpi-grid"
        style={{
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
          marginBottom: 12,
        }}
      >
        {/* Hero — Solde disponible */}
        <KpiCard
          hero
          label={
            <>
              <T fr="Solde disponible" en="Available balance" /> {"·"} {balance?.currency ?? "XAF"}
            </>
          }
          after={<Icon name="eye" size={13} color="rgba(255,255,255,0.4)" />}
          value={fmtXAF(balance?.available_balance ?? 0)}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span>
              <T fr="Prochain règlement : demain" en="Next payout: tomorrow" />
            </span>
            <button
              className="btn btn-accent btn-sm"
              onClick={() => router.push("/merchant/dashboard/payouts")}
            >
              <T fr="Retirer" en="Withdraw" />
            </button>
          </div>
        </KpiCard>

        {/* Volume 7j */}
        <KpiCard
          label={<T fr="Volume 7j" en="7d volume" />}
          value={fmtXAF(stats?.revenue_7d ?? 0)}
        >
          {revenueChartData.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: -4 }}>
              <Sparkline data={revenueChartData.slice(-14)} width={220} height={36} />
            </div>
          )}
        </KpiCard>

        {/* Transactions */}
        <KpiCard
          label={<T fr="Paiements reussis" en="Successful payments" />}
          value={String(stats?.total_transactions ?? 0)}
        >
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            <T
              fr={`Sur ${stats?.total_payments ?? 0} paiements au total`}
              en={`Out of ${stats?.total_payments ?? 0} total payments`}
            />
          </div>
        </KpiCard>

        {/* Taux de réussite */}
        <KpiCard
          label={<T fr="Taux de réussite" en="Success rate" />}
          value={String(stats?.success_rate ?? 0)}
          unit="%"
        >
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            <T
              fr={`Sur ${stats?.total_payments ?? 0} paiements`}
              en={`Out of ${stats?.total_payments ?? 0} payments`}
            />
          </div>
        </KpiCard>
      </div>

      {/* ── Two-column charts ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Revenue chart */}
        <div className="nk-card">
          <div className="card-head">
            <div>
              <h3>
                <T fr="Encaissements sur 30 jours" en="Collections over 30 days" />
              </h3>
              <p
                className="sub"
                style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}
              >
                <T
                  fr="F CFA encaissés par jour, frais déduits."
                  en="XAF per day, fees deducted."
                />
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "var(--primary)",
                    marginRight: 6,
                  }}
                />
                <T fr="Encaissé" en="Collected" />
              </span>
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "var(--line-2)",
                    marginRight: 6,
                  }}
                />
                <T fr="Période précédente" en="Previous period" />
              </span>
            </div>
          </div>
          <RevenueChartSVG data={revenueChartData} labels={revenueChartLabels} />
        </div>

        {/* Method mix donut */}
        <div className="nk-card">
          <h3
            style={{
              fontFamily: "var(--display)",
              fontWeight: 500,
              fontSize: 18,
              margin: "0 0 6px",
            }}
          >
            <T fr="Mix par méthode" en="Method mix" />
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}>
            <T fr="Les 7 derniers jours" en="Last 7 days" />
          </p>
          {methodBreakdown.length > 0 ? (
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <MethodDonutSVG breakdown={methodBreakdown} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {methodBreakdown.map((m, i) => {
                  const display = methodDisplayName(m.method);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: methodColorVar(m.method),
                        }}
                      />
                      <span style={{ flex: 1 }}>
                        {display.nameFr ? (
                          <T fr={display.nameFr} en={display.nameEn} />
                        ) : (
                          display.name
                        )}
                      </span>
                      <span className="mono" style={{ color: "var(--muted)" }}>
                        {m.pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Aucune donnee de methode" en="No method data" />
            </div>
          )}
        </div>
      </div>

      {/* ── Recent transactions ───────────────────────────────── */}
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "var(--display)",
                fontWeight: 500,
                fontSize: 18,
                margin: 0,
              }}
            >
              <T fr="Transactions récentes" en="Recent transactions" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Mise à jour en temps réel" en="Live updates" />
            </p>
          </div>
          <Link
            href="/merchant/dashboard/payments"
            className="btn btn-link"
            style={{ textDecoration: "none" }}
          >
            <T fr="Voir tout" en="View all" /> {"→"}
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            <Icon name="inbox" size={32} color="var(--line-2)" />
            <p style={{ marginTop: 12, fontSize: 14 }}>
              <T
                fr="Aucune transaction pour le moment"
                en="No transactions yet"
              />
            </p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              <T
                fr="Les paiements apparaîtront ici dès qu'ils seront effectués."
                en="Payments will appear here as soon as they are made."
              />
            </p>
          </div>
        ) : (
          <div className="tbl">
            {recentPayments.map((p) => (
              <div
                className="row clickable"
                key={p.id}
                style={{
                  gridTemplateColumns: "1.1fr 1.2fr 0.8fr 0.7fr 1fr",
                }}
              >
                {/* Col 1: Reference (top) + Description (bottom) */}
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12 }}>
                    {p.reference}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {p.description || "—"}
                  </div>
                </div>

                {/* Col 2: Phone (top) + Name/Email (bottom) */}
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12 }}>
                    {p.customer_phone || "—"}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {p.customer_email || "—"}
                  </div>
                </div>

                {/* Col 3: Method */}
                <div>
                  <MethodChip kind={methodKind(p.payment_method, (p as any).operator)} />
                </div>

                {/* Col 4: Status */}
                <div>
                  <Pill tone={statusTone(p.status)}>
                    {p.status.toLowerCase()}
                  </Pill>
                </div>

                {/* Col 5: Amount + currency (top) + Date (bottom) */}
                <div style={{ textAlign: "right" }}>
                  <div
                    className="display"
                    style={{
                      fontWeight: 500,
                      fontSize: 16,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {fmtXAF(p.amount)} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>{p.currency ?? "XAF"}</span>
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                  >
                    {fmtDate(p.created_at)} · {fmtTime(p.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </PageWrapper>
  );
}
