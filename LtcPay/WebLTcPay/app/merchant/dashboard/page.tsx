"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, StatusBadge } from "@/components/ui";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { CreditCard, DollarSign, Wallet, TrendingUp } from "lucide-react";
import type { MerchantDashboardStats, BalanceInfo } from "@/types";

export default function MerchantDashboardPage() {
  const [stats, setStats] = useState<MerchantDashboardStats | null>(null);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, b] = await Promise.all([
          merchantDashboardService.getStats(),
          merchantDashboardService.getBalance(),
        ]);
        setStats(s);
        setBalance(b);
      } catch {
        // handled by 401 interceptor
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Payments",
      value: stats?.total_payments ?? 0,
      icon: CreditCard,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(stats?.total_revenue ?? 0),
      icon: DollarSign,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Available Balance",
      value: formatCurrency(balance?.available_balance ?? 0),
      icon: Wallet,
      color: "text-gold-600 bg-gold-50",
    },
    {
      label: "Success Rate",
      value: `${stats?.success_rate ?? 0}%`,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
          <Link
            href="/merchant/dashboard/payments"
            className="text-sm font-medium text-gold-600 hover:text-gold-700"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {stats?.recent_payments && stats.recent_payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recent_payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs">{p.reference}</td>
                      <td className="py-3">{formatCurrency(p.amount, p.currency)}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              No payments yet. Integrate the API to start accepting payments.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
