"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Loading } from "@/components/ui";
import { paymentsService } from "@/services/payments.service";
import { CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/types";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    paymentsService
      .list({ per_page: 50 })
      .then((data) => setPayments(data.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <Loading className="py-20" size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">Manage and track all payments</p>
      </div>

      <Card>
        <CardContent>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 font-mono text-xs">{p.reference}</td>
                      <td className="py-3">{formatCurrency(p.amount, p.currency)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.status === "completed"
                              ? "bg-green-50 text-green-700"
                              : p.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{p.payment_method || "—"}</td>
                      <td className="py-3 text-gray-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CreditCard className="mb-3 h-10 w-10 text-gray-300" />
              <p>No payments yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
