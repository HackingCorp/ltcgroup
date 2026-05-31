"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Avatar } from "@/components/ui/avatar";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Mock data (matches design reference)                               */
/* ------------------------------------------------------------------ */
interface MockTx {
  ref: string;
  merchantRef: string;
  amount: number;
  fee: number;
  method: string;
  status: "success" | "pending" | "failed" | "refunded";
  customer: string;
  phone: string;
  email: string;
  time: string;
  date: string;
}

const MOCK_TX: MockTx[] = [
  { ref: "PAY-9F4A2B7C", merchantRef: "ORDER-3041", amount: 75000, fee: 1125, method: "orange", status: "success", customer: "Jean-Pierre Mbarga", phone: "+237 670 12 34 56", email: "jpmbarga@email.cm", time: "il y a 4 min", date: "26 mai 2026 · 14:42" },
  { ref: "PAY-8E2D71AC", merchantRef: "ORDER-3040", amount: 12500, fee: 188, method: "mtn", status: "success", customer: "Awa Diop", phone: "+221 77 234 56 78", email: "awa.diop@email.sn", time: "il y a 11 min", date: "26 mai 2026 · 14:35" },
  { ref: "PAY-7C8B92F1", merchantRef: "ORDER-3039", amount: 350000, fee: 5250, method: "card", status: "pending", customer: "Société KILIMO SARL", phone: "+237 233 42 11 22", email: "contact@kilimo.cm", time: "il y a 18 min", date: "26 mai 2026 · 14:28" },
  { ref: "PAY-6A1D34B8", merchantRef: "ORDER-3038", amount: 8500, fee: 128, method: "wave", status: "success", customer: "Fatou Ndiaye", phone: "+221 77 891 23 45", email: "fatou.n@email.sn", time: "il y a 24 min", date: "26 mai 2026 · 14:22" },
  { ref: "PAY-5B7E81C2", merchantRef: "ORDER-3037", amount: 45000, fee: 675, method: "orange", status: "failed", customer: "Henri Talla", phone: "+237 695 33 22 11", email: "htalla@email.cm", time: "il y a 38 min", date: "26 mai 2026 · 14:08" },
  { ref: "PAY-4D9F22A6", merchantRef: "ORDER-3036", amount: 120000, fee: 1800, method: "mtn", status: "success", customer: "Marie-Claire Nkomo", phone: "+237 676 98 76 54", email: "mcnkomo@email.cm", time: "il y a 51 min", date: "26 mai 2026 · 13:55" },
  { ref: "PAY-3E1A55C9", merchantRef: "ORDER-3035", amount: 24500, fee: 368, method: "orange", status: "success", customer: "Atangana Boutique", phone: "+237 691 23 45 67", email: "info@atangana.cm", time: "il y a 1 h", date: "26 mai 2026 · 13:42" },
  { ref: "PAY-2F8B71D4", merchantRef: "ORDER-3034", amount: 67000, fee: 1005, method: "card", status: "success", customer: "Restaurant Le Baobab", phone: "+237 233 41 22 33", email: "resto@baobab.cm", time: "il y a 2 h", date: "26 mai 2026 · 12:38" },
  { ref: "PAY-1A4C82E7", merchantRef: "ORDER-3033", amount: 15000, fee: 225, method: "wave", status: "refunded", customer: "Cabinet Atangana", phone: "+225 07 89 12 34", email: "cab.atangana@email.ci", time: "il y a 3 h", date: "26 mai 2026 · 11:22" },
];

/* ------------------------------------------------------------------ */
/*  Status filter config                                               */
/* ------------------------------------------------------------------ */
type FilterKey = "" | "success" | "pending" | "failed" | "refunded";
const STATUS_FILTERS: { key: FilterKey; fr: string; en: string }[] = [
  { key: "", fr: "Tous", en: "All" },
  { key: "success", fr: "Réussi", en: "Paid" },
  { key: "pending", fr: "En attente", en: "Pending" },
  { key: "failed", fr: "Échoué", en: "Failed" },
];

function statusTone(s: string): "success" | "warn" | "fail" | "neutral" {
  if (s === "success") return "success";
  if (s === "pending") return "warn";
  if (s === "failed") return "fail";
  return "neutral";
}

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
/*  Timeline component for the detail panel                            */
/* ------------------------------------------------------------------ */
function Timeline({ tx }: { tx: MockTx }) {
  const events =
    tx.status === "success"
      ? [
          { fr: "Paiement créé", en: "Payment created", ts: "14:42:03" },
          {
            fr: tx.method === "orange" ? "Redirection Orange Money" : tx.method === "mtn" ? "Redirection MTN MoMo" : tx.method === "wave" ? "Redirection Wave" : "Redirection paiement carte",
            en: tx.method === "orange" ? "Orange Money redirect" : tx.method === "mtn" ? "MTN MoMo redirect" : tx.method === "wave" ? "Wave redirect" : "Card payment redirect",
            ts: "14:42:08",
          },
          { fr: "OTP saisi par client", en: "OTP entered by customer", ts: "14:42:31" },
          { fr: "Callback TouchPay HMAC", en: "TouchPay HMAC callback", ts: "14:42:34" },
          { fr: "Webhook merchant 200 OK", en: "Merchant webhook 200 OK", ts: "14:42:35 · 142ms" },
        ]
      : tx.status === "pending"
        ? [
            { fr: "Paiement créé", en: "Payment created", ts: "14:28:03" },
            { fr: "Redirection paiement", en: "Payment redirect", ts: "14:28:08" },
            { fr: "En attente de confirmation…", en: "Awaiting confirmation…", ts: "" },
          ]
        : tx.status === "refunded"
          ? [
              { fr: "Paiement créé", en: "Payment created", ts: "11:22:03" },
              { fr: "Paiement validé", en: "Payment validated", ts: "11:22:31" },
              { fr: "Remboursement initié", en: "Refund initiated", ts: "12:01:15" },
              { fr: "Remboursement confirmé", en: "Refund confirmed", ts: "12:01:42" },
            ]
          : [
              { fr: "Paiement créé", en: "Payment created", ts: "14:08:03" },
              { fr: "Redirection Orange Money", en: "Orange Money redirect", ts: "14:08:08" },
              { fr: "Échec — solde insuffisant", en: "Failed — insufficient balance", ts: "14:08:31" },
            ];

  const dotColor =
    tx.status === "success" ? "var(--success)" : tx.status === "pending" ? "var(--warning)" : tx.status === "refunded" ? "var(--muted)" : "var(--danger)";

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
function DetailPanel({ tx, onClose }: { tx: MockTx; onClose: () => void }) {
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
            {tx.ref}
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
          {fmtXAF(tx.amount)}
        </div>

        {/* Status + Method row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          <Pill tone={statusTone(tx.status)}>
            {tx.status === "success" ? (
              <T fr="payé" en="paid" />
            ) : tx.status === "pending" ? (
              <T fr="attente" en="pending" />
            ) : tx.status === "refunded" ? (
              <T fr="remb." en="refund" />
            ) : (
              <T fr="échoué" en="failed" />
            )}
          </Pill>
          <MethodChip kind={tx.method} />
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
            [<T key="n" fr="Nom" en="Name" />, tx.customer],
            [<T key="p" fr="Téléphone" en="Phone" />, tx.phone],
            ["Email", tx.email],
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
            [<T key="mr" fr="Référence marchand" en="Merchant ref" />, tx.merchantRef],
            [<T key="gb" fr="Montant brut" en="Gross amount" />, fmtXAF(tx.amount)],
            [<T key="fe" fr="Frais LtcPay (1,5%)" en="LtcPay fee (1.5%)" />, "−" + fmtXAF(tx.fee)],
            [<T key="ne" fr="Net reçu" en="Net received" />, fmtXAF(tx.amount - tx.fee)],
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
          <Timeline tx={tx} />
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
  const [selected, setSelected] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  /* Filter transactions */
  const filtered = MOCK_TX.filter((tx) => {
    if (statusFilter && tx.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        tx.ref.toLowerCase().includes(q) ||
        tx.merchantRef.toLowerCase().includes(q) ||
        tx.customer.toLowerCase().includes(q) ||
        tx.phone.includes(q) ||
        tx.email.toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
      );
    }
    return true;
  });

  const totalPages = 139; // mock
  const totalResults = 1247; // mock
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Encaissement" en="Collect" />,
        <T key="c2" fr="Transactions" en="Transactions" />,
      ]}
      title={<T fr="Transactions" en="Transactions" />}
      sub={
        <T
          fr={`${totalResults.toLocaleString("fr-FR")} résultats · 7 derniers jours`}
          en={`${totalResults.toLocaleString("en-US")} results · last 7 days`}
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

      {/* Two-panel layout: table + detail panel */}
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
            {filtered.map((tx, i) => (
              <div
                key={tx.ref}
                className={`row clickable${selected === i ? " selected" : ""}`}
                style={{
                  gridTemplateColumns: "1.1fr 1.3fr 0.9fr 0.8fr 1fr 0.7fr 24px",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(selected === i ? null : i)}
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
                    tone={statusTone(tx.status)}
                  >
                    {tx.status === "success" ? (
                      <T fr="payé" en="paid" />
                    ) : tx.status === "pending" ? (
                      <T fr="attente" en="pending" />
                    ) : tx.status === "refunded" ? (
                      <T fr="remb." en="refund" />
                    ) : (
                      <T fr="échoué" en="failed" />
                    )}
                  </Pill>
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right" }}>
                  <div className="display" style={{ fontWeight: 500, fontSize: 15 }}>
                    {fmtXAF(tx.amount)}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
                  >
                    −{fmtXAF(tx.fee)}
                  </div>
                </div>

                {/* Date */}
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}
                >
                  {tx.time}
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

      {/* Right: detail side panel (fixed overlay) */}
      {selected !== null && filtered[selected] && (
        <DetailPanel tx={filtered[selected]} onClose={() => setSelected(null)} />
      )}
    </PageWrapper>
  );
}
