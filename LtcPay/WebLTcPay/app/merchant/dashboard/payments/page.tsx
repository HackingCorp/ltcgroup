"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, Button } from "@/components/ui";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import type { Payment, PaginatedResponse } from "@/types";

const STATUSES = ["", "pending", "completed", "failed", "expired", "cancelled"];

export default function MerchantPaymentsPage() {
  const [data, setData] = useState<PaginatedResponse<Payment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await merchantDashboardService.getPayments({
          page,
          page_size: 20,
          status: statusFilter || undefined,
        });
        setData(result);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, statusFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gold-400 focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 font-medium">Reference</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.items.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <Link
                            href={`/merchant/dashboard/payments/${p.reference}`}
                            className="font-mono text-xs text-gold-600 hover:underline"
                          >
                            {p.reference}
                          </Link>
                        </td>
                        <td className="py-3">{formatCurrency(p.amount, p.currency)}</td>
                        <td className="py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500 text-xs">
                          {p.customer_email || p.customer_phone || "—"}
                        </td>
                        <td className="py-3 text-gray-500">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {data.page} of {data.total_pages} ({data.total} total)
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
                    disabled={page >= (data.total_pages || 1)}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">No payments found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
