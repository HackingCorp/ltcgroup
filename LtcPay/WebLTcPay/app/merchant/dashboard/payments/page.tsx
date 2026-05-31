"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T, useLang } from "@/lib/i18n";
import { fmtDate, fmtTime } from "@/lib/format";
import { formatCurrency } from "@/lib/utils";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import type { Payment, PaginatedResponse } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Status filter config                                               */
/* ------------------------------------------------------------------ */
const STATUS_FILTERS: { key: string; fr: string; en: string; tone: string }[] = [
  { key: "", fr: "Tous", en: "All", tone: "info" },
  { key: "COMPLETED", fr: "Réussi", en: "Paid", tone: "success" },
  { key: "PENDING", fr: "En attente", en: "Pending", tone: "warn" },
  { key: "FAILED", fr: "Échoué", en: "Failed", tone: "fail" },
];

/* ------------------------------------------------------------------ */
/*  Pagination helpers                                                 */
/* ------------------------------------------------------------------ */
function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, "...", total);
  } else if (current >= total - 3) {
    pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }
  return pages;
}

/* ------------------------------------------------------------------ */
/*  Timeline component for the detail panel (static/mock)              */
/* ------------------------------------------------------------------ */
function Timeline({ payment }: { payment: Payment }) {
  const kind = methodKind(payment.payment_method, (payment as any).operator);
  const events =
    payment.status === "completed"
      ? [
          { fr: "Paiement créé", en: "Payment created", ts: fmtTime(payment.created_at) },
          {
            fr: kind === "orange" ? "Redirection Orange Money" : kind === "mtn" ? "Redirection MTN MoMo" : kind === "wave" ? "Redirection Wave" : "Redirection paiement carte",
            en: kind === "orange" ? "Orange Money redirect" : kind === "mtn" ? "MTN MoMo redirect" : kind === "wave" ? "Wave redirect" : "Card payment redirect",
            ts: "",
          },
          { fr: "OTP saisi par client", en: "OTP entered by customer", ts: "" },
          { fr: "Callback TouchPay HMAC", en: "TouchPay HMAC callback", ts: "" },
          { fr: "Webhook merchant 200 OK", en: "Merchant webhook 200 OK", ts: "" },
        ]
      : payment.status === "pending"
        ? [
            { fr: "Paiement créé", en: "Payment created", ts: fmtTime(payment.created_at) },
            { fr: "Redirection paiement", en: "Payment redirect", ts: "" },
            { fr: "En attente de confirmation…", en: "Awaiting confirmation…", ts: "" },
          ]
        : [
            { fr: "Paiement créé", en: "Payment created", ts: fmtTime(payment.created_at) },
            {
              fr: kind === "orange" ? "Redirection Orange Money" : kind === "mtn" ? "Redirection MTN MoMo" : "Redirection paiement",
              en: kind === "orange" ? "Orange Money redirect" : kind === "mtn" ? "MTN MoMo redirect" : "Payment redirect",
              ts: "",
            },
            { fr: "Échec — solde insuffisant", en: "Failed — insufficient balance", ts: "" },
          ];

  const dotColor =
    payment.status === "completed" ? "var(--success)" : payment.status === "pending" ? "var(--warning)" : "var(--danger)";

  return (
    <div style={{ paddingLeft: 20, position: "relative" }}>
      <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 1, background: "var(--line)" }} />
      {events.map((ev, k) => (
        <div key={k} style={{ position: "relative", marginBottom: 12 }}>
          <div
            style={{
              position: "absolute",
              left: -20,
              top: 5,
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: dotColor,
            }}
          />
          <div style={{ fontSize: 12 }}>
            <T fr={`${ev.fr}${ev.ts ? ` · ${ev.ts}` : ""}`} en={`${ev.en}${ev.ts ? ` · ${ev.ts}` : ""}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail side panel                                                  */
/* ------------------------------------------------------------------ */
function DetailPanel({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const customer = payment.customer_email || payment.customer_phone || "—";
  const kind = methodKind(payment.payment_method, (payment as any).operator);

  return (
    <div
      style={{
        position: "fixed",
        top: 56,
        right: 0,
        bottom: 0,
        width: 460,
        background: "var(--surface)",
        borderLeft: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 100,
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <T fr="Détail" en="Detail" />
          </div>
          <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>
            {payment.reference}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            appearance: "none",
            border: 0,
            background: "var(--bg-2)",
            width: 28,
            height: 28,
            borderRadius: 6,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 24 }}>
        {/* Large amount */}
        <div
          className="display"
          style={{
            fontWeight: 500,
            fontSize: 48,
            letterSpacing: "-0.025em",
            lineHeight: 1,
            marginBottom: 12,
          }}
        >
          {formatCurrency(payment.amount, payment.currency)}
        </div>

        {/* Status + Method row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          <Pill tone={statusTone(payment.status)}>
            {payment.status === "completed" ? (
              <T fr="payé" en="paid" />
            ) : payment.status === "pending" ? (
              <T fr="attente" en="pending" />
            ) : payment.status === "expired" ? (
              <T fr="expiré" en="expired" />
            ) : payment.status === "cancelled" ? (
              <T fr="annulé" en="cancelled" />
            ) : (
              <T fr="échoué" en="failed" />
            )}
          </Pill>
          <MethodChip kind={kind} />
        </div>

        {/* Customer section */}
        <div style={{ padding: "16px 0" }}>
          <h4
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              margin: "0 0 12px",
            }}
          >
            <T fr="Client" en="Customer" />
          </h4>
          {[
            [<T key="p" fr="Téléphone" en="Phone" />, payment.customer_phone || "—"],
            ["Email", payment.customer_email || "—"],
          ].map((r, k) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--muted)" }}>{r[0]}</span>
              <span className="mono">{r[1]}</span>
            </div>
          ))}
        </div>

        {/* Details section */}
        <div style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}>
          <h4
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              margin: "0 0 12px",
            }}
          >
            <T fr="Détails" en="Details" />
          </h4>
          {[
            [<T key="ref" fr="Référence" en="Reference" />, payment.reference],
            [<T key="gb" fr="Montant" en="Amount" />, formatCurrency(payment.amount, payment.currency)],
            [<T key="cur" fr="Devise" en="Currency" />, payment.currency],
            ...(payment.description ? [[<T key="desc" fr="Description" en="Description" />, payment.description]] : []),
            [<T key="cr" fr="Créé le" en="Created" />, fmtDate(payment.created_at)],
            [<T key="up" fr="Mis à jour" en="Updated" />, fmtDate(payment.updated_at)],
          ].map((r, k) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--muted)" }}>{r[0]}</span>
              <span className="mono">{r[1]}</span>
            </div>
          ))}
        </div>

        {/* Timeline section */}
        <div style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}>
          <h4
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              margin: "0 0 14px",
            }}
          >
            <T fr="Chronologie" en="Timeline" />
          </h4>
          <Timeline payment={payment} />
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 8,
        }}
      >
        <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>
          <Icon name="download" size={13} /> PDF
        </button>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>
          <Icon name="refresh" size={13} /> Webhook
        </button>
        <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: "center" }}>
          <T fr="Rembourser" en="Refund" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */
export default function MerchantPaymentsPage() {
  const { lang } = useLang();
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Payment> | null>(null);
  const [loading, setLoading] = useState(true);

  /* Fetch payments from API */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    merchantDashboardService
      .getPayments({
        page: currentPage,
        page_size: 20,
        status: statusFilter || undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, statusFilter]);

  /* Keyboard shortcut: Cmd+K focuses search */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      const input = document.getElementById("tx-search") as HTMLInputElement | null;
      input?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* Client-side search filter on loaded items */
  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!search) return data.items;
    const q = search.toLowerCase();
    return data.items.filter((p) =>
      p.reference.toLowerCase().includes(q) ||
      (p.customer_email && p.customer_email.toLowerCase().includes(q)) ||
      (p.customer_phone && p.customer_phone.includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      String(p.amount).includes(q)
    );
  }, [data, search]);

  const totalPages = data?.total_pages ?? 1;
  const totalResults = data?.total ?? 0;
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  /* Find selected payment object */
  const selectedPayment = selected ? filtered.find((p) => p.reference === selected) ?? null : null;

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Encaissement" en="Collect" />,
        <T key="c2" fr="Transactions" en="Transactions" />,
      ]}
      title={<T fr="Transactions" en="Transactions" />}
      sub={
        <T
          fr={`${totalResults.toLocaleString("fr-FR")} résultats`}
          en={`${totalResults.toLocaleString("en-US")} results`}
        />
      }
      actions={
        <>
          <button className="btn btn-ghost btn-sm">
            <Icon name="filter" size={13} /> <T fr="Filtres" en="Filters" />
          </button>
          <button className="btn btn-ghost btn-sm">
            <Icon name="download" size={13} /> CSV
          </button>
        </>
      }
    >
      {/* Search bar + status filter pills */}
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 240,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            background: "var(--bg-2)",
            borderRadius: 6,
          }}
        >
          <Icon name="search" size={14} color="var(--muted)" />
          <input
            id="tx-search"
            className="input"
            style={{ border: 0, padding: 0, background: "transparent" }}
            placeholder={
              lang === "en"
                ? "reference, email, phone, amount…"
                : "référence, email, téléphone, montant…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="kbd-pill">⌘K</span>
        </div>
        {STATUS_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => {
              setStatusFilter(sf.key);
              setCurrentPage(1);
              setSelected(null);
            }}
            style={{ cursor: "pointer" }}
          >
            <Pill
              tone={statusFilter === sf.key ? "info" : "neutral"}
              plain
            >
              {lang === "en" ? sf.en : sf.fr}
            </Pill>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          className="card"
          style={{
            padding: "64px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid var(--line)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            <T fr="Chargement des transactions…" en="Loading transactions…" />
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          className="card"
          style={{
            padding: "64px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icon name="inbox" size={40} color="var(--muted)" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            <T fr="Aucune transaction" en="No transactions" />
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {search ? (
              <T fr="Aucun résultat pour cette recherche" en="No results match your search" />
            ) : statusFilter ? (
              <T fr="Aucune transaction avec ce statut" en="No transactions with this status" />
            ) : (
              <T fr="Les transactions apparaîtront ici" en="Transactions will appear here" />
            )}
          </span>
        </div>
      )}

      {/* Two-panel layout: table + detail panel */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", gap: 0 }}>
          {/* Left: transaction table */}
          <div className="card" style={{ padding: 0, overflow: "hidden", flex: "1 1 0%", minWidth: 0 }}>
            <div className="tbl">
              {/* Header row */}
              <div
                className="row head"
                style={{
                  gridTemplateColumns: "1.1fr 1.3fr 0.9fr 0.8fr 1fr 0.7fr 24px",
                }}
              >
                <span>
                  <T fr="Référence" en="Reference" />
                </span>
                <span>
                  <T fr="Client" en="Customer" />
                </span>
                <span>
                  <T fr="Méthode" en="Method" />
                </span>
                <span>
                  <T fr="Statut" en="Status" />
                </span>
                <span style={{ textAlign: "right" }}>
                  <T fr="Montant" en="Amount" />
                </span>
                <span style={{ textAlign: "right" }}>
                  <T fr="Date" en="Date" />
                </span>
                <span />
              </div>

              {/* Data rows */}
              {filtered.map((p) => (
                <div
                  key={p.reference}
                  className={`row clickable${selected === p.reference ? " selected" : ""}`}
                  style={{
                    gridTemplateColumns: "1.1fr 1.3fr 0.9fr 0.8fr 1fr 0.7fr 24px",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelected(selected === p.reference ? null : p.reference)}
                >
                  {/* Reference */}
                  <div>
                    <div className="mono" style={{ fontSize: 12 }}>
                      {p.reference}
                    </div>
                  </div>

                  {/* Customer */}
                  <div>
                    <div style={{ fontSize: 13 }}>
                      {p.customer_email || p.customer_phone || "—"}
                    </div>
                    {p.customer_email && p.customer_phone && (
                      <div
                        className="mono"
                        style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                      >
                        {p.customer_phone}
                      </div>
                    )}
                  </div>

                  {/* Method */}
                  <div>
                    <MethodChip kind={methodKind(p.payment_method, (p as any).operator)} />
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
                    <div className="display" style={{ fontWeight: 500, fontSize: 15 }}>
                      {formatCurrency(p.amount, p.currency)}
                    </div>
                  </div>

                  {/* Date */}
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}
                  >
                    {fmtDate(p.created_at)}
                  </div>

                  {/* Chevron */}
                  <Icon name="chevR" size={14} color="var(--muted)" />
                </div>
              ))}
            </div>

            {/* Numbered pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                borderTop: "1px solid var(--line)",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <span>
                <T
                  fr={`Page ${currentPage} sur ${totalPages} · ${totalResults.toLocaleString("fr-FR")} transactions`}
                  en={`Page ${currentPage} of ${totalPages} · ${totalResults.toLocaleString("en-US")} transactions`}
                />
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {/* Previous */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  style={{
                    appearance: "none",
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    color: currentPage <= 1 ? "var(--muted)" : "var(--ink)",
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    cursor: currentPage <= 1 ? "default" : "pointer",
                  }}
                >
                  {"‹"}
                </button>

                {/* Page numbers */}
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      style={{
                        width: 28,
                        height: 28,
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      {"…"}
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      style={{
                        appearance: "none",
                        border: "1px solid var(--line)",
                        background: p === currentPage ? "var(--ink)" : "var(--surface)",
                        color: p === currentPage ? "white" : "var(--ink)",
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  style={{
                    appearance: "none",
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    color: currentPage >= totalPages ? "var(--muted)" : "var(--ink)",
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    cursor: currentPage >= totalPages ? "default" : "pointer",
                  }}
                >
                  {"›"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right: detail side panel (fixed overlay) */}
      {selectedPayment && (
        <DetailPanel payment={selectedPayment} onClose={() => setSelected(null)} />
      )}
    </PageWrapper>
  );
}
