"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Payment } from "@/types";

export default function PaymentDetailPage() {
  const params = useParams();
  const reference = params.reference as string;
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) return;
    async function load() {
      try {
        const p = await merchantDashboardService.getPayment(reference);
        setPayment(p);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reference]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-4">
        <Link href="/merchant/dashboard/payments" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to payments
        </Link>
        <p className="text-center text-gray-500">Payment not found.</p>
      </div>
    );
  }

  const details = [
    { label: "Reference", value: payment.reference },
    { label: "Amount", value: formatCurrency(payment.amount, payment.currency) },
    { label: "Currency", value: payment.currency },
    { label: "Status", value: payment.status, isStatus: true },
    { label: "Payment Method", value: payment.payment_method || "—" },
    { label: "Description", value: payment.description || "—" },
    { label: "Customer Email", value: payment.customer_email || "—" },
    { label: "Customer Phone", value: payment.customer_phone || "—" },
    { label: "Created", value: new Date(payment.created_at).toLocaleString() },
    { label: "Updated", value: new Date(payment.updated_at).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <Link href="/merchant/dashboard/payments" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to payments
      </Link>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-gray-900">Payment {payment.reference}</h1>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-sm font-medium text-gray-500">{d.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {d.isStatus ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(d.value as string)}`}>
                      {d.value}
                    </span>
                  ) : (
                    d.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
