"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

export default function ApiKeysPage() {
  const { merchantUser } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!merchantUser) return null;

  const keys = [
    {
      label: "Live API Key",
      value: merchantUser.api_key_live,
      field: "live",
      description: "Use this key for production payments",
    },
    {
      label: "Test API Key",
      value: merchantUser.api_key_test,
      field: "test",
      description: "Use this key for testing and development",
    },
    {
      label: "Webhook Secret",
      value: merchantUser.webhook_secret || "",
      field: "webhook",
      description: "Used to verify webhook signatures",
      isSecret: true,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Your Credentials</h2>
          <p className="text-sm text-gray-500">
            Use these credentials to authenticate API requests.
            {merchantUser.is_test_mode && (
              <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Test Mode
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {keys.map((key) => (
            <div key={key.field} className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{key.label}</label>
                <span className="text-xs text-gray-400">{key.description}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 rounded bg-gray-50 px-3 py-2 text-xs text-gray-800 font-mono break-all">
                  {key.isSecret && !showSecret
                    ? "••••••••••••••••••••••••"
                    : key.value}
                </code>
                {key.isSecret && (
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(key.value, key.field)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  {copiedField === key.field ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Integration Guide</h2>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-gray-600 mb-4">
              To create a payment, send a POST request to <code>/api/v1/payments</code> with these headers:
            </p>
            <div className="rounded-lg bg-gray-900 p-4 text-sm text-gray-100 font-mono overflow-x-auto">
              <pre>{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://pay.ltcgroup.site"}/api/v1/payments \\
  -H "X-API-Key: ${merchantUser.is_test_mode ? merchantUser.api_key_test : merchantUser.api_key_live}" \\
  -H "X-API-Secret: YOUR_API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "currency": "XAF",
    "description": "Order #123"
  }'`}</pre>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Set up your <strong>Callback URL</strong> in the Profile page to receive payment notifications.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
