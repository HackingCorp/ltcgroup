"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF, fmtDate, fmtTime } from "@/lib/format";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/types";

function statusTone(s: string): "success" | "warn" | "fail" | "neutral" {
  const lower = s.toLowerCase();
  if (lower === "completed") return "success";
  if (lower === "pending" || lower === "processing") return "warn";
  if (lower === "failed" || lower === "expired" || lower === "cancelled") return "fail";
  return "neutral";
}

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

export default function PaymentDetailPage() {
  const params = useParams();
  const reference = params.reference as string;
  const { lang } = useLang();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) return;
    async function load() {
      try {
        const p = await merchantDashboardService.getPayment(reference);
        setPayment(p);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reference]);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 256 }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  if (!payment) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Encaissement" en="Collect" />, <T key="c2" fr="Transactions" en="Transactions" />]}
        title={<T fr="Paiement introuvable" en="Payment not found" />}
      >
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Icon name="alert" size={32} color="var(--muted)" />
          <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 14 }}>
            <T fr="Ce paiement n'existe pas ou a été supprimé." en="This payment does not exist or has been removed." />
          </p>
          <Link href="/merchant/dashboard/payments" className="btn btn-ghost btn-sm" style={{ marginTop: 16, textDecoration: "none" }}>
            <Icon name="arrowL" size={13} /> <T fr="Retour aux transactions" en="Back to transactions" />
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const feeEstimate = Math.round(payment.amount * 0.03);
  const netEstimate = payment.amount - feeEstimate;

  const timeline = [
    {
      label: lang === "en" ? "Payment created" : "Paiement créé",
      time: payment.created_at,
      icon: "plus" as const,
      done: true,
    },
    {
      label: lang === "en" ? "Processing" : "En traitement",
      time: payment.created_at,
      icon: "refresh" as const,
      done: payment.status !== "pending",
    },
    {
      label: payment.status === "completed"
        ? (lang === "en" ? "Payment succeeded" : "Paiement réussi")
        : payment.status === "failed"
        ? (lang === "en" ? "Payment failed" : "Paiement échoué")
        : (lang === "en" ? "Awaiting completion" : "En attente"),
      time: payment.updated_at,
      icon: payment.status === "completed" ? "check" as const : payment.status === "failed" ? "x" as const : "clock" as const,
      done: payment.status === "completed" || payment.status === "failed",
    },
  ];

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Encaissement" en="Collect" />,
        <T key="c2" fr="Transactions" en="Transactions" />,
        <span key="c3">{payment.reference}</span>,
      ]}
      title={<T fr="Détail du paiement" en="Payment detail" />}
      actions={
        <Link href="/merchant/dashboard/payments" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
          <Icon name="arrowL" size={13} /> <T fr="Retour" en="Back" />
        </Link>
      }
    >
      {/* Hero amount + status */}
      <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
        <Pill tone={statusTone(payment.status)}>{payment.status.toUpperCase()}</Pill>
        <div className="display" style={{ fontSize: 40, fontWeight: 600, margin: "12px 0 4px", letterSpacing: -1 }}>
          {formatCurrency(payment.amount, payment.currency)}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {payment.reference} {"·"} {fmtDate(payment.created_at)} {"·"} {fmtTime(payment.created_at)}
        </div>
        {payment.payment_method && (
          <div style={{ marginTop: 12, display: "inline-block" }}>
            <MethodChip kind={methodKind(payment.payment_method, (payment as any).operator)} label={payment.payment_method} />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        {/* Customer info */}
        <div className="card">
          <div className="card-head">
            <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="user" size={15} /> <T fr="Client" en="Customer" />
            </h3>
          </div>
          <div style={{ padding: "12px 18px" }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <T fr="Email" en="Email" />
                </div>
                <div style={{ fontSize: 14 }}>{payment.customer_email || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <T fr="Téléphone" en="Phone" />
                </div>
                <div style={{ fontSize: 14 }}>{payment.customer_phone || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <T fr="Description" en="Description" />
                </div>
                <div style={{ fontSize: 14 }}>{payment.description || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment details */}
        <div className="card">
          <div className="card-head">
            <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="receipt" size={15} /> <T fr="Détail financier" en="Financial detail" />
            </h3>
          </div>
          <div style={{ padding: "12px 18px" }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}><T fr="Montant brut" en="Gross amount" /></span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(payment.amount, payment.currency)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}><T fr="Frais (3%)" en="Fees (3%)" /></span>
                <span style={{ color: "var(--rose, #e74c3c)" }}>{"−"} {formatCurrency(feeEstimate, payment.currency)}</span>
              </div>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}><T fr="Net" en="Net" /></span>
                <span className="display" style={{ fontWeight: 600, fontSize: 16 }}>{formatCurrency(netEstimate, payment.currency)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}><T fr="Devise" en="Currency" /></span>
                <span>{payment.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head">
          <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="clock" size={15} /> <T fr="Chronologie" en="Timeline" />
          </h3>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {timeline.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative", paddingBottom: i < timeline.length - 1 ? 20 : 0 }}>
              {/* Vertical line */}
              {i < timeline.length - 1 && (
                <div style={{
                  position: "absolute",
                  left: 11,
                  top: 24,
                  bottom: 0,
                  width: 1,
                  background: step.done ? "var(--primary)" : "var(--line)",
                }} />
              )}
              {/* Dot */}
              <div style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                background: step.done ? "var(--primary)" : "var(--surface)",
                border: step.done ? "none" : "1.5px solid var(--line)",
              }}>
                <Icon name={step.icon} size={12} color={step.done ? "white" : "var(--muted)"} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: step.done ? 500 : 400, color: step.done ? "var(--ink)" : "var(--muted)" }}>
                  {step.label}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {fmtDate(step.time)} {"·"} {fmtTime(step.time)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      {payment.metadata && Object.keys(payment.metadata).length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-head">
            <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="code" size={15} /> <T fr="Métadonnées" en="Metadata" />
            </h3>
          </div>
          <div style={{ padding: "12px 18px" }}>
            <pre style={{ fontSize: 12, background: "var(--bg-2)", padding: 12, borderRadius: 8, overflow: "auto", margin: 0, color: "var(--ink)" }}>
              {JSON.stringify(payment.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
