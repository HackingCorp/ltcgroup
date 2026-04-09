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

function CopyDocsButton() {
  const [copied, setCopied] = useState(false);
  const copyDocs = () => {
    const main = document.querySelector("main");
    if (!main) return;
    // Collect text content from the docs, preserving code blocks
    const blocks: string[] = [];
    main.querySelectorAll("section, .rounded-xl").forEach((section) => {
      const headings = section.querySelectorAll("h1, h2, h3");
      headings.forEach((h) => {
        const level = h.tagName === "H1" ? "#" : h.tagName === "H2" ? "##" : "###";
        blocks.push(`${level} ${h.textContent}`);
      });
    });
    // Fallback: copy innerText of main
    const text = main.innerText || main.textContent || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button
      onClick={copyDocs}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : "Copy docs"}
    </button>
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
          <div className="flex items-center gap-3">
            <CopyDocsButton />
            <Link
              href="/auth/login"
              className="rounded-lg bg-navy-500 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 transition-colors"
            >
              Dashboard
            </Link>
          </div>
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

        {/* Integration Modes */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="integration-modes">Integration Modes</h2>

          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <h3 className="text-base font-bold text-blue-900">Unified Payment Flow - No More Browser Redirections!</h3>
            </div>
            <p className="text-sm text-blue-800">
              Both <strong>SDK</strong> and <strong>Direct API</strong> modes now use the same <strong>native payment interface</strong> with TouchPay Direct API.
              All payments are processed server-to-server with <strong>zero browser redirections</strong>.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* SDK Mode */}
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-purple-500 px-2 py-1 text-xs font-bold text-white">SDK</span>
                <h3 className="text-sm font-semibold text-purple-900">Payment Links</h3>
              </div>
              <p className="text-sm text-purple-800">
                <strong>Best for:</strong> Reusable payment links, QR codes, invoices
              </p>
              <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                <li>Create payment <strong>without</strong> operator/phone</li>
                <li>Customer chooses on LtcPay payment page</li>
                <li>✅ No browser redirections</li>
                <li>Native form with operator selector + phone input</li>
                <li>Polling for real-time status updates</li>
              </ul>
              <div className="pt-2 border-t border-purple-200">
                <p className="text-xs font-medium text-purple-700">Perfect for shareable payment URLs</p>
              </div>
            </div>

            {/* Direct API Mode */}
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-green-500 px-2 py-1 text-xs font-bold text-white">DIRECT_API</span>
                <h3 className="text-sm font-semibold text-green-900">Mobile Apps</h3>
              </div>
              <p className="text-sm text-green-800">
                <strong>Best for:</strong> Native mobile apps with custom UI
              </p>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li>Provide operator + phone <strong>at creation</strong></li>
                <li>Immediate server-to-server initiation</li>
                <li>✅ No browser/WebView needed</li>
                <li>Build your own native UI</li>
                <li>Poll via API for status updates</li>
              </ul>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs font-bold text-green-900">⚠️ Requires: operator + customer_phone at creation</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 space-y-2">
            <p className="text-sm font-bold text-green-900">
              ✨ Automatic Mode Detection - No Configuration Needed!
            </p>
            <p className="text-sm text-green-800">
              The payment mode is <strong>automatically detected</strong> based on the fields you provide:
            </p>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside ml-2">
              <li><strong>Without</strong> operator/phone → SDK mode (customer enters on payment page)</li>
              <li><strong>With</strong> operator + phone → Direct API mode (immediate initiation)</li>
            </ul>
            <p className="text-sm text-green-800">
              Both modes are <strong>always available</strong> - just create the payment and the system chooses the right mode automatically!
            </p>
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Mode Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 pr-4 font-medium">Feature</th>
                    <th className="pb-2 pr-4 font-medium">SDK (Payment Links)</th>
                    <th className="pb-2 font-medium">Direct API (Mobile)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Best for</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">Payment links, QR codes, invoices</td>
                    <td className="py-2 text-xs text-gray-600">Native mobile apps with custom UI</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Browser redirects</td>
                    <td className="py-2 pr-4 text-xs text-gray-600"><strong>✅ No redirections</strong></td>
                    <td className="py-2 text-xs text-gray-600"><strong>✅ No redirections</strong></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Required at creation</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">amount, currency</td>
                    <td className="py-2 text-xs text-gray-600"><strong>amount, currency, operator, customer_phone</strong></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Operator selection</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">Customer chooses on LtcPay payment page</td>
                    <td className="py-2 text-xs text-gray-600">Merchant provides at creation</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Initial status</td>
                    <td className="py-2 pr-4"><code className="text-xs rounded bg-gray-100 px-1 py-0.5">PENDING</code></td>
                    <td className="py-2"><code className="text-xs rounded bg-gray-100 px-1 py-0.5">PROCESSING</code></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Payment UI</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">LtcPay native form (operator + phone)</td>
                    <td className="py-2 text-xs text-gray-600">Your custom native UI</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Payment initiation</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">On form submit → TouchPay Direct API</td>
                    <td className="py-2 text-xs text-gray-600">Immediate → TouchPay Direct API</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Status check</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">Auto-polling on payment page + webhooks</td>
                    <td className="py-2 text-xs text-gray-600">Poll GET /payments/{'{reference}'} + webhooks</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Integration complexity</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">⭐⭐⭐ Simple (just redirect)</td>
                    <td className="py-2 text-xs text-gray-600">⭐⭐⭐⭐ Medium (UI + polling)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Reusable links</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">✅ Yes - perfect for invoices</td>
                    <td className="py-2 text-xs text-gray-600">❌ No - tied to specific customer</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-900">💡 Direct API Mode (Immediate Initiation)</h3>
            <p className="text-sm text-amber-800">
              To trigger <strong>Direct API mode</strong> with immediate payment initiation, provide <strong>both</strong> fields:
            </p>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              <li><code className="rounded bg-amber-100 px-1 py-0.5 text-xs">operator</code> - Mobile Money operator: <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">&quot;MTN&quot;</code> or <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">&quot;ORANGE&quot;</code></li>
              <li><code className="rounded bg-amber-100 px-1 py-0.5 text-xs">customer_phone</code> - Customer phone number in format <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">237XXXXXXXXX</code></li>
            </ul>
            <p className="text-sm text-amber-800">
              Without these fields, the payment defaults to <strong>SDK mode</strong> (customer enters info on payment page).
            </p>
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
            description="Create a new payment. Mode is automatically detected - no configuration needed!"
            defaultOpen
          >
            <div className="mb-4 rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-900 mb-2">✨ Automatic Mode Detection</p>
              <ul className="text-sm text-green-800 space-y-1.5 list-disc list-inside">
                <li><strong>Without operator/phone:</strong> SDK mode → returns <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_url</code> → customer enters info on payment page</li>
                <li><strong>With operator + phone:</strong> Direct API mode → immediate initiation → status <code className="rounded bg-green-100 px-1 py-0.5 text-xs">PROCESSING</code></li>
                <li>No need to specify <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_mode</code> - it&apos;s automatic!</li>
                <li>Both modes use TouchPay Direct API (zero browser redirections)</li>
              </ul>
            </div>

            <ParamTable
              params={[
                { name: "amount", type: "number", required: true, desc: "Amount in smallest currency unit (e.g. 5000 = 5,000 XAF)" },
                { name: "currency", type: "string", required: true, desc: "ISO currency code (XAF, XOF, USD)" },
                { name: "operator", type: "string", required: false, desc: "Mobile Money operator: 'MTN' or 'ORANGE'. Triggers Direct API mode if provided with customer_phone." },
                { name: "customer_phone", type: "string", required: false, desc: "Customer phone (format: 237XXXXXXXXX). Triggers Direct API mode if provided with operator." },
                { name: "payment_mode", type: "string", required: false, desc: "Optional override: 'SDK' or 'DIRECT_API'. Auto-detected if omitted (recommended)." },
                { name: "description", type: "string", required: false, desc: "Payment description shown to customer" },
                { name: "customer_info", type: "object", required: false, desc: "Customer details: {name, email, phone}" },
                { name: "callback_url", type: "string", required: false, desc: "Webhook URL for payment notifications" },
                { name: "return_url", type: "string", required: false, desc: "URL to redirect customer after payment completion" },
                { name: "metadata", type: "object", required: false, desc: "Custom key-value data attached to the payment" },
              ]}
            />
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Example 1: SDK Mode (Payment Links)</h4>
              <CodeBlock
                language="javascript"
                code={`// SDK Mode - Create reusable payment link
// Customer will choose operator + enter phone on LtcPay payment page
const response = await fetch("${BASE_URL}/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
  },
  body: JSON.stringify({
    amount: 5000,
    currency: "XAF",
    // payment_mode: "SDK",  // Optional - auto-detected (SDK when no operator/phone)
    description: "Order #1234",
    customer_info: {
      name: "Jean Dupont",
      email: "jean@example.com"
    },
    return_url: "https://myshop.cm/order/1234/success",
    metadata: { order_id: "1234" },
  }),
});

const payment = await response.json();
console.log(payment.reference);    // "PAY-A1B2C3"
console.log(payment.status);       // "PENDING"
console.log(payment.payment_url);  // "https://pay.ltcgroup.site/pay/PAY-A1B2C3"

// Redirect customer to LtcPay native payment page
// No redirections to TouchPay - everything happens on LtcPay page!
window.location.href = payment.payment_url;

// Customer will see:
// 1. Native form with MTN/Orange selector
// 2. Phone number input
// 3. Submit → TouchPay Direct API initiation
// 4. Polling UI → redirect to return_url when COMPLETED`}
              />

              <h4 className="text-sm font-semibold text-gray-900">Example 2: Direct API Mode (Mobile Apps with Custom UI)</h4>
              <CodeBlock
                language="javascript"
                code={`// Direct API Mode - For mobile apps building custom native UI
// App shows its own operator selector + phone input, then creates payment
// ⚠️ IMPORTANT: operator and customer_phone are REQUIRED
const response = await fetch("${BASE_URL}/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
  },
  body: JSON.stringify({
    amount: 5000,
    currency: "XAF",
    // payment_mode: "DIRECT_API",       // Optional - auto-detected when operator+phone provided
    operator: "MTN",                      // Triggers Direct API mode
    customer_phone: "237670000000",       // Triggers Direct API mode (format: 237XXXXXXXXX)
    description: "Order #1234",
    customer_info: {
      name: "Jean Dupont",
      email: "jean@example.com"
    },
    metadata: { order_id: "1234" },
  }),
});

const payment = await response.json();
console.log(payment.reference);  // "PAY-A1B2C3"
console.log(payment.status);     // "PROCESSING" - payment initiated immediately!

// Backend called TouchPay Direct API - customer receives push notification
// App shows native "Confirm on your phone" UI + polls for status
async function pollPaymentStatus(reference) {
  const maxAttempts = 40; // 2 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusResp = await fetch(\`${BASE_URL}/payments/\${reference}\`, {
      headers: {
        "X-API-Key": "ltcpay_test_abc123...",
        "X-API-Secret": "your_api_secret",
      },
    });

    const payment = await statusResp.json();

    if (payment.status === "COMPLETED") {
      // Show success screen in app
      console.log("Payment successful!");
      return payment;
    } else if (payment.status === "FAILED") {
      // Show error screen in app
      console.log("Payment failed");
      return payment;
    }
  }
  console.log("Payment timeout");
}

pollPaymentStatus(payment.reference);`}
              />

              <h4 className="text-sm font-semibold text-gray-900">Python Examples</h4>
              <CodeBlock
                language="python"
                code={`import httpx
import time

headers = {
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
}

# SDK Mode (web) - no operator/phone → auto-detected as SDK
sdk_payment = httpx.post(
    "${BASE_URL}/payments",
    headers=headers,
    json={
        "amount": 5000,
        "currency": "XAF",
        # "payment_mode": "SDK",  # Optional - auto-detected
        "description": "Order #1234",
        "customer_info": {
            "name": "Jean Dupont",
            "email": "jean@example.com",
        },
    },
).json()
print(f"Redirect to: {sdk_payment['payment_url']}")

# Direct API Mode (mobile) - operator+phone → auto-detected as DIRECT_API
direct_payment = httpx.post(
    "${BASE_URL}/payments",
    headers=headers,
    json={
        "amount": 5000,
        "currency": "XAF",
        # "payment_mode": "DIRECT_API",  # Optional - auto-detected
        "operator": "MTN",              # Triggers Direct API mode
        "customer_phone": "237670000000", # Triggers Direct API mode
        "description": "Order #1234",
    },
).json()
print(f"Status: {direct_payment['status']}")  # "PROCESSING"

# Poll for completion
def poll_payment(reference: str, max_attempts: int = 40):
    for _ in range(max_attempts):
        time.sleep(3)
        payment = httpx.get(
            f"${BASE_URL}/payments/{reference}",
            headers=headers,
        ).json()

        if payment["status"] in ("COMPLETED", "FAILED"):
            return payment

    return None  # Timeout

result = poll_payment(direct_payment["reference"])
print(f"Final status: {result['status']}")`}
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Response (SDK Mode)</h4>
              <ResponseBlock
                status={201}
                body={`{
  "payment_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "reference": "PAY-A1B2C3",
  "payment_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "amount": "5000.00",
  "currency": "XAF",
  "status": "PENDING",
  "payment_mode": "SDK",
  "payment_url": "https://pay.ltcgroup.site/pay/PAY-A1B2C3",
  "created_at": "2026-04-09T12:00:00Z"
}`}
              />

              <h4 className="text-sm font-semibold text-gray-900">Response (Direct API Mode)</h4>
              <ResponseBlock
                status={201}
                body={`{
  "payment_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "reference": "PAY-A1B2C3",
  "payment_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "amount": "5000.00",
  "currency": "XAF",
  "status": "PROCESSING",
  "payment_mode": "DIRECT_API",
  "payment_url": "https://pay.ltcgroup.site/pay/PAY-A1B2C3",
  "created_at": "2026-04-09T12:00:00Z"
}`}
              />
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> In Direct API mode, status immediately becomes <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">PROCESSING</code> because the payment is initiated server-to-server. The customer receives a push notification to approve it on their Mobile Money app.
                </p>
              </div>
            </div>
          </EndpointSection>

          {/* Get Payment */}
          <EndpointSection
            method="GET"
            path="/payments/{reference}"
            title="Get Payment Status"
            description="Retrieve the current status and details of a payment by its reference. For Direct API mode, poll this endpoint every 3-5 seconds to check if payment is completed."
          >
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900 mb-2">Direct API Polling:</p>
              <p className="text-sm text-green-800">
                Mobile apps using Direct API mode should poll this endpoint every 3-5 seconds to check payment status.
                Stop polling when status becomes <code className="rounded bg-green-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-green-100 px-1 py-0.5 text-xs">FAILED</code>, or after 2 minutes (timeout).
              </p>
            </div>
            <CodeBlock
              language="javascript"
              code={`// Get payment status by reference
const response = await fetch(
  "${BASE_URL}/payments/PAY-A1B2C3",
  {
    headers: {
      "X-API-Key": "ltcpay_test_abc123...",
      "X-API-Secret": "your_api_secret",
    },
  }
);
const payment = await response.json();
console.log(payment.status);
// "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED" | "CANCELLED"`}
            />
            <CodeBlock
              language="python"
              code={`# Get payment status
resp = httpx.get(
    f"${BASE_URL}/payments/{reference}",
    headers=headers,
)
payment = resp.json()
print(payment["status"])  # "COMPLETED"`}
            />
            <ResponseBlock
              status={200}
              body={`{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "merchant_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "reference": "PAY-A1B2C3",
  "payment_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "merchant_reference": "order-1234",
  "provider_transaction_id": "1775499394985",
  "amount": "5000.00",
  "fee": "75.00",
  "currency": "XAF",
  "method": "MOBILE_MONEY",
  "status": "COMPLETED",
  "payment_mode": "DIRECT_API",
  "operator": "MTN",
  "operator_transaction_id": "MP210409.1234.A12345",
  "customer_info": {
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "phone": "237670000000"
  },
  "description": "Order #1234",
  "completed_at": "2026-04-09T12:01:30Z",
  "created_at": "2026-04-09T12:00:00Z",
  "updated_at": "2026-04-09T12:01:30Z"
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
            payment status changes. The payload is signed with HMAC-SHA256 using your <strong>webhook secret</strong>.
          </p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Webhooks work identically for both SDK and Direct API modes. You&apos;ll receive the same webhook payload when a payment reaches a terminal status (<code className="rounded bg-blue-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">FAILED</code>, etc.).
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Webhook Headers</h3>
            <p className="text-sm text-gray-600">
              Each webhook request includes the following headers:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Header</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-mono text-xs">X-LtcPay-Signature</td><td className="py-2 text-xs text-gray-600">HMAC-SHA256 signature of the raw JSON body</td></tr>
                  <tr><td className="py-2 font-mono text-xs">X-LtcPay-Event</td><td className="py-2 text-xs text-gray-600">Event type (e.g. <code className="bg-gray-100 px-1 rounded">payment.status_changed</code>)</td></tr>
                  <tr><td className="py-2 font-mono text-xs">X-LtcPay-Delivery-Id</td><td className="py-2 text-xs text-gray-600">Unique delivery ID for idempotency</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">Webhook Payload</h3>
            <p className="text-sm text-gray-600">
              The event is always <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">payment.status_changed</code>. Check the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">data.status</code> field to determine the new status.
            </p>
            <CodeBlock
              language="json"
              code={`{
  "event": "payment.status_changed",
  "data": {
    "payment_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "reference": "PAY-A1B2C3",
    "merchant_reference": "order-1234",
    "provider_transaction_id": "1775499394985",
    "amount": 5000.0,
    "fee": 75.0,
    "currency": "XAF",
    "status": "COMPLETED",
    "payment_mode": "DIRECT_API",
    "operator": "MTN",
    "method": "MOBILE_MONEY",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "237699000000",
    "description": "Order #1234",
    "completed_at": "2026-04-09T18:17:14Z",
    "created_at": "2026-04-09T18:16:08Z"
  },
  "timestamp": "2026-04-09T18:17:14Z"
}`}
            />

            <h3 className="text-sm font-semibold text-gray-900">Verifying Signatures</h3>
            <p className="text-sm text-gray-600">
              The signature is computed as <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">HMAC-SHA256(raw_body, webhook_secret)</code>. You <strong>must</strong> verify the signature using the raw request body (not a re-serialized version) to avoid mismatches.
            </p>
            <CodeBlock
              language="javascript"
              code={`import crypto from "crypto";

function verifyWebhook(rawBody, signature, webhookSecret) {
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)  // Use the raw body string, NOT JSON.stringify(parsed)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express.js example (use express.raw() or express.text() to get raw body):
app.post("/webhooks/ltcpay", express.text({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-ltcpay-signature"];
  const rawBody = req.body; // raw string

  if (!verifyWebhook(rawBody, signature, process.env.LTCPAY_WEBHOOK_SECRET)) {
    return res.status(403).json({ message: "Invalid webhook signature" });
  }

  const { event, data } = JSON.parse(rawBody);
  if (data.status === "COMPLETED") {
    // Mark order as paid
    console.log("Payment completed:", data.reference);
  }

  res.status(200).send("OK");
});`}
            />
            <CodeBlock
              language="python"
              code={`import hmac, hashlib, json

def verify_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    """Verify the X-LtcPay-Signature header."""
    expected = hmac.new(
        secret.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# FastAPI example:
@app.post("/webhooks/ltcpay")
async def handle_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("X-LtcPay-Signature", "")

    if not verify_webhook(raw_body, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    data = json.loads(raw_body)
    if data["data"]["status"] == "COMPLETED":
        print(f"Payment completed: {data['data']['reference']}")

    return {"status": "ok"}`}
            />

            <h3 className="text-sm font-semibold text-gray-900">Payment Statuses</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Terminal?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 font-mono text-xs">PENDING</td>
                    <td className="py-2 text-xs text-gray-600">Payment created, awaiting customer action (SDK mode)</td>
                    <td className="py-2 text-xs text-gray-500">No</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">PROCESSING</td>
                    <td className="py-2 text-xs text-gray-600">Payment initiated via Direct API, customer received push notification</td>
                    <td className="py-2 text-xs text-gray-500">No</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">COMPLETED</td>
                    <td className="py-2 text-xs text-gray-600">Payment was successfully processed</td>
                    <td className="py-2 text-xs font-medium text-green-600">Yes ✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">FAILED</td>
                    <td className="py-2 text-xs text-gray-600">Payment failed (insufficient funds, timeout, declined, etc.)</td>
                    <td className="py-2 text-xs font-medium text-red-600">Yes ✗</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">EXPIRED</td>
                    <td className="py-2 text-xs text-gray-600">Payment link expired (30 minutes for SDK mode)</td>
                    <td className="py-2 text-xs font-medium text-red-600">Yes ✗</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">CANCELLED</td>
                    <td className="py-2 text-xs text-gray-600">Payment was cancelled via API or by customer</td>
                    <td className="py-2 text-xs font-medium text-red-600">Yes ✗</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">Retry Policy</h3>
            <p className="text-sm text-gray-600">
              If your endpoint returns a non-2xx status code, LTCPay retries up to <strong>5 times</strong> with
              exponential backoff (2s, 4s, 8s, 16s, 32s). Your endpoint must respond within <strong>30 seconds</strong>.
            </p>
          </div>

          {/* Webhook Troubleshooting */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-red-900">Troubleshooting: &quot;Invalid webhook signature&quot;</h3>
            <p className="text-sm text-red-800">
              If you receive a <code className="rounded bg-red-100 px-1 py-0.5 text-xs">403 Invalid webhook signature</code> error, check the following:
            </p>
            <ul className="text-sm text-red-800 space-y-1.5 list-disc list-inside">
              <li>Read the signature from the <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-LtcPay-Signature</code> header (not <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-Webhook-Signature</code>)</li>
              <li>Use the <strong>raw request body</strong> for HMAC verification &mdash; do NOT re-serialize the parsed JSON (<code className="rounded bg-red-100 px-1 py-0.5 text-xs">JSON.stringify(req.body)</code> may produce different whitespace/key ordering)</li>
              <li>Make sure you are using your <strong>merchant webhook secret</strong> (set during registration), not your API key or API secret</li>
              <li>The signing algorithm is <code className="rounded bg-red-100 px-1 py-0.5 text-xs">HMAC-SHA256</code> with hex digest output</li>
              <li>If you have not set a webhook secret, contact the LTCPay admin to configure one for your merchant account</li>
            </ul>
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
