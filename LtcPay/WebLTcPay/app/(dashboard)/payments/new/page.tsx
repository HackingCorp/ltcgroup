"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";

export default function CreatePaymentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    customer_email: "",
    customer_name: "",
    customer_phone: "",
    description: "",
    merchant_reference: "",
    callback_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Call POST /api/v1/payments
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockPaymentUrl = `http://localhost:8001/pay/PAY-${Date.now()}`;
      setPaymentUrl(mockPaymentUrl);
      toast.success("Payment created successfully!");
    } catch (error) {
      toast.error("Failed to create payment");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Payment URL copied!");
  };

  if (paymentUrl) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/payments">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Button>
        </Link>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Payment Created!
              </h2>
              <p className="mt-2 text-gray-600">
                Share this link with your customer to complete the payment
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <QRCodeSVG value={paymentUrl} size={200} />
              </div>
            </div>

            {/* Payment URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={paymentUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <Button onClick={() => copyToClipboard(paymentUrl)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.open(paymentUrl, "_blank")}
              >
                Open Payment Page
              </Button>
              <Button onClick={() => router.push("/payments")}>
                View All Payments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/payments">
        <Button variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Payments
        </Button>
      </Link>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Create New Payment
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (XAF) *
              </label>
              <input
                type="number"
                required
                min="100"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10000"
              />
              <p className="mt-1 text-sm text-gray-500">Minimum: 100 XAF</p>
            </div>

            {/* Customer Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Email *
              </label>
              <input
                type="email"
                required
                value={formData.customer_email}
                onChange={(e) =>
                  setFormData({ ...formData, customer_email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="customer@example.com"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Phone
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) =>
                  setFormData({ ...formData, customer_phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+237690000000"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment for Order #1234"
              />
            </div>

            {/* Merchant Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Reference
              </label>
              <input
                type="text"
                value={formData.merchant_reference}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    merchant_reference: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ORDER-123"
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional reference for your internal tracking
              </p>
            </div>

            {/* Callback URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Callback URL
              </label>
              <input
                type="url"
                value={formData.callback_url}
                onChange={(e) =>
                  setFormData({ ...formData, callback_url: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yoursite.com/webhook"
              />
              <p className="mt-1 text-sm text-gray-500">
                We&apos;ll send payment updates to this URL
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/payments")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Create Payment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
