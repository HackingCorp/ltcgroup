"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface ApiKeys {
  api_key_live: string;
  api_key_test: string;
  api_secret?: string;
  webhook_secret?: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API GET /api/v1/merchants/me
    // Simulated data for now
    setTimeout(() => {
      setKeys({
        api_key_live: "ltcpay_live_" + "x".repeat(32),
        api_key_test: "ltcpay_test_" + "y".repeat(32),
        webhook_secret: "whsec_" + "z".repeat(40),
      });
      setIsLoading(false);
    }, 500);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (isLoading) {
    return <div className="py-20 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="mt-2 text-gray-600">
          Manage your API credentials for integrating with LtcPay
        </p>
      </div>

      {/* Live API Key */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live API Key</h3>
              <p className="text-sm text-gray-500">Use this for production</p>
            </div>
            <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
              Production
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <code className="flex-1 text-sm font-mono text-gray-700">
              {keys?.api_key_live}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(keys!.api_key_live, "Live API Key")}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test API Key */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Test API Key</h3>
              <p className="text-sm text-gray-500">Use this for development</p>
            </div>
            <span className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
              Development
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <code className="flex-1 text-sm font-mono text-gray-700">
              {keys?.api_key_test}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(keys!.api_key_test, "Test API Key")}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Secret */}
      {keys?.api_secret && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">API Secret</h3>
                <p className="text-sm text-gray-500">
                  Keep this secret! Never share it publicly
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" /> Reveal
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <code className="flex-1 text-sm font-mono text-gray-700">
                {showSecret ? keys.api_secret : "•".repeat(48)}
              </code>
              {showSecret && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(keys.api_secret!, "API Secret")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Secret */}
      {keys?.webhook_secret && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Webhook Secret
                </h3>
                <p className="text-sm text-gray-500">
                  Use this to verify webhook signatures
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <code className="flex-1 text-sm font-mono text-gray-700">
                {keys.webhook_secret}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(keys.webhook_secret!, "Webhook Secret")
                }
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Guide */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Integration Guide
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                1. Authenticate your requests
              </h4>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
{`curl -X POST http://localhost:8001/api/v1/payments \\
  -H "X-API-Key: ${keys?.api_key_live}" \\
  -H "X-API-Secret: YOUR_API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1000,
    "customer_info": {
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "merchant_reference": "ORDER-123"
  }'`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                2. Verify webhook signatures
              </h4>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
{`import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rotate Keys Warning */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">
              Need to rotate your keys?
            </h4>
            <p className="text-sm text-yellow-700 mt-1">
              Contact support to generate new API credentials if your keys have been
              compromised.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
