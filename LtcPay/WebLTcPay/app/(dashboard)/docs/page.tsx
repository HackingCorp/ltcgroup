"use client";

import { Card, CardContent } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function DocsPage() {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          API Documentation
        </h1>
        <p className="mt-2 text-gray-600">
          Complete guide to integrating LtcPay into your application
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Quick Start Guide
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                1. Get your API credentials
              </h3>
              <p className="text-gray-600 mb-2">
                Navigate to the{" "}
                <a href="/api-keys" className="text-blue-600 hover:underline">
                  API Keys
                </a>{" "}
                page to get your API Key and Secret.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                2. Create a payment
              </h3>
              <div className="relative">
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
{`curl -X POST http://localhost:8001/api/v1/payments \\
  -H "X-API-Key: your_api_key_here" \\
  -H "X-API-Secret: your_api_secret_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "customer_info": {
      "email": "customer@example.com",
      "name": "John Doe",
      "phone": "+237690000000"
    },
    "description": "Payment for Order #1234",
    "merchant_reference": "ORDER-1234",
    "callback_url": "https://yoursite.com/webhooks/ltcpay"
  }'`}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyCode(`curl -X POST http://localhost:8001/api/v1/payments \\
  -H "X-API-Key: your_api_key_here" \\
  -H "X-API-Secret: your_api_secret_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "customer_info": {
      "email": "customer@example.com",
      "name": "John Doe",
      "phone": "+237690000000"
    },
    "description": "Payment for Order #1234",
    "merchant_reference": "ORDER-1234",
    "callback_url": "https://yoursite.com/webhooks/ltcpay"
  }'`)
                  }
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3. Redirect customer to payment page
              </h3>
              <p className="text-gray-600">
                The API will return a <code className="px-2 py-1 bg-gray-100 rounded">payment_url</code>.
                Redirect your customer to this URL to complete the payment.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                4. Receive webhook notifications
              </h3>
              <p className="text-gray-600">
                LtcPay will send a POST request to your <code className="px-2 py-1 bg-gray-100 rounded">callback_url</code> when
                the payment status changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            API Endpoints
          </h2>
          <div className="space-y-6">
            {/* Create Payment */}
            <div className="border-b pb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                  POST
                </span>
                <code className="text-sm font-mono">/api/v1/payments</code>
              </div>
              <p className="text-gray-600 mb-3">Create a new payment</p>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">Headers:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>
                    <code>X-API-Key</code>: Your API key
                  </li>
                  <li>
                    <code>X-API-Secret</code>: Your API secret
                  </li>
                </ul>
              </div>
            </div>

            {/* Get Payment */}
            <div className="border-b pb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  GET
                </span>
                <code className="text-sm font-mono">
                  /api/v1/payments/{"{reference}"}
                </code>
              </div>
              <p className="text-gray-600">Get payment details by reference</p>
            </div>

            {/* List Payments */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  GET
                </span>
                <code className="text-sm font-mono">/api/v1/payments</code>
              </div>
              <p className="text-gray-600 mb-3">
                List all payments with pagination
              </p>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">Query Parameters:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>
                    <code>page</code>: Page number (default: 1)
                  </li>
                  <li>
                    <code>page_size</code>: Items per page (default: 20)
                  </li>
                  <li>
                    <code>status</code>: Filter by status (PENDING, COMPLETED,
                    FAILED, etc.)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Code Examples
          </h2>

          {/* Python */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Python (requests)
            </h3>
            <div className="relative">
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
{`import requests

API_KEY = "your_api_key_here"
API_SECRET = "your_api_secret_here"
BASE_URL = "http://localhost:8001"

headers = {
    "X-API-Key": API_KEY,
    "X-API-Secret": API_SECRET,
    "Content-Type": "application/json"
}

# Create payment
response = requests.post(
    f"{BASE_URL}/api/v1/payments",
    headers=headers,
    json={
        "amount": 10000,
        "customer_info": {
            "email": "customer@example.com",
            "name": "John Doe"
        },
        "merchant_reference": "ORDER-123"
    }
)

payment = response.json()
print(f"Payment URL: {payment['payment_url']}")`}
              </pre>
            </div>
          </div>

          {/* JavaScript */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              JavaScript (fetch)
            </h3>
            <div className="relative">
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
{`const API_KEY = 'your_api_key_here';
const API_SECRET = 'your_api_secret_here';
const BASE_URL = 'http://localhost:8001';

const response = await fetch(\`\${BASE_URL}/api/v1/payments\`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 10000,
    customer_info: {
      email: 'customer@example.com',
      name: 'John Doe'
    },
    merchant_reference: 'ORDER-123'
  })
});

const payment = await response.json();
console.log('Payment URL:', payment.payment_url);`}
              </pre>
            </div>
          </div>

          {/* PHP */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">PHP (cURL)</h3>
            <div className="relative">
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
{`<?php
$api_key = 'your_api_key_here';
$api_secret = 'your_api_secret_here';
$base_url = 'http://localhost:8001';

$data = [
    'amount' => 10000,
    'customer_info' => [
        'email' => 'customer@example.com',
        'name' => 'John Doe'
    ],
    'merchant_reference' => 'ORDER-123'
];

$ch = curl_init("$base_url/api/v1/payments");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-API-Key: $api_key",
    "X-API-Secret: $api_secret",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$payment = json_decode($response, true);
echo "Payment URL: " . $payment['payment_url'];
?>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Verification */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Webhook Verification
          </h2>
          <p className="text-gray-600 mb-4">
            Always verify webhook signatures to ensure requests are from LtcPay:
          </p>
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
{`import hmac
import hashlib

def verify_ltcpay_webhook(payload_body, signature, webhook_secret):
    """
    Verify LtcPay webhook signature

    Args:
        payload_body: Raw request body (string)
        signature: X-LtcPay-Signature header value
        webhook_secret: Your webhook secret from profile page

    Returns:
        bool: True if signature is valid
    """
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload_body.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)

# Usage in Flask/Django
@app.route('/webhooks/ltcpay', methods=['POST'])
def ltcpay_webhook():
    signature = request.headers.get('X-LtcPay-Signature')
    payload = request.get_data(as_text=True)

    if not verify_ltcpay_webhook(payload, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401

    data = request.json
    # Process webhook...
    return 'OK', 200`}
          </pre>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Support</h2>
          <p className="text-gray-600 mb-4">
            Need help? Contact our support team:
          </p>
          <div className="flex gap-4">
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Email Support
            </Button>
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              API Reference
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
