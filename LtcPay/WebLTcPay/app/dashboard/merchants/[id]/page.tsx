"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmtDate } from "@/lib/format";
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

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Plateforme" en="Platform" />,
        <Link key="c2" href="/dashboard/merchants" style={{ textDecoration: "none", color: "inherit" }}><T fr="Marchands" en="Merchants" /></Link>,
        <span key="c3">{merchant.name}</span>,
      ]}
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={merchant.name} size={36} />
          {merchant.name}
          <Pill tone={merchant.is_active ? "success" : "fail"}>
            {merchant.is_active ? <T fr="Actif" en="Active" /> : <T fr="Inactif" en="Inactive" />}
          </Pill>
        </span>
      }
      sub={<span>{merchant.email}</span>}
      actions={
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/dashboard/merchants")}>
          <Icon name="arrowL" size={13} /> <T fr="Retour" en="Back" />
        </button>
      }
    >
      {/* Balance KPIs */}
      {balance && (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
            <KpiCard hero label={<><T fr="Solde marchand" en="Merchant balance" /> {"·"} XAF</>} value={fmtXAF(balance.available_balance)} after={<Pill tone="success">{balance.completed_payments}/{balance.total_payments} <T fr="paiements" en="payments" /></Pill>} />
            <KpiCard label={<T fr="Total gagné" en="Total earned" />} value={fmtXAF(balance.total_earned)} delta={`- ${fmtXAF(balance.total_fees)} frais (${merchant.fee_rate ?? 1.75}%)`} />
            <KpiCard label={<T fr="Marge Nkap Pay" en="Nkap Pay margin" />} value={fmtXAF(balance.ltcpay_margin)} delta={`${((merchant.fee_rate ?? 1.75) - 1.5).toFixed(2)}% net`} deltaDir="up" />
            <KpiCard label={<T fr="Frais TouchPay" en="TouchPay fees" />} value={fmtXAF(balance.touchpay_fees)} delta="1.5% par tx" />
          </div>
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
            <KpiCard label={<T fr="Total retiré" en="Total withdrawn" />} value={fmtXAF(balance.total_withdrawn)} />
            <KpiCard label={<T fr="Retraits en attente" en="Pending withdrawals" />} value={fmtXAF(balance.pending_withdrawals)} />
            <KpiCard label={<T fr="Configuration" en="Configuration" />} value={`${merchant.fee_rate ?? 1.75}%`} after={<Pill tone="info">{merchant.fee_bearer === "CLIENT" ? "Client" : <T fr="Marchand" en="Merchant" />}</Pill>} />
          </div>
        </>
      )}

      {/* Tab switches */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", borderRadius: 8, padding: 4, marginBottom: 16 }}>
        <button
          onClick={() => setTab("payments")}
          className={tab === "payments" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={{ flex: 1 }}
        >
          <Icon name="arrowDown" size={13} color={tab === "payments" ? "white" : "var(--success)"} />
          <T fr="Paiements (Entrées)" en="Payments (Inflows)" />
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
            <div><T fr="Référence" en="Reference" /></div>
            <div><T fr="Client" en="Customer" /></div>
            <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
            <div style={{ textAlign: "right" }}><T fr="Frais" en="Fees" /></div>
            <div><T fr="Opérateur" en="Operator" /></div>
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
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{p.fee > 0 ? formatCurrency(p.fee, p.currency) : "—"}</div>
                <div>
                  <Pill tone={
                    p.operator === "MTN" ? "warn" :
                    p.operator === "ORANGE" ? "info" :
                    "neutral"
                  }>
                    {p.operator || p.payment_method || "—"}
                  </Pill>
                </div>
                <div><Pill tone={paymentStatusTone(p.status)}>{p.status}</Pill></div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{fmtDate(p.created_at)}</div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} total={data.total} onPageChange={onPageChange} />
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
            <div><T fr="Référence" en="Reference" /></div>
            <div><T fr="Méthode" en="Method" /></div>
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
            <Pagination page={page} totalPages={totalPages} total={data.total} onPageChange={onPageChange} />
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

function Pagination({
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
        <T fr={`${total} résultat(s)`} en={`${total} result(s)`} />
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
