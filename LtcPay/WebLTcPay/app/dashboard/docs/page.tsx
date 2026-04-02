"use client";

import { Card, CardContent } from "@/components/ui";
import { FileText, ExternalLink } from "lucide-react";

const sections = [
  {
    title: "Authentication",
    description:
      "All API requests require authentication via API key and secret. Include your API key in the X-API-Key header and sign requests with your API secret.",
    endpoint: "POST /api/v1/merchants/register",
  },
  {
    title: "Create Payment",
    description:
      "Initiate a payment by sending the amount, currency, and optional customer details. The API returns a payment object with a unique reference and checkout URL.",
    endpoint: "POST /api/v1/payments",
  },
  {
    title: "Get Payment Status",
    description:
      "Retrieve the current status of a payment by its ID. Statuses include: pending, completed, failed, expired, cancelled.",
    endpoint: "GET /api/v1/payments/{id}",
  },
  {
    title: "Webhooks",
    description:
      "Configure a callback URL to receive real-time payment status updates. Webhook payloads are signed with your webhook secret for verification.",
    endpoint: "POST (your callback_url)",
  },
  {
    title: "Test Mode",
    description:
      "Use your test API key (ltcpay_test_*) for sandbox testing. Test payments simulate the full flow without moving real money.",
    endpoint: "Same endpoints, test key",
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
        <p className="text-sm text-gray-500">
          Integration guide for the LTCPay payment API
        </p>
      </div>

      <Card>
        <CardContent>
          <div className="mb-6 rounded-lg bg-navy-50 p-4">
            <h3 className="text-sm font-semibold text-navy-800">Base URL</h3>
            <code className="mt-1 block text-sm text-navy-600">
              https://pay.ltcgroup.site/api/v1
            </code>
          </div>

          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.title} className="border-b border-gray-100 pb-5 last:border-0">
                <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{section.description}</p>
                <code className="mt-2 inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                  {section.endpoint}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-gray-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Need more details?</h3>
              <p className="mt-1 text-sm text-gray-500">
                Contact the LTCPay team for full API reference documentation, SDKs, and integration support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
