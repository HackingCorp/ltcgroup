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
            <th className="pb-2 font-medium">Param&egrave;tre</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Requis</th>
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
                  <span className="text-xs font-medium text-red-500">requis</span>
                ) : (
                  <span className="text-xs text-gray-400">optionnel</span>
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
        <span className="text-xs font-medium text-gray-500">R&eacute;ponse</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Documentation API</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Int&eacute;grez LTCPay dans votre application pour accepter les paiements via Mobile Money
            et autres moyens de paiement locaux en Afrique.
          </p>
          <div className="mt-5 rounded-xl bg-navy-500 p-5">
            <p className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-1">Base URL</p>
            <code className="text-lg font-mono text-white">{BASE_URL}</code>
          </div>
        </section>

        {/* Integration Modes */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="integration-modes">Modes d&apos;int&eacute;gration</h2>

          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <h3 className="text-base font-bold text-blue-900">Flux de paiement unifi&eacute; — Plus de redirections navigateur !</h3>
            </div>
            <p className="text-sm text-blue-800">
              Les modes <strong>SDK</strong> et <strong>Direct API</strong> utilisent la m&ecirc;me <strong>interface de paiement native</strong> via TouchPay Direct API.
              Tous les paiements sont trait&eacute;s serveur-&agrave;-serveur avec <strong>z&eacute;ro redirection navigateur</strong>.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* SDK Mode */}
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-purple-500 px-2 py-1 text-xs font-bold text-white">SDK</span>
                <h3 className="text-sm font-semibold text-purple-900">Liens de paiement</h3>
              </div>
              <p className="text-sm text-purple-800">
                <strong>Id&eacute;al pour :</strong> Liens de paiement r&eacute;utilisables, QR codes, factures
              </p>
              <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                <li>Cr&eacute;er un paiement <strong>sans</strong> op&eacute;rateur/t&eacute;l&eacute;phone</li>
                <li>Le client choisit sur la page de paiement LtcPay</li>
                <li>&#10003; Aucune redirection navigateur</li>
                <li>Formulaire natif avec s&eacute;lecteur d&apos;op&eacute;rateur + saisie t&eacute;l&eacute;phone</li>
                <li>Polling pour mises &agrave; jour en temps r&eacute;el</li>
              </ul>
              <div className="pt-2 border-t border-purple-200">
                <p className="text-xs font-medium text-purple-700">Parfait pour les URLs de paiement partageables</p>
              </div>
            </div>

            {/* Direct API Mode */}
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-green-500 px-2 py-1 text-xs font-bold text-white">DIRECT_API</span>
                <h3 className="text-sm font-semibold text-green-900">Applications mobiles</h3>
              </div>
              <p className="text-sm text-green-800">
                <strong>Id&eacute;al pour :</strong> Applications mobiles natives avec UI personnalis&eacute;e
              </p>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li>Fournir op&eacute;rateur + t&eacute;l&eacute;phone <strong>&agrave; la cr&eacute;ation</strong></li>
                <li>Initiation imm&eacute;diate serveur-&agrave;-serveur</li>
                <li>&#10003; Pas besoin de navigateur/WebView</li>
                <li>Construisez votre propre UI native</li>
                <li>Polling via API pour les mises &agrave; jour de statut</li>
              </ul>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs font-bold text-green-900">&#9888;&#65039; Requis : operator + customer_phone &agrave; la cr&eacute;ation</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 space-y-2">
            <p className="text-sm font-bold text-green-900">
              &#10024; D&eacute;tection automatique du mode — Aucune configuration n&eacute;cessaire !
            </p>
            <p className="text-sm text-green-800">
              Le mode de paiement est <strong>d&eacute;tect&eacute; automatiquement</strong> selon les champs fournis :
            </p>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside ml-2">
              <li><strong>Sans</strong> operator/phone → mode SDK (le client saisit sur la page de paiement)</li>
              <li><strong>Avec</strong> operator + phone → mode Direct API (initiation imm&eacute;diate)</li>
            </ul>
            <p className="text-sm text-green-800">
              Les deux modes sont <strong>toujours disponibles</strong> — cr&eacute;ez le paiement et le syst&egrave;me choisit le bon mode automatiquement !
            </p>
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Comparaison des modes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 pr-4 font-medium">Fonctionnalit&eacute;</th>
                    <th className="pb-2 pr-4 font-medium">SDK (Liens de paiement)</th>
                    <th className="pb-2 font-medium">Direct API (Mobile)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Id&eacute;al pour</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">Liens de paiement, QR codes, factures</td>
                    <td className="py-2 text-xs text-gray-600">Apps mobiles natives avec UI personnalis&eacute;e</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Redirections navigateur</td>
                    <td className="py-2 pr-4 text-xs text-gray-600"><strong>&#10003; Aucune redirection</strong></td>
                    <td className="py-2 text-xs text-gray-600"><strong>&#10003; Aucune redirection</strong></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Requis &agrave; la cr&eacute;ation</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">amount, currency</td>
                    <td className="py-2 text-xs text-gray-600"><strong>amount, currency, operator, customer_phone</strong></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">S&eacute;lection op&eacute;rateur</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">Le client choisit sur la page LtcPay</td>
                    <td className="py-2 text-xs text-gray-600">Le marchand fournit &agrave; la cr&eacute;ation</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Statut initial</td>
                    <td className="py-2 pr-4"><code className="text-xs rounded bg-gray-100 px-1 py-0.5">PENDING</code></td>
                    <td className="py-2"><code className="text-xs rounded bg-gray-100 px-1 py-0.5">PROCESSING</code></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Interface de paiement</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">Formulaire natif LtcPay (op&eacute;rateur + t&eacute;l&eacute;phone)</td>
                    <td className="py-2 text-xs text-gray-600">Votre propre UI native</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Initiation du paiement</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">&Agrave; la soumission → TouchPay Direct API</td>
                    <td className="py-2 text-xs text-gray-600">Imm&eacute;diate → TouchPay Direct API</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">V&eacute;rification du statut</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">Polling automatique sur la page + webhooks</td>
                    <td className="py-2 text-xs text-gray-600">Poll GET /payments/{'{reference}'} + webhooks</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Complexit&eacute; d&apos;int&eacute;gration</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">&#11088;&#11088;&#11088; Simple (redirection)</td>
                    <td className="py-2 text-xs text-gray-600">&#11088;&#11088;&#11088;&#11088; Moyen (UI + polling)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-700">Liens r&eacute;utilisables</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">&#10003; Oui — parfait pour les factures</td>
                    <td className="py-2 text-xs text-gray-600">&#10007; Non — li&eacute; &agrave; un client sp&eacute;cifique</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-900">&#128161; Mode Direct API (Initiation imm&eacute;diate)</h3>
            <p className="text-sm text-amber-800">
              Pour d&eacute;clencher le <strong>mode Direct API</strong> avec initiation imm&eacute;diate, fournissez les <strong>deux</strong> champs :
            </p>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              <li><code className="rounded bg-amber-100 px-1 py-0.5 text-xs">operator</code> — Op&eacute;rateur Mobile Money : <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">&quot;MTN&quot;</code> ou <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">&quot;ORANGE&quot;</code></li>
              <li><code className="rounded bg-amber-100 px-1 py-0.5 text-xs">customer_phone</code> — Num&eacute;ro du client (9 chiffres sans indicatif, ex: <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">6XXXXXXXX</code>)</li>
            </ul>
            <p className="text-sm text-amber-800">
              Sans ces champs, le paiement utilise le <strong>mode SDK</strong> (le client saisit les infos sur la page de paiement).
            </p>
          </div>
        </section>

        {/* Authentication */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="authentication">Authentification</h2>
          <p className="text-sm text-gray-600">
            Toutes les requ&ecirc;tes API doivent inclure votre cl&eacute; API dans le header <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Key</code>
            et votre secret API dans le header <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Secret</code>.
            Utilisez les <strong>cl&eacute;s de test</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_test_*</code>) pour le sandbox
            et les <strong>cl&eacute;s live</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_live_*</code>) pour la production.
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
          <h2 className="text-xl font-bold text-gray-900" id="endpoints">Points d&apos;acc&egrave;s (Endpoints)</h2>

          {/* Create Payment */}
          <EndpointSection
            method="POST"
            path="/payments"
            title="Cr&eacute;er un paiement"
            description="Cr&eacute;er un nouveau paiement. Le mode est d&eacute;tect&eacute; automatiquement — aucune configuration n&eacute;cessaire !"
            defaultOpen
          >
            <div className="mb-4 rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-900 mb-2">&#10024; D&eacute;tection automatique du mode</p>
              <ul className="text-sm text-green-800 space-y-1.5 list-disc list-inside">
                <li><strong>Sans operator/phone :</strong> mode SDK → retourne <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_url</code> → le client saisit sur la page</li>
                <li><strong>Avec operator + phone :</strong> mode Direct API → initiation imm&eacute;diate → statut <code className="rounded bg-green-100 px-1 py-0.5 text-xs">PROCESSING</code></li>
                <li>Pas besoin de sp&eacute;cifier <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_mode</code> — c&apos;est automatique !</li>
                <li>Les deux modes utilisent TouchPay Direct API (z&eacute;ro redirection navigateur)</li>
              </ul>
            </div>

            <ParamTable
              params={[
                { name: "amount", type: "number", required: true, desc: "Montant en unit\u00e9 de devise (ex: 5000 = 5 000 XAF). Minimum : 100." },
                { name: "currency", type: "string", required: false, desc: "Code devise ISO (XAF, XOF, EUR, USD). Par d\u00e9faut : XAF" },
                { name: "operator", type: "string", required: false, desc: "Op\u00e9rateur Mobile Money : 'MTN' ou 'ORANGE'. D\u00e9clenche le mode Direct API si fourni avec customer_phone." },
                { name: "customer_phone", type: "string", required: false, desc: "T\u00e9l\u00e9phone client (9 chiffres sans indicatif, ex: 677179670). Le pr\u00e9fixe pays est retir\u00e9 automatiquement." },
                { name: "payment_mode", type: "string", required: false, desc: "Forcer le mode : 'SDK' ou 'DIRECT_API'. D\u00e9tect\u00e9 automatiquement si omis (recommand\u00e9)." },
                { name: "merchant_reference", type: "string", required: false, desc: "Votre r\u00e9f\u00e9rence interne commande/facture pour la r\u00e9conciliation" },
                { name: "description", type: "string", required: false, desc: "Description du paiement affich\u00e9e au client (max 500 caract\u00e8res)" },
                { name: "customer_info", type: "object", required: false, desc: "Informations client : {name, email, phone}" },
                { name: "callback_url", type: "string", required: false, desc: "URL webhook pour les notifications de paiement (remplace le d\u00e9faut marchand)" },
                { name: "return_url", type: "string", required: false, desc: "URL de redirection du client apr\u00e8s le paiement" },
                { name: "metadata", type: "object", required: false, desc: "Donn\u00e9es cl\u00e9-valeur personnalis\u00e9es attach\u00e9es au paiement" },
              ]}
            />
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Exemple 1 : Mode SDK (Liens de paiement)</h4>
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

              <h4 className="text-sm font-semibold text-gray-900">Exemple 2 : Mode Direct API (Apps mobiles avec UI personnalis&eacute;e)</h4>
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
    customer_phone: "670000000",          // 9 digits sans indicatif (237 auto-stripped)
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

              <h4 className="text-sm font-semibold text-gray-900">Exemples Python</h4>
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
        "customer_phone": "670000000",    # 9 digits sans indicatif
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
              <h4 className="text-sm font-semibold text-gray-900">R&eacute;ponse (Mode SDK)</h4>
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

              <h4 className="text-sm font-semibold text-gray-900">R&eacute;ponse (Mode Direct API)</h4>
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
                  <strong>Note :</strong> En mode Direct API, le statut passe imm&eacute;diatement &agrave; <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">PROCESSING</code> car le paiement est initi&eacute; serveur-&agrave;-serveur. Le client re&ccedil;oit une notification push pour approuver sur son app Mobile Money.
                </p>
              </div>
            </div>
          </EndpointSection>

          {/* Get Payment */}
          <EndpointSection
            method="GET"
            path="/payments/{reference}"
            title="Statut d&apos;un paiement"
            description="R&eacute;cup&eacute;rer le statut et les d&eacute;tails d&apos;un paiement par sa r&eacute;f&eacute;rence. En mode Direct API, interrogez cet endpoint toutes les 3-5 secondes pour v&eacute;rifier si le paiement est termin&eacute;."
          >
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900 mb-2">Polling Direct API :</p>
              <p className="text-sm text-green-800">
                Les apps mobiles en mode Direct API doivent interroger cet endpoint toutes les 3-5 secondes pour v&eacute;rifier le statut.
                Arr&ecirc;tez le polling quand le statut devient <code className="rounded bg-green-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-green-100 px-1 py-0.5 text-xs">FAILED</code>, ou apr&egrave;s 2 minutes (timeout).
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

          {/* List Payments */}
          <EndpointSection
            method="GET"
            path="/payments"
            title="Lister les paiements"
            description="Lister tous les paiements du marchand authentifi&eacute;. Supporte la pagination et le filtrage par statut."
          >
            <ParamTable
              params={[
                { name: "page", type: "number", required: false, desc: "Num\u00e9ro de page (par d\u00e9faut : 1)" },
                { name: "page_size", type: "number", required: false, desc: "\u00c9l\u00e9ments par page, 1-100 (par d\u00e9faut : 20)" },
                { name: "status", type: "string", required: false, desc: "Filtrer par statut : PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED, CANCELLED" },
              ]}
            />
            <CodeBlock
              language="javascript"
              code={`const response = await fetch(
  "${BASE_URL}/payments?page=1&page_size=10&status=COMPLETED",
  {
    headers: {
      "X-API-Key": "ltcpay_test_abc123...",
      "X-API-Secret": "your_api_secret",
    },
  }
);
const data = await response.json();
console.log(data.total_count); // Total matching payments
console.log(data.payments);    // Array of payment objects`}
            />
            <ResponseBlock
              status={200}
              body={`{
  "payments": [
    {
      "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "merchant_id": "a1b2c3d4-...",
      "reference": "PAY-A1B2C3",
      "amount": "5000.00",
      "fee": "87.50",
      "currency": "XAF",
      "status": "COMPLETED",
      "payment_mode": "DIRECT_API",
      "created_at": "2026-04-09T12:00:00Z",
      "updated_at": "2026-04-09T12:01:30Z"
    }
  ],
  "total_count": 42,
  "page": 1,
  "page_size": 10
}`}
            />
          </EndpointSection>
        </section>

        {/* Fees */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="fees">Frais</h2>
          <p className="text-sm text-gray-600">
            Des frais sont appliqu&eacute;s sur chaque paiement. Le taux de commission est configur&eacute; par l&apos;administrateur LtcPay pour chaque marchand.
            Par d&eacute;faut, les frais sont support&eacute;s par le marchand (d&eacute;duits du montant re&ccedil;u).
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Mode d&apos;imputation des frais</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Mode</th>
                    <th className="pb-2 font-medium">Qui paie ?</th>
                    <th className="pb-2 font-medium">Exemple (montant: 10 000 XAF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 font-mono text-xs">MERCHANT</td>
                    <td className="py-2 text-xs text-gray-600">Le marchand supporte les frais. Le client paie le montant exact.</td>
                    <td className="py-2 text-xs text-gray-600">Client paie <strong>10 000</strong>, marchand re&ccedil;oit montant - frais</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">CLIENT</td>
                    <td className="py-2 text-xs text-gray-600">Le client paie les frais en plus du montant. Le marchand re&ccedil;oit le montant int&eacute;gral.</td>
                    <td className="py-2 text-xs text-gray-600">Client paie <strong>10 000 + frais</strong>, marchand re&ccedil;oit 10 000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                Le champ <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">fee</code> est retourn&eacute; dans toutes les r&eacute;ponses de paiement et dans les webhooks. En mode <strong>CLIENT</strong>, le champ <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">amount</code> refl&egrave;te le montant total factur&eacute; (montant de base + frais).
              </p>
            </div>
          </div>
        </section>

        {/* Phone Number Format */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="phone-format">Format du num&eacute;ro de t&eacute;l&eacute;phone</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <p className="text-sm text-gray-600">
              Pour le mode <strong>Direct API</strong>, le num&eacute;ro de t&eacute;l&eacute;phone doit contenir <strong>9 chiffres</strong> sans indicatif pays.
              LtcPay normalise automatiquement le num&eacute;ro en retirant le pr&eacute;fixe <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">237</code>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Format envoy&eacute;</th>
                    <th className="pb-2 font-medium">Accept&eacute; ?</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 font-mono text-xs">677179670</td>
                    <td className="py-2 text-xs text-green-600 font-medium">&#10003; Oui</td>
                    <td className="py-2 text-xs text-gray-600">Format correct (9 chiffres)</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">237677179670</td>
                    <td className="py-2 text-xs text-green-600 font-medium">&#10003; Oui</td>
                    <td className="py-2 text-xs text-gray-600">Le pr&eacute;fixe 237 est retir&eacute; automatiquement</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">+237677179670</td>
                    <td className="py-2 text-xs text-green-600 font-medium">&#10003; Oui</td>
                    <td className="py-2 text-xs text-gray-600">Le +237 est retir&eacute; automatiquement</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">00237677179670</td>
                    <td className="py-2 text-xs text-green-600 font-medium">&#10003; Oui</td>
                    <td className="py-2 text-xs text-gray-600">Le 00237 est retir&eacute; automatiquement</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                <strong>Recommandation :</strong> Envoyez directement le format &agrave; 9 chiffres pour &eacute;viter toute ambigu&iuml;t&eacute;.
              </p>
            </div>
          </div>
        </section>

        {/* Webhooks */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="webhooks">Webhooks</h2>
          <p className="text-sm text-gray-600">
            LTCPay envoie des requ&ecirc;tes <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">POST</code>
            &agrave; votre <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">callback_url</code> lorsque le
            statut d&apos;un paiement change. Le payload est sign&eacute; avec HMAC-SHA256 en utilisant votre <strong>webhook secret</strong>.
          </p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Note :</strong> Les webhooks fonctionnent de mani&egrave;re identique pour les modes SDK et Direct API. Vous recevrez le m&ecirc;me payload lorsqu&apos;un paiement atteint un statut terminal (<code className="rounded bg-blue-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">FAILED</code>, etc.).
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Headers des webhooks</h3>
            <p className="text-sm text-gray-600">
              Chaque requ&ecirc;te webhook inclut les headers suivants :
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
                  <tr><td className="py-2 font-mono text-xs">X-LtcPay-Signature</td><td className="py-2 text-xs text-gray-600">Signature HMAC-SHA256 du body JSON brut</td></tr>
                  <tr><td className="py-2 font-mono text-xs">X-LtcPay-Event</td><td className="py-2 text-xs text-gray-600">Type d&apos;&eacute;v&eacute;nement (ex: <code className="bg-gray-100 px-1 rounded">payment.status_changed</code>)</td></tr>
                  <tr><td className="py-2 font-mono text-xs">X-LtcPay-Delivery-Id</td><td className="py-2 text-xs text-gray-600">ID de livraison unique pour l&apos;idempotence</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">Payload du webhook</h3>
            <p className="text-sm text-gray-600">
              L&apos;&eacute;v&eacute;nement est toujours <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">payment.status_changed</code>. V&eacute;rifiez le champ <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">data.status</code> pour d&eacute;terminer le nouveau statut.
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
    "fee": 87.5,
    "currency": "XAF",
    "status": "COMPLETED",
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

            <h3 className="text-sm font-semibold text-gray-900">V&eacute;rification des signatures</h3>
            <p className="text-sm text-gray-600">
              La signature est calcul&eacute;e comme <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">HMAC-SHA256(raw_body, webhook_secret)</code>. Vous <strong>devez</strong> v&eacute;rifier la signature en utilisant le body brut de la requ&ecirc;te (pas une version re-s&eacute;rialis&eacute;e) pour &eacute;viter les erreurs.
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

            <h3 className="text-sm font-semibold text-gray-900">Statuts de paiement</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Statut</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Terminal ?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 font-mono text-xs">PENDING</td>
                    <td className="py-2 text-xs text-gray-600">Paiement cr&eacute;&eacute;, en attente d&apos;action du client (mode SDK)</td>
                    <td className="py-2 text-xs text-gray-500">Non</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">PROCESSING</td>
                    <td className="py-2 text-xs text-gray-600">Paiement initi&eacute; via Direct API, le client a re&ccedil;u la notification push</td>
                    <td className="py-2 text-xs text-gray-500">Non</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">COMPLETED</td>
                    <td className="py-2 text-xs text-gray-600">Paiement trait&eacute; avec succ&egrave;s</td>
                    <td className="py-2 text-xs font-medium text-green-600">Oui &#10003;</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">FAILED</td>
                    <td className="py-2 text-xs text-gray-600">Paiement &eacute;chou&eacute; (solde insuffisant, timeout, refus&eacute;, etc.)</td>
                    <td className="py-2 text-xs font-medium text-red-600">Oui &#10007;</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">EXPIRED</td>
                    <td className="py-2 text-xs text-gray-600">Lien de paiement expir&eacute; (30 minutes en mode SDK)</td>
                    <td className="py-2 text-xs font-medium text-red-600">Oui &#10007;</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">CANCELLED</td>
                    <td className="py-2 text-xs text-gray-600">Paiement annul&eacute; par le client</td>
                    <td className="py-2 text-xs font-medium text-red-600">Oui &#10007;</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">Politique de r&eacute;essai</h3>
            <p className="text-sm text-gray-600">
              Si votre endpoint retourne un code non-2xx, LTCPay r&eacute;essaie jusqu&apos;&agrave; <strong>5 fois</strong> avec
              un backoff exponentiel (2s, 4s, 8s, 16s, 32s). Votre endpoint doit r&eacute;pondre en moins de <strong>30 secondes</strong>.
            </p>
          </div>

          {/* Webhook Troubleshooting */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-red-900">D&eacute;pannage : &quot;Invalid webhook signature&quot;</h3>
            <p className="text-sm text-red-800">
              Si vous recevez une erreur <code className="rounded bg-red-100 px-1 py-0.5 text-xs">403 Invalid webhook signature</code>, v&eacute;rifiez les points suivants :
            </p>
            <ul className="text-sm text-red-800 space-y-1.5 list-disc list-inside">
              <li>Lisez la signature depuis le header <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-LtcPay-Signature</code> (et non <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-Webhook-Signature</code>)</li>
              <li>Utilisez le <strong>body brut de la requ&ecirc;te</strong> pour la v&eacute;rification HMAC &mdash; ne re-s&eacute;rialisez PAS le JSON pars&eacute; (<code className="rounded bg-red-100 px-1 py-0.5 text-xs">JSON.stringify(req.body)</code> peut produire un formatage diff&eacute;rent)</li>
              <li>Assurez-vous d&apos;utiliser votre <strong>webhook secret marchand</strong> (d&eacute;fini lors de l&apos;inscription), et non votre cl&eacute; API ou secret API</li>
              <li>L&apos;algorithme de signature est <code className="rounded bg-red-100 px-1 py-0.5 text-xs">HMAC-SHA256</code> avec sortie hex digest</li>
              <li>Si vous n&apos;avez pas de webhook secret, contactez l&apos;administrateur LTCPay pour en configurer un</li>
            </ul>
          </div>
        </section>

        {/* Error Handling */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="errors">Gestion des erreurs</h2>
          <p className="text-sm text-gray-600">
            L&apos;API retourne des codes HTTP standards. Les erreurs incluent un body JSON avec un champ <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">detail</code>.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">Code</th>
                    <th className="pb-2 font-medium">Signification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-mono text-xs">200</td><td className="py-2 text-xs text-gray-600">Succ&egrave;s</td></tr>
                  <tr><td className="py-2 font-mono text-xs">201</td><td className="py-2 text-xs text-gray-600">Ressource cr&eacute;&eacute;e</td></tr>
                  <tr><td className="py-2 font-mono text-xs">400</td><td className="py-2 text-xs text-gray-600">Requ&ecirc;te invalide — v&eacute;rifiez les param&egrave;tres</td></tr>
                  <tr><td className="py-2 font-mono text-xs">401</td><td className="py-2 text-xs text-gray-600">Identifiants API invalides ou manquants</td></tr>
                  <tr><td className="py-2 font-mono text-xs">404</td><td className="py-2 text-xs text-gray-600">Ressource introuvable</td></tr>
                  <tr><td className="py-2 font-mono text-xs">409</td><td className="py-2 text-xs text-gray-600">Conflit (ex: email d&eacute;j&agrave; utilis&eacute;)</td></tr>
                  <tr><td className="py-2 font-mono text-xs">429</td><td className="py-2 text-xs text-gray-600">Limite de requ&ecirc;tes d&eacute;pass&eacute;e</td></tr>
                  <tr><td className="py-2 font-mono text-xs">500</td><td className="py-2 text-xs text-gray-600">Erreur serveur — contactez le support</td></tr>
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
          <h2 className="text-xl font-bold text-gray-900" id="testing">Mode test</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-900">Tests en sandbox</h3>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              <li>Utilisez votre <strong>cl&eacute; API de test</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_test_*</code>) — aucun argent r&eacute;el n&apos;est d&eacute;bit&eacute;</li>
              <li>Tous les endpoints fonctionnent de mani&egrave;re identique en mode test et live</li>
              <li>Les paiements de test se compl&egrave;tent automatiquement apr&egrave;s quelques secondes</li>
              <li>Les webhooks sont envoy&eacute;s pour les paiements de test comme pour les paiements r&eacute;els</li>
              <li>Passez &agrave; votre <strong>cl&eacute; API live</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_live_*</code>) quand vous &ecirc;tes pr&ecirc;t pour la production</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 pb-12 text-center text-sm text-gray-500">
          <p>Besoin d&apos;aide ? Contactez-nous &agrave; <a href="mailto:support@ltcgroup.site" className="text-navy-500 hover:underline">support@ltcgroup.site</a></p>
          <p className="mt-1">LTCPay &mdash; Passerelle de paiement pour l&apos;Afrique</p>
        </footer>
      </main>
    </div>
  );
}
