"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, Button } from "@/components/ui";
import { withdrawalsService } from "@/services/withdrawals.service";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import type { Withdrawal, WithdrawalListResponse } from "@/types";

export default function AdminWithdrawalsPage() {
  const [data, setData] = useState<WithdrawalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await withdrawalsService.listAll({
        status: statusFilter || undefined,
        page,
        page_size: 20,
      });
      setData(result);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [page, statusFilter]);

  const handleAction = async (id: string, action: "approve" | "reject" | "complete") => {
    const note = action === "reject" ? prompt("Rejection reason (optional):") || undefined : undefined;
    setActionLoading(id);
    try {
      if (action === "approve") await withdrawalsService.approve(id, note);
      else if (action === "reject") await withdrawalsService.reject(id, note);
      else await withdrawalsService.complete(id, note);
      toast.success(`Withdrawal ${action}d successfully`);
      loadData();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || `${action} failed`
          : `${action} failed`;
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const STATUSES = ["PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">All Withdrawals</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gold-400 focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
            </div>
          ) : data && data.withdrawals.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 font-medium">Reference</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Method</th>
                      <th className="pb-3 font-medium">Destination</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono text-xs">{w.reference}</td>
                        <td className="py-3 font-medium">{formatCurrency(w.amount, w.currency)}</td>
                        <td className="py-3 text-xs">
                          {w.method === "MOBILE_MONEY" ? "Mobile Money" : "Bank Transfer"}
                        </td>
                        <td className="py-3 text-xs text-gray-500">
                          {w.method === "MOBILE_MONEY"
                            ? `${w.mobile_money_operator} ${w.mobile_money_number}`
                            : `${w.bank_name} - ${w.bank_account_number}`}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(w.status)}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500 text-xs">
                          {new Date(w.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            {w.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAction(w.id, "approve")}
                                  isLoading={actionLoading === w.id}
                                  className="text-xs text-green-600 border-green-300 hover:bg-green-50"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAction(w.id, "reject")}
                                  isLoading={actionLoading === w.id}
                                  className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {w.status === "APPROVED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(w.id, "complete")}
                                isLoading={actionLoading === w.id}
                                className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                Complete
                              </Button>
                            )}
                            {!["PENDING", "APPROVED"].includes(w.status) && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {data.total_count} total withdrawal{data.total_count !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * 20 >= data.total_count}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">No withdrawal requests found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
