"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

function methodKind(m?: string): string {
  if (!m) return "card";
  const lower = m.toLowerCase();
  if (lower.includes("orange") || lower.includes("om")) return "orange";
  if (lower.includes("mtn") || lower.includes("momo")) return "mtn";
  if (lower.includes("wave")) return "wave";
  return "card";
}

function statusTone(s: string): "success" | "warn" | "fail" | "neutral" {
  if (s === "completed") return "success";
  if (s === "pending") return "warn";
  if (s === "failed" || s === "expired" || s === "cancelled") return "fail";
  return "neutral";
}

/* ── Mock data (charts & alerts only) ──────────────────────── */

const REV_30 = [
  42, 48, 51, 47, 55, 62, 58, 71, 68, 75, 82, 79, 88, 95, 92, 105, 112, 108,
  122, 135, 128, 142, 158, 165, 172, 180, 195, 208, 215, 232,
];

const METHOD_MIX = [
  { name: "Orange Money", color: "var(--orange-money)", pct: 48 },
  { name: "MTN MoMo", color: "var(--mtn)", pct: 31 },
  { nameFr: "Cartes", nameEn: "Cards", color: "var(--ink)", pct: 14 },
  { name: "Wave", color: "var(--wave)", pct: 7 },
];

/* ── SVG charts ─────────────────────────────────────────────── */

function RevenueChartSVG() {
  const w = 700, h = 220, pad = 24;
  const max = Math.max(...REV_30) * 1.1;
  const step = (w - pad * 2) / (REV_30.length - 1);
  const pts = REV_30.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;

  // Previous period (offset down + shifted)
  const prev = REV_30.map((v) => v * 0.75 + Math.random() * 10);
  const maxP = Math.max(...prev) * 1.1;
  const ptsP = prev.map((v, i) => [pad + i * step, h - pad - (v / maxP) * (h - pad * 2)]);
  const pathP = ptsP.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={area} fill="var(--primary)" opacity="0.08" />
      <path d={pathP} fill="none" stroke="var(--line-2)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MethodDonutSVG() {
  const size = 120;
  const cx = size / 2, cy = size / 2, r = 44, sw = 16;
  const data = [48, 31, 14, 7];
  const colors = ["var(--orange-money)", "var(--mtn)", "var(--ink)", "var(--wave)"];
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = data.map((pct, i) => {
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
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, fill: "var(--ink)" }}>4</text>
      <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>methods</text>
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────── */

export default function MerchantDashboardPage() {
  const [withdraw, setWithdraw] = useState(false);
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

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Encaissement" en="Collect" />,
        <T key="c2" fr="Vue d'ensemble" en="Overview" />,
      ]}
      title={
        <T
          fr={`Aujourd'hui, vous avez encaissé ${fmtXAF(stats?.total_revenue ?? 0)}`}
          en={`Today, you collected ${fmtXAF(stats?.total_revenue ?? 0)}`}
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
              onClick={() => setWithdraw(true)}
            >
              <T fr="Retirer" en="Withdraw" />
            </button>
          </div>
        </KpiCard>

        {/* Volume 7j */}
        <KpiCard
          label={<T fr="Volume 7j" en="7d volume" />}
          value={fmtXAF(stats?.total_revenue ?? 0)}
        >
          <div style={{ marginTop: 8, marginBottom: -4 }}>
            <Sparkline data={REV_30.slice(-14)} width={220} height={36} />
          </div>
        </KpiCard>

        {/* Transactions */}
        <KpiCard
          label={<T fr="Transactions" en="Transactions" />}
          value={String(stats?.total_payments ?? 0)}
        >
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            <T
              fr={`Total transactions : ${stats?.total_transactions ?? 0}`}
              en={`Total transactions: ${stats?.total_transactions ?? 0}`}
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
        <div className="card">
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
          <RevenueChartSVG />
        </div>

        {/* Method mix donut */}
        <div className="card">
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
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <MethodDonutSVG />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {METHOD_MIX.map((m, i) => (
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
                      background: m.color,
                    }}
                  />
                  <span style={{ flex: 1 }}>
                    {m.nameFr ? (
                      <T fr={m.nameFr} en={m.nameEn} />
                    ) : (
                      m.name
                    )}
                  </span>
                  <span className="mono" style={{ color: "var(--muted)" }}>
                    {m.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent transactions ───────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
                  gridTemplateColumns: "1.2fr 1.4fr 0.9fr 0.8fr 1fr 24px",
                }}
              >
                {/* Reference */}
                <div>
                  <div className="mono" style={{ fontSize: 12 }}>
                    {p.reference}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                  >
                    {fmtDate(p.created_at)}
                  </div>
                </div>

                {/* Customer */}
                <div>
                  <div style={{ fontSize: 13 }}>
                    {p.customer_email || p.customer_phone || "—"}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                  >
                    {p.customer_phone || ""}
                  </div>
                </div>

                {/* Method */}
                <div>
                  <MethodChip kind={methodKind(p.payment_method)} />
                </div>

                {/* Status */}
                <div>
                  <Pill tone={statusTone(p.status)}>
                    {p.status === "completed" ? (
                      <T fr="payé" en="paid" />
                    ) : p.status === "pending" ? (
                      <T fr="attente" en="pending" />
                    ) : p.status === "expired" ? (
                      <T fr="expiré" en="expired" />
                    ) : p.status === "cancelled" ? (
                      <T fr="annulé" en="cancelled" />
                    ) : (
                      <T fr="échoué" en="failed" />
                    )}
                  </Pill>
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right" }}>
                  <div
                    className="display"
                    style={{
                      fontWeight: 500,
                      fontSize: 16,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {fmtXAF(p.amount)}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                  >
                    {p.currency ?? "XAF"} · {fmtTime(p.created_at)}
                  </div>
                </div>

                {/* Chevron */}
                <Icon name="chevR" size={14} color="var(--muted)" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Alert cards ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 12,
        }}
      >
        {/* Pending payments alert */}
        <div className="card" style={{ borderLeft: "3px solid var(--warn)" }}>
          <div
            style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--warn-soft)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="alert" size={16} color="var(--warn)" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontWeight: 500 }}>
                <T
                  fr="3 paiements en attente > 10 min"
                  en="3 payments pending > 10 min"
                />
              </strong>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                <T
                  fr="PAY-7C8B92F1, PAY-3B12C9D4, PAY-5E91A2B7. OTP non confirmé."
                  en="PAY-7C8B92F1, PAY-3B12C9D4, PAY-5E91A2B7. OTP not confirmed."
                />
              </p>
            </div>
            <button className="btn btn-ghost btn-sm">
              <T fr="Inspecter" en="Inspect" />
            </button>
          </div>
        </div>

        {/* Security alert */}
        <div className="card" style={{ borderLeft: "3px solid var(--primary)" }}>
          <div
            style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--primary-faint)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="shield" size={16} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontWeight: 500 }}>
                <T
                  fr="2 nouvelles IPs sur votre clé API"
                  en="2 new IPs on your API key"
                />
              </strong>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                41.202.x.x (Douala), 154.0.x.x (Yaoundé).{" "}
                <T
                  fr="Faites tourner si ce n'est pas vous."
                  en="Rotate if it isn't you."
                />
              </p>
            </div>
            <button className="btn btn-ghost btn-sm">
              <T fr="Détails" en="Details" />
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
