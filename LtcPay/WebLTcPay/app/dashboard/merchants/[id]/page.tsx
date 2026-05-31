"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmtDate, fmtCompact } from "@/lib/format";
import { merchantsService } from "@/services/merchants.service";
import type {
  MerchantBalanceInfo,
  MerchantPaymentItem,
  MerchantWithdrawalItem,
  PaginatedItems,
} from "@/services/merchants.service";
import type { Merchant } from "@/types";
import { formatCurrency } from "@/lib/utils";

/* ── helpers ───────────────────────────────────────────────── */

type Tab = "payments" | "withdrawals";

function paymentStatusTone(s: string): "success" | "warn" | "fail" | "neutral" {
  const upper = s.toUpperCase();
  if (upper === "COMPLETED") return "success";
  if (upper === "PENDING" || upper === "PROCESSING") return "warn";
  if (upper === "FAILED") return "fail";
  return "neutral";
}

function withdrawalStatusTone(s: string): "success" | "warn" | "fail" | "info" | "neutral" {
  if (s === "COMPLETED") return "success";
  if (s === "PENDING") return "warn";
  if (s === "APPROVED" || s === "PROCESSING") return "info";
  if (s === "REJECTED" || s === "FAILED") return "fail";
  return "neutral";
}

const PAYMENT_STATUSES = ["", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "EXPIRED", "CANCELLED"];
const WITHDRAWAL_STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED"];

/* ── mock recent transactions for design ───────────────────── */

const MOCK_RECENT_TX = [
  { ref: "PAY-1A4C82E7", customer: "Cabinet Atangana", method: "orange", status: "success", amount: 15000 },
  { ref: "PAY-7A9F1B2C", customer: "Olivier Mbu", method: "mtn", status: "success", amount: 8500 },
  { ref: "PAY-4F2D9E8B", customer: "Cooperative Bafia", method: "orange", status: "pending", amount: 245000 },
  { ref: "PAY-3B7C82A1", customer: "Wholesale Lagos", method: "card", status: "failed", amount: 1850000 },
  { ref: "PAY-9E1D7F3C", customer: "Adele Toure", method: "wave", status: "success", amount: 32000 },
];

/* ── page ──────────────────────────────────────────────────── */

export default function MerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [balance, setBalance] = useState<MerchantBalanceInfo | null>(null);
  const [tab, setTab] = useState<Tab>("payments");
  const [payments, setPayments] = useState<PaginatedItems<MerchantPaymentItem> | null>(null);
  const [withdrawals, setWithdrawals] = useState<PaginatedItems<MerchantWithdrawalItem> | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsStatus, setPaymentsStatus] = useState("");
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [withdrawalsStatus, setWithdrawalsStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!merchantId) return;
    setLoading(true);
    Promise.all([
      merchantsService.get(merchantId),
      merchantsService.getBalance(merchantId),
    ])
      .then(([m, b]) => {
        setMerchant(m);
        setBalance(b);
      })
      .catch(() => setError("Failed to load merchant details"))
      .finally(() => setLoading(false));
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId) return;
    merchantsService
      .getPayments(merchantId, paymentsPage, 20, paymentsStatus || undefined)
      .then(setPayments)
      .catch(() => {});
  }, [merchantId, paymentsPage, paymentsStatus]);

  useEffect(() => {
    if (!merchantId) return;
    merchantsService
      .getWithdrawals(merchantId, withdrawalsPage, 20, withdrawalsStatus || undefined)
      .then(setWithdrawals)
      .catch(() => {});
  }, [merchantId, withdrawalsPage, withdrawalsStatus]);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 256 }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div style={{ padding: 80, textAlign: "center", color: "var(--rose)" }}>
        {error || "Merchant not found"}
      </div>
    );
  }

  const feeRate = merchant.fee_rate ?? 1.75;
  const gmv30 = balance?.total_earned ?? 5240000;
  const txCount = balance?.total_payments ?? 1247;
  const feeStr = `${feeRate}%`;
  const ltcRevenue = gmv30 * (feeRate / 100);

  return (
    <PageWrapper
      crumb={[
        <Link key="c1" href="/dashboard/merchants" style={{ cursor: "pointer", color: "var(--primary)", textDecoration: "none" }}><T fr="Marchands" en="Merchants" /></Link>,
        <span key="c2">{merchant.id}</span>,
      ]}
      title={merchant.name}
      sub={<>
        <Pill tone={merchant.is_active ? "success" : "fail"}>{merchant.is_active ? "live" : "suspended"}</Pill>
        <span style={{ marginLeft: 8 }}>{merchant.id} \u00B7 CM \u00B7 {feeStr}</span>
      </>}
      actions={<>
        <button className="btn btn-ghost btn-sm"><Icon name="external" size={13} /> <T fr="Voir comme marchand" en="View as merchant" /></button>
        <button className="btn btn-ghost btn-sm"><Icon name="message" size={13} /> <T fr="Contacter" en="Contact" /></button>
        <button className="btn btn-ghost btn-sm" style={{ color: "var(--rose)", borderColor: "var(--rose)" }}><T fr="Suspendre" en="Suspend" /></button>
      </>}
    >
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="GMV 30 jours" en="30d GMV" />} value={fmtCompact(gmv30)} unit="F" delta="+18%" />
        <KpiCard label="Transactions" value={String(txCount)} delta="+12%" />
        <KpiCard label={<T fr="Take rate effectif" en="Effective take rate" />} value={feeStr} />
        <KpiCard label={<T fr="Revenu LTC" en="LTC revenue" />} value={fmtCompact(ltcRevenue)} unit="F" />
      </div>

      {/* Two-column layout: left (legal info + activity) / right (risk + admin) */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          {/* Legal info card */}
          <div className="nk-card" style={{ marginBottom: 12 }}>
            <div className="card-head">
              <h3><T fr="Informations legales" en="Legal information" /></h3>
              <Pill tone="success"><T fr="KYC valide" en="KYC verified" /></Pill>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13 }}>
              {[
                ["Raison sociale", merchant.name],
                ["RCCM", "RC/YDE/2024/B/0421"],
                ["NIU", "M0824100021T"],
                ["Pays", "\u{1F1E8}\u{1F1F2} Cameroun"],
                ["Representant legal", "Marie Kamga"],
                ["Adresse", "Yaounde, BP 1234"],
                ["Email", merchant.email],
                ["Telephone", merchant.phone || "+237 222 22 11 00"],
              ].map((r, i) => (
                <div key={i}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{r[0]}</div>
                  <div style={{ marginTop: 4 }}>{r[1]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity card */}
          <div className="nk-card" style={{ marginBottom: 12 }}>
            <div className="card-head">
              <h3><T fr="Activite recente" en="Recent activity" /></h3>
              <button className="btn btn-link"><T fr="Voir tout" en="View all" /> {"\u2192"}</button>
            </div>
            <div className="tbl">
              {MOCK_RECENT_TX.map((tx) => (
                <div className="row" key={tx.ref} style={{ gridTemplateColumns: "1fr 1.4fr 0.7fr 0.8fr 1fr 24px", paddingTop: 10, paddingBottom: 10 }}>
                  <div className="mono" style={{ fontSize: 12 }}>{tx.ref}</div>
                  <div style={{ fontSize: 13 }}>{tx.customer}</div>
                  <div><MethodChip kind={tx.method} /></div>
                  <Pill tone={tx.status === "success" ? "success" : tx.status === "pending" ? "warn" : "fail"}>{tx.status === "success" ? "paid" : tx.status}</Pill>
                  <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{fmtXAF(tx.amount)}</div>
                  <Icon name="chevR" size={13} color="var(--muted)" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* Risk score card */}
          <div className="nk-card" style={{ marginBottom: 12 }}>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 14px" }}><T fr="Score de risque" en="Risk score" /></h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <span className="display" style={{ fontWeight: 500, fontSize: 48, letterSpacing: "-0.025em", lineHeight: 1, color: "var(--success)" }}>92</span>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>/ 100 \u00B7 <T fr="Faible" en="Low" /></span>
            </div>
            <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: "92%", height: "100%", background: "linear-gradient(to right, var(--rose), var(--warn), var(--success))" }} />
            </div>
            {[
              { name: <T fr="Chargebacks" en="Chargebacks" />, v: "0,02%", tone: "success" },
              { name: <T fr="Taux echec" en="Failure rate" />, v: "5,2%", tone: "success" },
              { name: <T fr="Volume coherent" en="Volume coherence" />, v: "\u2713", tone: "success" },
              { name: <T fr="Pattern IP" en="IP pattern" />, v: <T fr="Normal" en="Normal" />, tone: "success" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <span style={{ color: "var(--muted)" }}>{s.name}</span>
                <span className="mono" style={{ color: "var(--success)" }}>{s.v}</span>
              </div>
            ))}
          </div>

          {/* Admin actions card */}
          <div className="nk-card">
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 14px" }}><T fr="Actions admin" en="Admin actions" /></h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }}><Icon name="card" size={13} /> <T fr="Modifier le take rate" en="Edit take rate" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }}><Icon name="bank" size={13} /> <T fr="Compte de reglement" en="Payout account" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }}><Icon name="shield" size={13} /> <T fr="Forcer re-KYC" en="Force re-KYC" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }}><Icon name="refresh" size={13} /> <T fr="Regenerer les cles" en="Regenerate keys" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start", color: "var(--rose)", borderColor: "var(--rose-soft)" }}><Icon name="pause" size={13} color="var(--rose)" /> <T fr="Suspendre compte" en="Suspend account" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab switches */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", borderRadius: 8, padding: 4, marginBottom: 16 }}>
        <button
          onClick={() => setTab("payments")}
          className={tab === "payments" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={{ flex: 1 }}
        >
          <Icon name="arrowDown" size={13} color={tab === "payments" ? "white" : "var(--success)"} />
          <T fr="Paiements (Entrees)" en="Payments (Inflows)" />
          {payments && <Pill tone="neutral">{payments.total}</Pill>}
        </button>
        <button
          onClick={() => setTab("withdrawals")}
          className={tab === "withdrawals" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={{ flex: 1 }}
        >
          <Icon name="arrowUp" size={13} color={tab === "withdrawals" ? "white" : "var(--rose)"} />
          <T fr="Retraits (Sorties)" en="Withdrawals (Outflows)" />
          {withdrawals && <Pill tone="neutral">{withdrawals.total}</Pill>}
        </button>
      </div>

      {/* Tab content */}
      {tab === "payments" ? (
        <PaymentsTable
          data={payments}
          page={paymentsPage}
          onPageChange={setPaymentsPage}
          statusFilter={paymentsStatus}
          onStatusFilter={(s) => { setPaymentsStatus(s); setPaymentsPage(1); }}
        />
      ) : (
        <WithdrawalsTable
          data={withdrawals}
          page={withdrawalsPage}
          onPageChange={setWithdrawalsPage}
          statusFilter={withdrawalsStatus}
          onStatusFilter={(s) => { setWithdrawalsStatus(s); setWithdrawalsPage(1); }}
        />
      )}
    </PageWrapper>
  );
}

/* ── Status filter pills ──────────────────────────────────── */

function StatusFilterRow({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
      {options.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={value === s ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={{ fontSize: 11 }}
        >
          {s || <T fr="Tous" en="All" />}
        </button>
      ))}
    </div>
  );
}

/* ── Payments table ───────────────────────────────────────── */

function PaymentsTable({
  data,
  page,
  onPageChange,
  statusFilter,
  onStatusFilter,
}: {
  data: PaginatedItems<MerchantPaymentItem> | null;
  page: number;
  onPageChange: (p: number) => void;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
}) {
  if (!data) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
        <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.per_page);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
        <StatusFilterRow value={statusFilter} onChange={onStatusFilter} options={PAYMENT_STATUSES} />
      </div>
      {data.items.length > 0 ? (
        <>
          <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 0.7fr 0.8fr 0.7fr 0.8fr" }}>
            <div><T fr="Reference" en="Reference" /></div>
            <div><T fr="Client" en="Customer" /></div>
            <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
            <div style={{ textAlign: "right" }}><T fr="Frais" en="Fees" /></div>
            <div><T fr="Operateur" en="Operator" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
          </div>
          <div className="tbl">
            {data.items.map((p) => (
              <div key={p.id} className="row" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 0.7fr 0.8fr 0.7fr 0.8fr" }}>
                <div>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{p.reference}</div>
                  {p.description && <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</div>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {p.customer_name && <div>{p.customer_name}</div>}
                  {p.customer_phone && <div>{p.customer_phone}</div>}
                </div>
                <div style={{ textAlign: "right", fontWeight: 500, color: "var(--success)" }}>+{formatCurrency(p.amount, p.currency)}</div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{p.fee > 0 ? formatCurrency(p.fee, p.currency) : "\u2014"}</div>
                <div>
                  <Pill tone={
                    p.operator === "MTN" ? "warn" :
                    p.operator === "ORANGE" ? "info" :
                    "neutral"
                  }>
                    {p.operator || p.payment_method || "\u2014"}
                  </Pill>
                </div>
                <div><Pill tone={paymentStatusTone(p.status)}>{p.status}</Pill></div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{fmtDate(p.created_at)}</div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationRow page={page} totalPages={totalPages} total={data.total} onPageChange={onPageChange} />
          )}
        </>
      ) : (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          <Icon name="receipt" size={28} color="var(--muted)" />
          <p style={{ marginTop: 8 }}><T fr="Aucun paiement" en="No payments" /></p>
        </div>
      )}
    </div>
  );
}

/* ── Withdrawals table ────────────────────────────────────── */

function WithdrawalsTable({
  data,
  page,
  onPageChange,
  statusFilter,
  onStatusFilter,
}: {
  data: PaginatedItems<MerchantWithdrawalItem> | null;
  page: number;
  onPageChange: (p: number) => void;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
}) {
  if (!data) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
        <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.per_page);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
        <StatusFilterRow value={statusFilter} onChange={onStatusFilter} options={WITHDRAWAL_STATUSES} />
      </div>
      {data.items.length > 0 ? (
        <>
          <div className="row head" style={{ gridTemplateColumns: "1.2fr 0.8fr 1.2fr 0.8fr 0.7fr 0.8fr" }}>
            <div><T fr="Reference" en="Reference" /></div>
            <div><T fr="Methode" en="Method" /></div>
            <div><T fr="Destination" en="Destination" /></div>
            <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
          </div>
          <div className="tbl">
            {data.items.map((w) => (
              <div key={w.id} className="row" style={{ gridTemplateColumns: "1.2fr 0.8fr 1.2fr 0.8fr 0.7fr 0.8fr" }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{w.reference}</div>
                <div style={{ fontSize: 12 }}>
                  {w.method === "MOBILE_MONEY" ? "Mobile Money" : <T fr="Virement" en="Transfer" />}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {w.method === "MOBILE_MONEY"
                    ? `${w.mobile_money_operator} ${w.mobile_money_number}`
                    : <><div>{w.bank_name}</div><div>{w.bank_account_number}</div></>
                  }
                </div>
                <div style={{ textAlign: "right", fontWeight: 500, color: "var(--rose)" }}>-{formatCurrency(w.amount, w.currency)}</div>
                <div><Pill tone={withdrawalStatusTone(w.status)}>{w.status}</Pill></div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{fmtDate(w.created_at)}</div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationRow page={page} totalPages={totalPages} total={data.total} onPageChange={onPageChange} />
          )}
        </>
      ) : (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          <Icon name="wallet" size={28} color="var(--muted)" />
          <p style={{ marginTop: 8 }}><T fr="Aucun retrait" en="No withdrawals" /></p>
        </div>
      )}
    </div>
  );
}

/* ── Pagination ───────────────────────────────────────────── */

function PaginationRow({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>
        <T fr={`${total} resultat(s)`} en={`${total} result(s)`} />
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-ghost btn-sm"
          style={{ opacity: page <= 1 ? 0.3 : 1 }}
        >
          <Icon name="chevL" size={13} />
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-ghost btn-sm"
          style={{ opacity: page >= totalPages ? 0.3 : 1 }}
        >
          <Icon name="chevR" size={13} />
        </button>
      </div>
    </div>
  );
}
