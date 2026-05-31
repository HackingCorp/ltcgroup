"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sparkline } from "@/components/ui/sparkline";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";

/* ── Mock data ──────────────────────────────────────────────── */

const REV_30 = [
  42, 48, 51, 47, 55, 62, 58, 71, 68, 75, 82, 79, 88, 95, 92, 105, 112, 108,
  122, 135, 128, 142, 158, 165, 172, 180, 195, 208, 215, 232,
];

const MOCK_TX = [
  { ref: "PAY-9F4A2B7C", merchantRef: "ORDER-3041", amount: 75000, fee: 1125, method: "orange", status: "success", customer: "Jean-Pierre Mbarga", phone: "+237 670 12 34 56", date: "2026-05-26T14:42:00" },
  { ref: "PAY-8E2D71AC", merchantRef: "ORDER-3040", amount: 12500, fee: 188, method: "mtn", status: "success", customer: "Awa Diop", phone: "+221 77 234 56 78", date: "2026-05-26T14:35:00" },
  { ref: "PAY-7C8B92F1", merchantRef: "ORDER-3039", amount: 350000, fee: 5250, method: "card", status: "pending", customer: "Societe KILIMO SARL", phone: "+237 233 42 11 22", date: "2026-05-26T14:28:00" },
  { ref: "PAY-6A1D34B8", merchantRef: "ORDER-3038", amount: 8500, fee: 128, method: "wave", status: "success", customer: "Fatou Ndiaye", phone: "+221 77 891 23 45", date: "2026-05-26T14:22:00" },
  { ref: "PAY-5B7E81C2", merchantRef: "ORDER-3037", amount: 45000, fee: 675, method: "orange", status: "failed", customer: "Henri Talla", phone: "+237 695 33 22 11", date: "2026-05-26T14:08:00" },
  { ref: "PAY-4D9F22A6", merchantRef: "ORDER-3036", amount: 120000, fee: 1800, method: "mtn", status: "success", customer: "Marie-Claire Nkomo", phone: "+237 676 98 76 54", date: "2026-05-26T13:55:00" },
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

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Encaissement" en="Collect" />,
        <T key="c2" fr="Vue d'ensemble" en="Overview" />,
      ]}
      title={
        <T
          fr="Aujourd'hui, vous avez encaisse 847 250 F"
          en="Today, you collected 847,250 F"
        />
      }
      sub={
        <T
          fr="Solde temps reel \u00b7 reglement programme demain"
          en="Live balance \u00b7 settlement scheduled tomorrow"
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
            <T fr="Creer un paiement" en="Create payment" />
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
        {/* Hero — Balance a regler */}
        <KpiCard
          hero
          label={
            <>
              <T fr="Solde disponible" en="Available balance" /> {"\u00b7"} XAF
            </>
          }
          after={<Icon name="eye" size={13} color="rgba(255,255,255,0.4)" />}
          value="12 482 615"
          unit="F"
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
              <T fr="Prochain reglement : demain" en="Next payout: tomorrow" />
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
          value="5,2"
          unit="M F"
          delta="+18,4%"
        >
          <div style={{ marginTop: 8, marginBottom: -4 }}>
            <Sparkline data={REV_30.slice(-14)} width={220} height={36} />
          </div>
        </KpiCard>

        {/* Transactions */}
        <KpiCard
          label={<T fr="Transactions" en="Transactions" />}
          value="1 247"
          delta="+12%"
        >
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            <T fr="Panier moyen 4 175 F" en="Avg basket 4,175 F" />
          </div>
        </KpiCard>

        {/* Taux de reussite */}
        <KpiCard
          label={<T fr="Taux de reussite" en="Success rate" />}
          value="94,8"
          unit="%"
          delta={"\u22120,3 pt"}
          deltaDir="down"
        >
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            <T fr="Echecs : 65 (5,2%)" en="Failed: 65 (5.2%)" />
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
                  fr="F CFA encaisses par jour, frais deduits."
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
                <T fr="Encaisse" en="Collected" />
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
                <T fr="Periode precedente" en="Previous period" />
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
            <T fr="Mix par methode" en="Method mix" />
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
              <T fr="Transactions recentes" en="Recent transactions" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Mise a jour en temps reel" en="Live updates" />
            </p>
          </div>
          <Link
            href="/merchant/dashboard/payments"
            className="btn btn-link"
            style={{ textDecoration: "none" }}
          >
            <T fr="Voir tout" en="View all" /> {"\u2192"}
          </Link>
        </div>

        <div className="tbl">
          {MOCK_TX.map((tx) => (
            <div
              className="row clickable"
              key={tx.ref}
              style={{
                gridTemplateColumns: "1.2fr 1.4fr 0.9fr 0.8fr 1fr 24px",
              }}
            >
              {/* Reference */}
              <div>
                <div className="mono" style={{ fontSize: 12 }}>
                  {tx.ref}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                >
                  {tx.merchantRef}
                </div>
              </div>

              {/* Customer */}
              <div>
                <div style={{ fontSize: 13 }}>{tx.customer}</div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                >
                  {tx.phone}
                </div>
              </div>

              {/* Method */}
              <div>
                <MethodChip kind={tx.method} />
              </div>

              {/* Status */}
              <div>
                <Pill
                  tone={
                    tx.status === "success"
                      ? "success"
                      : tx.status === "pending"
                      ? "warn"
                      : tx.status === "refunded"
                      ? "neutral"
                      : "fail"
                  }
                >
                  {tx.status === "success" ? (
                    <T fr="paye" en="paid" />
                  ) : tx.status === "pending" ? (
                    <T fr="attente" en="pending" />
                  ) : tx.status === "refunded" ? (
                    <T fr="remb." en="refund" />
                  ) : (
                    <T fr="echoue" en="failed" />
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
                  {fmtXAF(tx.amount)}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                >
                  <T fr="frais" en="fees" /> {fmtXAF(tx.fee)}
                </div>
              </div>

              {/* Chevron */}
              <Icon name="chevR" size={14} color="var(--muted)" />
            </div>
          ))}
        </div>
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
                  fr="PAY-7C8B92F1, PAY-3B12C9D4, PAY-5E91A2B7. OTP non confirme."
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
                  fr="2 nouvelles IPs sur votre cle API"
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
                41.202.x.x (Douala), 154.0.x.x (Yaounde).{" "}
                <T
                  fr="Faites tourner si ce n'est pas vous."
                  en="Rotate if it isn't you."
                />
              </p>
            </div>
            <button className="btn btn-ghost btn-sm">
              <T fr="Details" en="Details" />
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
