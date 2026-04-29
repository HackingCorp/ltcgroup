"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, Loading, Button } from "@/components/ui";
import { merchantsService } from "@/services/merchants.service";
import type {
  MerchantBalanceInfo,
  MerchantPaymentItem,
  MerchantWithdrawalItem,
  PaginatedItems,
} from "@/services/merchants.service";
import type { Merchant } from "@/types";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Tab = "payments" | "withdrawals";

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

  if (loading) return <Loading className="py-20" size="lg" />;
  if (error || !merchant)
    return (
      <div className="py-20 text-center text-red-500">{error || "Merchant not found"}</div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/merchants")}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{merchant.name}</h1>
          <p className="text-sm text-gray-500">{merchant.email}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            merchant.is_active
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {merchant.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Balance Cards */}
      {balance && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <BalanceCard
              label="Solde Marchand"
              value={formatCurrency(balance.available_balance)}
              subtitle={`${balance.completed_payments}/${balance.total_payments} paiements`}
              icon={<Wallet className="h-5 w-5 text-green-600" />}
              bgColor="bg-green-50"
              textColor="text-green-700"
            />
            <BalanceCard
              label="Total Gagné"
              value={formatCurrency(balance.total_earned)}
              subtitle={`- ${formatCurrency(balance.total_fees)} frais (${merchant.fee_rate ?? 1.75}%)`}
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              bgColor="bg-blue-50"
              textColor="text-blue-700"
            />
            <BalanceCard
              label="Marge LtcPay"
              value={formatCurrency(balance.ltcpay_margin)}
              subtitle={`${((merchant.fee_rate ?? 1.75) - 1.5).toFixed(2)}% net`}
              icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
              bgColor="bg-emerald-50"
              textColor="text-emerald-700"
            />
            <BalanceCard
              label="Frais TouchPay"
              value={formatCurrency(balance.touchpay_fees)}
              subtitle="1.5% par transaction"
              icon={<TrendingDown className="h-5 w-5 text-red-600" />}
              bgColor="bg-red-50"
              textColor="text-red-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <BalanceCard
              label="Total Retiré"
              value={formatCurrency(balance.total_withdrawn)}
              icon={<TrendingDown className="h-5 w-5 text-orange-600" />}
              bgColor="bg-orange-50"
              textColor="text-orange-700"
            />
            <BalanceCard
              label="Retraits en Attente"
              value={formatCurrency(balance.pending_withdrawals)}
              icon={<Clock className="h-5 w-5 text-yellow-600" />}
              bgColor="bg-yellow-50"
              textColor="text-yellow-700"
            />
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500">Configuration</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {merchant.fee_rate ?? 1.75}%
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Frais supportés par : <span className="font-medium">{merchant.fee_bearer === "CLIENT" ? "Client" : "Marchand"}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab("payments")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "payments"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ArrowDownCircle className="h-4 w-4 text-green-500" />
          Paiements (Entrées)
          {payments && (
            <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs">
              {payments.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("withdrawals")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "withdrawals"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ArrowUpCircle className="h-4 w-4 text-red-500" />
          Retraits (Sorties)
          {withdrawals && (
            <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs">
              {withdrawals.total}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
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
    </div>
  );
}

function BalanceCard({
  label,
  value,
  subtitle,
  icon,
  bgColor,
  textColor,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`mt-1 text-xl font-bold ${textColor}`}>{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg ${bgColor} p-2`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const PAYMENT_STATUSES = ["", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "EXPIRED", "CANCELLED"];
const WITHDRAWAL_STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED"];

function StatusFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === s
              ? "bg-navy-500 text-white"
              : s === ""
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : getStatusColor(s) + " hover:opacity-80"
          }`}
        >
          {s || "Tous"}
        </button>
      ))}
    </div>
  );
}

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
  if (!data) return <Loading className="py-10" />;

  const totalPages = Math.ceil(data.total / data.per_page);

  return (
    <Card>
      <CardContent>
        <div className="mb-4">
          <StatusFilter value={statusFilter} onChange={onStatusFilter} options={PAYMENT_STATUSES} />
        </div>
        {data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Référence</th>
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium text-right">Montant</th>
                    <th className="pb-3 font-medium text-right">Frais</th>
                    <th className="pb-3 font-medium">Opérateur</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <code className="text-xs font-medium text-gray-800">
                          {p.reference}
                        </code>
                        {p.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="text-xs">
                          {p.customer_name && (
                            <p className="text-gray-700">{p.customer_name}</p>
                          )}
                          {p.customer_phone && (
                            <p className="text-gray-500">{p.customer_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-green-700">
                        +{formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="py-3 text-right text-xs text-gray-500">
                        {p.fee > 0 ? formatCurrency(p.fee, p.currency) : "-"}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.operator === "MTN" ? "bg-yellow-50 text-yellow-700" :
                          p.operator === "ORANGE" ? "bg-orange-50 text-orange-700" :
                          "bg-gray-50 text-gray-600"
                        }`}>
                          {p.operator || p.payment_method || "-"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {new Date(p.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={data.total}
              onPageChange={onPageChange}
            />
          </>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <ArrowDownCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm">Aucun paiement</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
  if (!data) return <Loading className="py-10" />;

  const totalPages = Math.ceil(data.total / data.per_page);

  return (
    <Card>
      <CardContent>
        <div className="mb-4">
          <StatusFilter value={statusFilter} onChange={onStatusFilter} options={WITHDRAWAL_STATUSES} />
        </div>
        {data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Référence</th>
                    <th className="pb-3 font-medium">Méthode</th>
                    <th className="pb-3 font-medium">Destination</th>
                    <th className="pb-3 font-medium text-right">Montant</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <code className="text-xs font-medium text-gray-800">
                          {w.reference}
                        </code>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-gray-600">
                          {w.method === "MOBILE_MONEY" ? "Mobile Money" : "Virement"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-xs">
                          {w.method === "MOBILE_MONEY" ? (
                            <>
                              <p className="text-gray-700">
                                {w.mobile_money_operator} {w.mobile_money_number}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-700">{w.bank_name}</p>
                              <p className="text-gray-500">{w.bank_account_number}</p>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-red-700">
                        -{formatCurrency(w.amount, w.currency)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                            w.status
                          )}`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {new Date(w.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={data.total}
              onPageChange={onPageChange}
            />
          </>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <ArrowUpCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm">Aucun retrait</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
      <p className="text-xs text-gray-500">{total} résultat(s)</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-gray-600">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
