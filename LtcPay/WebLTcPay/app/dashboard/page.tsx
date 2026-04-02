"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Loading } from "@/components/ui";
import { dashboardService } from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, DollarSign, TrendingUp, CheckCircle } from "lucide-react";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <Loading className="py-20" size="lg" />;
  }

  const statCards = [
    {
      title: "Total Payments",
      value: stats?.total_payments ?? 0,
      icon: CreditCard,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats?.total_revenue ?? 0),
      icon: DollarSign,
      color: "text-green-600 bg-green-50",
    },
    {
      title: "Transactions",
      value: stats?.total_transactions ?? 0,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: "Success Rate",
      value: `${(stats?.success_rate ?? 0).toFixed(1)}%`,
      icon: CheckCircle,
      color: "text-gold-600 bg-gold-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your payment activity</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Payments</h2>
          {stats?.recent_payments && stats.recent_payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recent_payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-3 font-mono text-xs">{payment.reference}</td>
                      <td className="py-3">{formatCurrency(payment.amount, payment.currency)}</td>
                      <td className="py-3">
                        <span className="capitalize">{payment.status}</span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">No payments yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
