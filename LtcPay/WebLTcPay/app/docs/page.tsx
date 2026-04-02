"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

const BASE_URL = "https://pay.ltcgroup.site/api/v1";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mt-3 rounded-lg bg-[#0d1117] text-sm">
      <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-2">
        <span className="text-xs text-gray-400">{language}</span>
        <button onClick={copy} className="text-gray-400 hover:text-white transition-colors">
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-gray-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointSection({
  method,
  path,
  title,
  description,
  children,
  defaultOpen = false,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const methodColors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-400 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PATCH: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <span
          className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-bold ${methodColors[method]}`}
        >
          {method}
        </span>
        <code className="text-sm text-gray-600 font-mono">{path}</code>
        <span className="ml-auto text-sm font-medium text-gray-900">{title}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-4">
          <p className="text-sm text-gray-600">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; required: boolean; desc: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="pb-2 font-medium">Parameter</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Required</th>
            <th className="pb-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {params.map((p) => (
            <tr key={p.name}>
              <td className="py-2 font-mono text-xs text-gray-800">{p.name}</td>
              <td className="py-2 text-xs text-gray-500">{p.type}</td>
              <td className="py-2">
                {p.required ? (
                  <span className="text-xs font-medium text-red-500">required</span>
                ) : (
                  <span className="text-xs text-gray-400">optional</span>
                )}
              </td>
              <td className="py-2 text-xs text-gray-600">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseBlock({ status, body }: { status: number; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500">Response</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${status < 300 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
          {status}
        </span>
      </div>
      <CodeBlock language="json" code={body} />
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400">
              <span className="text-sm font-bold text-navy-800">LP</span>
            </div>
            <span className="text-lg font-bold text-navy-500">LTCPay</span>
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              API Docs
            </span>
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg bg-navy-500 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Hero */}
        <section>
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Integrate LTCPay into your application to accept payments via Mobile Money
            and other local payment methods across Africa.
          </p>
          <div className="mt-5 rounded-xl bg-navy-500 p-5">
            <p className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-1">Base URL</p>
            <code className="text-lg font-mono text-white">{BASE_URL}</code>
          </div>
        </section>

        {/* Authentication */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="authentication">Authentication</h2>
          <p className="text-sm text-gray-600">
            All API requests must include your API key in the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Key</code> header
            and your API secret in the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Secret</code> header.
            Use <strong>test keys</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_test_*</code>) for sandbox
            and <strong>live keys</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_live_*</code>) for production.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -X POST ${BASE_URL}/payments \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ltcpay_test_abc123..." \\
  -H "X-API-Secret: your_api_secret" \\
  -d '{"amount": 5000, "currency": "XAF"}'`}
          />
          <CodeBlock
            language="javascript"
            code={`// Node.js / Fetch
const response = await fetch("${BASE_URL}/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.LTCPAY_API_KEY,
    "X-API-Secret": process.env.LTCPAY_API_SECRET,
  },
  body: JSON.stringify({ amount: 5000, currency: "XAF" }),
});
const payment = await response.json();`}
          />
          <CodeBlock
            language="python"
            code={`import httpx

headers = {
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
}

resp = httpx.post(
    "${BASE_URL}/payments",
    headers=headers,
    json={"amount": 5000, "currency": "XAF"},
)
payment = resp.json()`}
          />
        </section>

        {/* Endpoints */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="endpoints">Endpoints</h2>

          {/* Create Payment */}
          <EndpointSection
            method="POST"
            path="/payments"
            title="Create Payment"
            description="Initiate a new payment. Returns a payment object with a unique reference. The customer should be redirected to the checkout URL to complete the payment."
            defaultOpen
          >
            <ParamTable
              params={[
                { name: "amount", type: "number", required: true, desc: "Amount in smallest currency unit (e.g. 5000 = 5,000 XAF)" },
                { name: "currency", type: "string", required: true, desc: "ISO currency code (XAF, XOF, USD)" },
                { name: "description", type: "string", required: false, desc: "Payment description shown to customer" },
                { name: "customer_email", type: "string", required: false, desc: "Customer email for receipt" },
                { name: "customer_phone", type: "string", required: false, desc: "Customer phone (used for Mobile Money)" },
                { name: "callback_url", type: "string", required: false, desc: "Override default webhook URL for this payment" },
                { name: "redirect_url", type: "string", required: false, desc: "URL to redirect customer after payment" },
                { name: "metadata", type: "object", required: false, desc: "Custom key-value data attached to the payment" },
              ]}
            />
            <CodeBlock
              language="javascript"
              code={`const response = await fetch("${BASE_URL}/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
  },
  body: JSON.stringify({
    amount: 5000,
    currency: "XAF",
    description: "Order #1234",
    customer_phone: "+237699000000",
    redirect_url: "https://myshop.cm/order/1234/success",
    metadata: { order_id: "1234" },
  }),
});

const payment = await response.json();
console.log(payment.reference); // "PAY-XXXXXX"
// Redirect customer to checkout:
// window.location.href = payment.checkout_url;`}
            />
            <CodeBlock
              language="python"
              code={`resp = httpx.post(
    "${BASE_URL}/payments",
    headers=headers,
    json={
        "amount": 5000,
        "currency": "XAF",
        "description": "Order #1234",
        "customer_phone": "+237699000000",
        "redirect_url": "https://myshop.cm/order/1234/success",
        "metadata": {"order_id": "1234"},
    },
)
payment = resp.json()
print(payment["reference"])  # "PAY-XXXXXX"`}
            />
            <ResponseBlock
              status={201}
              body={`{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "reference": "PAY-A1B2C3",
  "amount": 5000,
  "currency": "XAF",
  "status": "pending",
  "description": "Order #1234",
  "customer_phone": "+237699000000",
  "redirect_url": "https://myshop.cm/order/1234/success",
  "metadata": { "order_id": "1234" },
  "created_at": "2026-04-03T12:00:00Z",
  "updated_at": "2026-04-03T12:00:00Z"
}`}
            />
          </EndpointSection>

          {/* Get Payment */}
          <EndpointSection
            method="GET"
            path="/payments/{id}"
            title="Get Payment"
            description="Retrieve the current status and details of a payment by its ID."
          >
            <CodeBlock
              language="javascript"
              code={`const response = await fetch(
  "${BASE_URL}/payments/d290f1ee-6c54-4b01-90e6-d701748f0851",
  {
    headers: {
      "X-API-Key": "ltcpay_test_abc123...",
      "X-API-Secret": "your_api_secret",
    },
  }
);
const payment = await response.json();
console.log(payment.status); // "pending" | "completed" | "failed" | "expired" | "cancelled"`}
            />
            <CodeBlock
              language="python"
              code={`resp = httpx.get(
    f"${BASE_URL}/payments/{payment_id}",
    headers=headers,
)
payment = resp.json()
print(payment["status"])  # "completed"`}
            />
            <ResponseBlock
              status={200}
              body={`{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "reference": "PAY-A1B2C3",
  "amount": 5000,
  "currency": "XAF",
  "status": "completed",
  "description": "Order #1234",
  "payment_method": "mobile_money",
  "customer_phone": "+237699000000",
  "created_at": "2026-04-03T12:00:00Z",
  "updated_at": "2026-04-03T12:01:30Z"
}`}
            />
          </EndpointSection>

          {/* Cancel Payment */}
          <EndpointSection
            method="POST"
            path="/payments/{id}/cancel"
            title="Cancel Payment"
            description="Cancel a pending payment. Only payments with status 'pending' can be cancelled."
          >
            <CodeBlock
              language="javascript"
              code={`const response = await fetch(
  "${BASE_URL}/payments/d290f1ee-6c54-4b01-90e6-d701748f0851/cancel",
  {
    method: "POST",
    headers: {
      "X-API-Key": "ltcpay_test_abc123...",
      "X-API-Secret": "your_api_secret",
    },
  }
);
const payment = await response.json();
console.log(payment.status); // "cancelled"`}
            />
            <ResponseBlock
              status={200}
              body={`{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "reference": "PAY-A1B2C3",
  "amount": 5000,
  "currency": "XAF",
  "status": "cancelled",
  "created_at": "2026-04-03T12:00:00Z",
  "updated_at": "2026-04-03T12:05:00Z"
}`}
            />
          </EndpointSection>
        </section>

        {/* Webhooks */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="webhooks">Webhooks</h2>
          <p className="text-sm text-gray-600">
            LTCPay sends <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">POST</code> requests
            to your <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">callback_url</code> when a
            payment status changes. The payload is signed with your <strong>webhook secret</strong> in
            the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-Webhook-Signature</code> header.
          </p>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Webhook Payload</h3>
            <CodeBlock
              language="json"
              code={`{
  "event": "payment.completed",
  "data": {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "reference": "PAY-A1B2C3",
    "amount": 5000,
    "currency": "XAF",
    "status": "completed",
    "payment_method": "mobile_money",
    "customer_phone": "+237699000000",
    "metadata": { "order_id": "1234" },
    "created_at": "2026-04-03T12:00:00Z",
    "updated_at": "2026-04-03T12:01:30Z"
  }
}`}
            />

            <h3 className="text-sm font-semibold text-gray-900">Verifying Signatures</h3>
            <CodeBlock
              language="javascript"
              code={`import crypto from "crypto";

function verifyWebhook(payload, signature, webhookSecret) {
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your Express/Next.js handler:
app.post("/webhooks/ltcpay", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const isValid = verifyWebhook(
    JSON.stringify(req.body),
    signature,
    process.env.LTCPAY_WEBHOOK_SECRET
  );

  if (!isValid) return res.status(401).send("Invalid signature");

  const { event, data } = req.body;
  if (event === "payment.completed") {
    // Mark order as paid
    console.log("Payment completed:", data.reference);
  }

  res.status(200).send("OK");
});`}
            />
            <CodeBlock
              language="python"
              code={`import hmac, hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# In your FastAPI/Flask handler:
@app.post("/webhooks/ltcpay")
async def handle_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Webhook-Signature", "")

    if not verify_webhook(body, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=401)

    data = await request.json()
    if data["event"] == "payment.completed":
        print(f"Payment completed: {data['data']['reference']}")

    return {"status": "ok"}`}
            />

            <h3 className="text-sm font-semibold text-gray-900">Webhook Events</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Event</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-mono text-xs">payment.completed</td><td className="py-2 text-xs text-gray-600">Payment was successfully processed</td></tr>
                  <tr><td className="py-2 font-mono text-xs">payment.failed</td><td className="py-2 text-xs text-gray-600">Payment failed (insufficient funds, timeout, etc.)</td></tr>
                  <tr><td className="py-2 font-mono text-xs">payment.expired</td><td className="py-2 text-xs text-gray-600">Payment expired before completion</td></tr>
                  <tr><td className="py-2 font-mono text-xs">payment.cancelled</td><td className="py-2 text-xs text-gray-600">Payment was cancelled via API</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Error Handling */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="errors">Error Handling</h2>
          <p className="text-sm text-gray-600">
            The API returns standard HTTP status codes. Errors include a JSON body with a <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">detail</code> field.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-mono text-xs">200</td><td className="py-2 text-xs text-gray-600">Success</td></tr>
                  <tr><td className="py-2 font-mono text-xs">201</td><td className="py-2 text-xs text-gray-600">Resource created</td></tr>
                  <tr><td className="py-2 font-mono text-xs">400</td><td className="py-2 text-xs text-gray-600">Bad request — check parameters</td></tr>
                  <tr><td className="py-2 font-mono text-xs">401</td><td className="py-2 text-xs text-gray-600">Invalid or missing API credentials</td></tr>
                  <tr><td className="py-2 font-mono text-xs">404</td><td className="py-2 text-xs text-gray-600">Resource not found</td></tr>
                  <tr><td className="py-2 font-mono text-xs">409</td><td className="py-2 text-xs text-gray-600">Conflict (e.g. duplicate email)</td></tr>
                  <tr><td className="py-2 font-mono text-xs">429</td><td className="py-2 text-xs text-gray-600">Rate limit exceeded</td></tr>
                  <tr><td className="py-2 font-mono text-xs">500</td><td className="py-2 text-xs text-gray-600">Server error — contact support</td></tr>
                </tbody>
              </table>
            </div>
            <CodeBlock
              language="json"
              code={`{
  "detail": "A merchant with this email already exists"
}`}
            />
          </div>
        </section>

        {/* Test Mode */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="testing">Test Mode</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-900">Sandbox Testing</h3>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              <li>Use your <strong>test API key</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_test_*</code>) — no real money is charged</li>
              <li>All endpoints work identically in test and live mode</li>
              <li>Test payments auto-complete after a few seconds for easy integration testing</li>
              <li>Webhook callbacks are sent for test payments just like live ones</li>
              <li>Switch to your <strong>live API key</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_live_*</code>) when ready for production</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 pb-12 text-center text-sm text-gray-500">
          <p>Need help? Contact us at <a href="mailto:support@ltcgroup.site" className="text-navy-500 hover:underline">support@ltcgroup.site</a></p>
          <p className="mt-1">LTCPay &mdash; Payment Gateway for Africa</p>
        </footer>
      </main>
    </div>
  );
}
