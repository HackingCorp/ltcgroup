"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { CodeBlock } from "@/components/ui/code-block";
import { T } from "@/lib/i18n";

const SECTIONS = [
  { id: "intro", label: "Introduction", cat: "Getting started" },
  { id: "auth", label: "Authentication", cat: "Getting started" },
  { id: "create", label: "Create payment", cat: "Payments" },
  { id: "get", label: "Get payment", cat: "Payments" },
  { id: "list", label: "List payments", cat: "Payments" },
  { id: "modes", label: "Payment modes", cat: "Payments" },
  { id: "webhook", label: "Webhook signature", cat: "Webhooks" },
  { id: "events", label: "Event types", cat: "Webhooks" },
  { id: "statuses", label: "Payment statuses", cat: "Reference" },
  { id: "errors", label: "Error codes", cat: "Reference" },
];

const BASE_URL = "https://pay.ltcgroup.site";

/* ── tiny reusable pill ── */
function MethodBadge({ method, color }: { method: string; color: string }) {
  return (
    <span style={{ padding: "2px 6px", borderRadius: 3, background: color, color: "white", fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)" }}>
      {method}
    </span>
  );
}

function EndpointBar({ method, path, color }: { method: string; path: string; color: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 18 }}>
      <MethodBadge method={method} color={color} />
      {BASE_URL}{path}
    </div>
  );
}

function FieldTable({ fields }: { fields: { name: string; type: string; desc: string; required?: boolean }[] }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", margin: "12px 0 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "8px 16px", background: "var(--bg)", fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)" }}>
        <span>Field</span><span>Type</span><span>Description</span>
      </div>
      {fields.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "10px 16px", borderBottom: "1px solid var(--line)", alignItems: "center", fontSize: 12 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
            {row.name}
            {row.required && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "var(--rose-soft)", color: "var(--rose)", marginLeft: 4, fontWeight: 600 }}>REQ</span>}
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>{row.type}</span>
          <span>{row.desc}</span>
        </div>
      ))}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginTop: 24, padding: 16, background: "var(--primary-faint)", borderRadius: 8, color: "var(--primary-2)", fontSize: 13, display: "flex", alignItems: "start", gap: 8 }}>
      <span style={{ marginTop: 2, flexShrink: 0 }}><Icon name="info" size={14} color="var(--primary)" /></span>
      <span>{children}</span>
    </p>
  );
}

function SectionTitle({ cat, title, desc }: { cat: string; title: string; desc: React.ReactNode }) {
  return (
    <>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{cat}</div>
      <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.02em", margin: "0 0 8px" }}>{title}</h1>
      <p style={{ color: "var(--ink-3)", lineHeight: 1.6, fontSize: 14, marginBottom: 24 }}>{desc}</p>
    </>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.015em", margin: "32px 0 12px" }}>{children}</h2>;
}

/* ═══════════════════════════════════════════════ */
/*  Section: Introduction                          */
/* ═══════════════════════════════════════════════ */
function IntroSection() {
  return (
    <>
      <SectionTitle
        cat="Getting started"
        title="Introduction"
        desc={
          <T
            fr="Bienvenue dans la documentation de l'API Nkap Pay. Cette API vous permet d'accepter des paiements Mobile Money (MTN, Orange Money) et par carte bancaire (Visa, Mastercard) en Afrique Centrale."
            en="Welcome to the Nkap Pay API documentation. This API lets you accept Mobile Money payments (MTN, Orange Money) and bank card payments (Visa, Mastercard) in Central Africa."
          />
        }
      />

      <H2>Base URL</H2>
      <CodeBlock lang="text">{`${BASE_URL}/api/v1`}</CodeBlock>

      <H2><T fr="Devises supportées" en="Supported currencies" /></H2>
      <FieldTable fields={[
        { name: "XAF", type: "Franc CFA (CEMAC)", desc: "Cameroun, Gabon, Congo, Tchad, RCA, Guinée Équatoriale" },
        { name: "XOF", type: "Franc CFA (UEMOA)", desc: "Sénégal, Côte d'Ivoire, Mali, Burkina Faso, etc." },
        { name: "EUR", type: "Euro", desc: "Paiements par carte bancaire uniquement" },
        { name: "USD", type: "US Dollar", desc: "Paiements par carte bancaire uniquement" },
      ]} />

      <H2><T fr="Méthodes de paiement" en="Payment methods" /></H2>
      <FieldTable fields={[
        { name: "MOBILE_MONEY", type: "MTN, Orange", desc: "Mobile Money via TouchPay (SDK ou Direct API)" },
        { name: "BANK_CARD", type: "Visa, Mastercard", desc: "Carte bancaire via Stripe Payment Intents" },
      ]} />

      <H2><T fr="Flux de paiement" en="Payment flow" /></H2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 1.8, fontFamily: "var(--mono)" }}>
        <div>1. <T fr="Créer un paiement via" en="Create a payment via" /> POST /api/v1/payments</div>
        <div>2. <T fr="Rediriger le client vers" en="Redirect customer to" /> payment_url</div>
        <div>3. <T fr="Le client paie sur la page de checkout" en="Customer pays on checkout page" /></div>
        <div>4. <T fr="Nkap Pay envoie un webhook à votre" en="Nkap Pay sends a webhook to your" /> callback_url</div>
        <div>5. <T fr="Vérifier la signature et mettre à jour votre système" en="Verify signature and update your system" /></div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Authentication                        */
/* ═══════════════════════════════════════════════ */
function AuthSection() {
  return (
    <>
      <SectionTitle
        cat="Getting started"
        title="Authentication"
        desc={
          <T
            fr="Toutes les requêtes à l'API doivent inclure vos clés API dans les headers HTTP. Vous trouverez vos clés dans le tableau de bord marchand."
            en="All API requests must include your API keys in the HTTP headers. You can find your keys in the merchant dashboard."
          />
        }
      />

      <H2>Headers</H2>
      <FieldTable fields={[
        { name: "X-API-Key", type: "string", desc: "Votre clé API publique (ltc_pk_...)", required: true },
        { name: "X-API-Secret", type: "string", desc: "Votre clé API secrète (ltc_sk_...)", required: true },
        { name: "Content-Type", type: "string", desc: "application/json", required: true },
      ]} />

      <H2><T fr="Exemple" en="Example" /></H2>
      <CodeBlock lang="curl">{`curl -X GET ${BASE_URL}/api/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ltc_pk_your_public_key" \\
  -H "X-API-Secret: ltc_sk_your_secret_key"`}</CodeBlock>

      <InfoBox>
        <T
          fr="Ne partagez jamais votre X-API-Secret. Si vous pensez que votre clé a été compromise, régénérez-la immédiatement depuis le tableau de bord."
          en="Never share your X-API-Secret. If you believe your key has been compromised, regenerate it immediately from the dashboard."
        />
      </InfoBox>

      <H2><T fr="Limite de requêtes" en="Rate limiting" /></H2>
      <p style={{ color: "var(--ink-3)", lineHeight: 1.6, fontSize: 14 }}>
        <T
          fr="L'API est limitée à 60 requêtes par minute par adresse IP. Les réponses incluent les headers X-RateLimit-Limit et X-RateLimit-Remaining."
          en="The API is rate-limited to 60 requests per minute per IP address. Responses include X-RateLimit-Limit and X-RateLimit-Remaining headers."
        />
      </p>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Create Payment                        */
/* ═══════════════════════════════════════════════ */
function CreatePaymentSection() {
  return (
    <>
      <SectionTitle
        cat="Payments"
        title="Create a payment"
        desc={
          <T
            fr="Crée un nouveau paiement et retourne une URL de checkout vers laquelle rediriger votre client. La référence retournée est unique et stable."
            en="Creates a new payment and returns a checkout URL to redirect your customer to. The returned reference is unique and stable."
          />
        }
      />

      <EndpointBar method="POST" path="/api/v1/payments" color="var(--success)" />

      <H2><T fr="Corps de la requête" en="Request body" /></H2>
      <FieldTable fields={[
        { name: "amount", type: "decimal", desc: "Montant en unité entière. 5000 = 5 000 F CFA. Minimum 100.", required: true },
        { name: "currency", type: "string", desc: "XAF (défaut), XOF, EUR ou USD." },
        { name: "merchant_reference", type: "string", desc: "Votre ID de commande interne. Retourné dans les webhooks." },
        { name: "description", type: "string", desc: "Affiché au client sur la page de checkout." },
        { name: "payment_method", type: "string", desc: "MOBILE_MONEY ou BANK_CARD. Omettez pour laisser le client choisir." },
        { name: "payment_mode", type: "string", desc: "SDK (défaut), DIRECT_API ou STRIPE." },
        { name: "operator", type: "string", desc: "MTN ou ORANGE. Requis si payment_mode = DIRECT_API." },
        { name: "customer_phone", type: "string", desc: "Numéro du client. Requis si payment_mode = DIRECT_API." },
        { name: "customer_info.name", type: "string", desc: "Nom du client." },
        { name: "customer_info.email", type: "string", desc: "Email du client." },
        { name: "customer_info.phone", type: "string", desc: "Téléphone du client (format E.164)." },
        { name: "callback_url", type: "string", desc: "URL webhook spécifique à ce paiement (remplace le défaut marchand)." },
        { name: "return_url", type: "string", desc: "URL de redirection après paiement." },
        { name: "metadata", type: "object", desc: "Données personnalisées (retournées dans les webhooks)." },
      ]} />

      <H2><T fr="Exemple (mode SDK)" en="Example (SDK mode)" /></H2>
      <CodeBlock lang="curl">{`curl -X POST ${BASE_URL}/api/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ltc_pk_..." \\
  -H "X-API-Secret: ltc_sk_..." \\
  -d '{
    "amount": 75000,
    "currency": "XAF",
    "merchant_reference": "ORDER-3041",
    "description": "Pagne + livraison",
    "customer_info": {
      "name": "Jean-Pierre Mbarga",
      "phone": "237670123456"
    },
    "return_url": "https://mamishop.cm/thanks"
  }'`}</CodeBlock>

      <H2><T fr="Réponse" en="Response" /></H2>
      <CodeBlock lang="json">{`{
  "payment_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "reference": "PAY-A1B2C3D4E5F67890",
  "payment_token": "eyJhbGciOiJIUzI1NiIs...",
  "amount": "75000.00",
  "currency": "XAF",
  "status": "PENDING",
  "payment_mode": "SDK",
  "payment_url": "${BASE_URL}/pay/PAY-A1B2C3D4E5F67890",
  "created_at": "2026-06-10T14:42:00Z"
}`}</CodeBlock>

      <InfoBox>
        <T
          fr="Redirigez immédiatement le client vers payment_url. La session expire en 30 minutes par défaut."
          en="Redirect the customer immediately to payment_url. Sessions expire in 30 minutes by default."
        />
      </InfoBox>

      <H2><T fr="Exemple (Direct API — sans redirection)" en="Example (Direct API — no redirect)" /></H2>
      <CodeBlock lang="curl">{`curl -X POST ${BASE_URL}/api/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ltc_pk_..." \\
  -H "X-API-Secret: ltc_sk_..." \\
  -d '{
    "amount": 5000,
    "currency": "XAF",
    "payment_mode": "DIRECT_API",
    "operator": "MTN",
    "customer_phone": "237670000000"
  }'`}</CodeBlock>
      <p style={{ color: "var(--ink-3)", lineHeight: 1.6, fontSize: 14, marginTop: 12 }}>
        <T
          fr="Le client reçoit une notification push sur son app MTN/Orange. Pollez GET /api/v1/payments/{reference} toutes les 3-5 secondes pour suivre le statut."
          en="The customer receives a push notification on their MTN/Orange app. Poll GET /api/v1/payments/{reference} every 3-5 seconds to track status."
        />
      </p>

      <H2><T fr="Exemple (Carte bancaire)" en="Example (Bank card)" /></H2>
      <CodeBlock lang="curl">{`curl -X POST ${BASE_URL}/api/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ltc_pk_..." \\
  -H "X-API-Secret: ltc_sk_..." \\
  -d '{
    "amount": 15000,
    "currency": "XAF",
    "payment_method": "BANK_CARD",
    "description": "Abonnement Premium",
    "customer_info": {
      "email": "client@example.com"
    },
    "return_url": "https://myshop.cm/thanks"
  }'`}</CodeBlock>
      <p style={{ color: "var(--ink-3)", lineHeight: 1.6, fontSize: 14, marginTop: 12 }}>
        <T
          fr="Le paiement par carte est traité via Stripe. Le client saisit ses informations de carte sur la page de checkout sécurisée."
          en="Card payment is processed via Stripe. The customer enters their card details on the secure checkout page."
        />
      </p>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Get Payment                           */
/* ═══════════════════════════════════════════════ */
function GetPaymentSection() {
  return (
    <>
      <SectionTitle
        cat="Payments"
        title="Get payment"
        desc={
          <T
            fr="Récupère les détails d'un paiement par sa référence. Utilisez cet endpoint pour vérifier le statut d'un paiement ou pour le polling en mode Direct API."
            en="Retrieve payment details by reference. Use this endpoint to check payment status or for polling in Direct API mode."
          />
        }
      />

      <EndpointBar method="GET" path="/api/v1/payments/{reference}" color="#2563eb" />

      <H2><T fr="Paramètres" en="Parameters" /></H2>
      <FieldTable fields={[
        { name: "reference", type: "string (path)", desc: "Référence du paiement (ex: PAY-A1B2C3D4E5F67890).", required: true },
      ]} />

      <H2><T fr="Exemple" en="Example" /></H2>
      <CodeBlock lang="curl">{`curl ${BASE_URL}/api/v1/payments/PAY-A1B2C3D4E5F67890 \\
  -H "X-API-Key: ltc_pk_..." \\
  -H "X-API-Secret: ltc_sk_..."`}</CodeBlock>

      <H2><T fr="Réponse" en="Response" /></H2>
      <CodeBlock lang="json">{`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "merchant_id": "...",
  "reference": "PAY-A1B2C3D4E5F67890",
  "merchant_reference": "ORDER-3041",
  "amount": "75000.00",
  "fee": "1500.00",
  "currency": "XAF",
  "method": "MOBILE_MONEY",
  "status": "COMPLETED",
  "payment_mode": "SDK",
  "provider": "TOUCHPAY",
  "operator": "MTN",
  "description": "Pagne + livraison",
  "customer_info": {
    "name": "Jean-Pierre Mbarga",
    "phone": "237670123456"
  },
  "completed_at": "2026-06-10T14:45:30Z",
  "created_at": "2026-06-10T14:42:00Z",
  "updated_at": "2026-06-10T14:45:30Z"
}`}</CodeBlock>

      <InfoBox>
        <T
          fr="Vous ne pouvez accéder qu'aux paiements de votre propre compte marchand."
          en="You can only access payments belonging to your own merchant account."
        />
      </InfoBox>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: List Payments                         */
/* ═══════════════════════════════════════════════ */
function ListPaymentsSection() {
  return (
    <>
      <SectionTitle
        cat="Payments"
        title="List payments"
        desc={
          <T
            fr="Récupère la liste paginée de tous vos paiements, avec filtrage optionnel par statut."
            en="Retrieve a paginated list of all your payments, with optional status filtering."
          />
        }
      />

      <EndpointBar method="GET" path="/api/v1/payments" color="#2563eb" />

      <H2><T fr="Paramètres de requête" en="Query parameters" /></H2>
      <FieldTable fields={[
        { name: "page", type: "integer", desc: "Numéro de page (défaut: 1)." },
        { name: "page_size", type: "integer", desc: "Éléments par page (1-100, défaut: 20)." },
        { name: "status", type: "string", desc: "Filtrer par statut: PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED, REFUNDED, CANCELLED." },
      ]} />

      <H2><T fr="Exemple" en="Example" /></H2>
      <CodeBlock lang="curl">{`curl "${BASE_URL}/api/v1/payments?page=1&page_size=10&status=COMPLETED" \\
  -H "X-API-Key: ltc_pk_..." \\
  -H "X-API-Secret: ltc_sk_..."`}</CodeBlock>

      <H2><T fr="Réponse" en="Response" /></H2>
      <CodeBlock lang="json">{`{
  "payments": [
    {
      "id": "...",
      "reference": "PAY-A1B2C3D4E5F67890",
      "amount": "75000.00",
      "currency": "XAF",
      "status": "COMPLETED",
      "payment_mode": "SDK",
      "provider": "TOUCHPAY",
      "created_at": "2026-06-10T14:42:00Z",
      ...
    }
  ],
  "total_count": 142,
  "page": 1,
  "page_size": 10
}`}</CodeBlock>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Payment Modes                         */
/* ═══════════════════════════════════════════════ */
function PaymentModesSection() {
  return (
    <>
      <SectionTitle
        cat="Payments"
        title="Payment modes"
        desc={
          <T
            fr="Nkap Pay supporte trois modes d'intégration pour s'adapter à tous les cas d'usage."
            en="Nkap Pay supports three integration modes to fit all use cases."
          />
        }
      />

      <H2>SDK <T fr="(Intégration web)" en="(Web integration)" /></H2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 500 }}><T fr="Recommandé pour les sites web" en="Recommended for websites" /></p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><T fr="Créez le paiement via l'API" en="Create the payment via the API" /></li>
          <li><T fr="Redirigez le client vers payment_url" en="Redirect customer to payment_url" /></li>
          <li><T fr="Le client choisit MTN, Orange ou Carte sur la page de checkout" en="Customer chooses MTN, Orange or Card on the checkout page" /></li>
          <li><T fr="Recevez le résultat via webhook" en="Receive the result via webhook" /></li>
        </ul>
      </div>

      <H2>Direct API <T fr="(Intégration mobile)" en="(Mobile integration)" /></H2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 500 }}><T fr="Recommandé pour les apps mobiles" en="Recommended for mobile apps" /></p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><T fr="Aucune redirection — purement API" en="No redirect — pure API" /></li>
          <li><T fr="Envoyez operator (MTN/ORANGE) et customer_phone" en="Send operator (MTN/ORANGE) and customer_phone" /></li>
          <li><T fr="Le client reçoit une notification push sur son app MoMo" en="Customer receives push notification on their MoMo app" /></li>
          <li><T fr="Pollez GET /payments/{'{reference}'} pour suivre le statut" en="Poll GET /payments/{'{reference}'} to track status" /></li>
        </ul>
      </div>

      <H2>Stripe <T fr="(Carte bancaire)" en="(Bank card)" /></H2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 500 }}><T fr="Paiement par carte Visa/Mastercard" en="Visa/Mastercard card payment" /></p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><T fr="Envoyez payment_method: BANK_CARD dans la requête" en='Send payment_method: "BANK_CARD" in the request' /></li>
          <li><T fr="Le client est redirigé vers la page de checkout avec formulaire carte sécurisé" en="Customer is redirected to checkout page with secure card form" /></li>
          <li><T fr="3D Secure géré automatiquement" en="3D Secure handled automatically" /></li>
          <li><T fr="Recevez le résultat via webhook" en="Receive the result via webhook" /></li>
        </ul>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Webhook Signature                     */
/* ═══════════════════════════════════════════════ */
function WebhookSection() {
  return (
    <>
      <SectionTitle
        cat="Webhooks"
        title="Webhook signature"
        desc={
          <T
            fr="Tous les webhooks envoyés à votre callback_url sont signés avec HMAC-SHA256. Vérifiez toujours la signature avant de traiter le payload."
            en="All webhooks sent to your callback_url are signed with HMAC-SHA256. Always verify the signature before processing the payload."
          />
        }
      />

      <H2>Headers</H2>
      <FieldTable fields={[
        { name: "X-LtcPay-Signature", type: "string", desc: "Signature HMAC-SHA256 du body JSON, signée avec votre API Secret." },
        { name: "Content-Type", type: "string", desc: "application/json" },
      ]} />

      <H2><T fr="Vérification de la signature" en="Signature verification" /></H2>
      <CodeBlock lang="python">{`import hmac
import hashlib

def verify_signature(payload_body: str, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode("utf-8"),
        payload_body.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`}</CodeBlock>

      <H2><T fr="Exemple Node.js" en="Node.js example" /></H2>
      <CodeBlock lang="javascript">{`const crypto = require('crypto');

function verifySignature(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`}</CodeBlock>

      <H2><T fr="Payload webhook" en="Webhook payload" /></H2>
      <CodeBlock lang="json">{`{
  "event": "payment.status_changed",
  "data": {
    "payment_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
    "reference": "PAY-A1B2C3D4E5F67890",
    "merchant_reference": "ORDER-3041",
    "amount": 75000.0,
    "fee": 1500.0,
    "currency": "XAF",
    "status": "COMPLETED",
    "method": "MOBILE_MONEY",
    "customer_name": "Jean-Pierre Mbarga",
    "customer_phone": "237670123456",
    "completed_at": "2026-06-10T14:45:30Z",
    "created_at": "2026-06-10T14:42:00Z"
  },
  "timestamp": "2026-06-10T14:45:31Z"
}`}</CodeBlock>

      <InfoBox>
        <T
          fr="Les webhooks sont envoyés avec un mécanisme de retry (5 tentatives max) avec backoff exponentiel (2s, 4s, 8s, 16s, 32s). Votre endpoint doit répondre avec un code HTTP 2xx."
          en="Webhooks are sent with a retry mechanism (5 attempts max) with exponential backoff (2s, 4s, 8s, 16s, 32s). Your endpoint must respond with an HTTP 2xx code."
        />
      </InfoBox>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Event Types                           */
/* ═══════════════════════════════════════════════ */
function EventsSection() {
  return (
    <>
      <SectionTitle
        cat="Webhooks"
        title="Event types"
        desc={
          <T
            fr="Liste des événements envoyés à votre webhook endpoint."
            en="List of events sent to your webhook endpoint."
          />
        }
      />

      <FieldTable fields={[
        { name: "payment.status_changed", type: "webhook", desc: "Envoyé chaque fois que le statut d'un paiement change (PENDING → COMPLETED, PENDING → FAILED, etc.)." },
      ]} />

      <H2><T fr="Transitions de statut" en="Status transitions" /></H2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 2, fontFamily: "var(--mono)" }}>
        <div>PENDING → PROCESSING <span style={{ color: "var(--muted)" }}>(Direct API: paiement initié)</span></div>
        <div>PENDING → COMPLETED <span style={{ color: "var(--muted)" }}>(SDK/Stripe: paiement réussi)</span></div>
        <div>PROCESSING → COMPLETED <span style={{ color: "var(--muted)" }}>(Direct API: client a validé)</span></div>
        <div>PENDING → FAILED <span style={{ color: "var(--muted)" }}>(erreur de paiement)</span></div>
        <div>PROCESSING → FAILED <span style={{ color: "var(--muted)" }}>(client a refusé ou timeout)</span></div>
        <div>PENDING → EXPIRED <span style={{ color: "var(--muted)" }}>(session expirée, 30 min par défaut)</span></div>
        <div>PENDING → CANCELLED <span style={{ color: "var(--muted)" }}>(annulé par le client ou le marchand)</span></div>
        <div>COMPLETED → REFUNDED <span style={{ color: "var(--muted)" }}>(remboursement effectué)</span></div>
      </div>

      <InfoBox>
        <T
          fr="Implémentez l'idempotence côté webhook : vous pouvez recevoir le même événement plusieurs fois en cas de retry."
          en="Implement idempotency on the webhook side: you may receive the same event multiple times due to retries."
        />
      </InfoBox>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Payment Statuses                      */
/* ═══════════════════════════════════════════════ */
function StatusesSection() {
  return (
    <>
      <SectionTitle
        cat="Reference"
        title="Payment statuses"
        desc={
          <T
            fr="Un paiement passe par différents statuts au cours de son cycle de vie."
            en="A payment goes through different statuses during its lifecycle."
          />
        }
      />

      <FieldTable fields={[
        { name: "PENDING", type: "initial", desc: "Paiement créé, en attente de l'action du client." },
        { name: "PROCESSING", type: "transitional", desc: "Paiement en cours de traitement (Direct API uniquement — le client a reçu la notification push)." },
        { name: "COMPLETED", type: "terminal", desc: "Paiement réussi. Les fonds ont été collectés." },
        { name: "FAILED", type: "terminal", desc: "Paiement échoué (refus opérateur, solde insuffisant, erreur technique)." },
        { name: "EXPIRED", type: "terminal", desc: "Session de paiement expirée (30 minutes par défaut)." },
        { name: "CANCELLED", type: "terminal", desc: "Paiement annulé par le client ou le marchand." },
        { name: "REFUNDED", type: "terminal", desc: "Paiement remboursé." },
      ]} />

      <InfoBox>
        <T
          fr="Les statuts 'terminal' (COMPLETED, FAILED, EXPIRED, CANCELLED, REFUNDED) sont définitifs et ne changent plus."
          en="Terminal statuses (COMPLETED, FAILED, EXPIRED, CANCELLED, REFUNDED) are final and won't change."
        />
      </InfoBox>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section: Error Codes                           */
/* ═══════════════════════════════════════════════ */
function ErrorsSection() {
  return (
    <>
      <SectionTitle
        cat="Reference"
        title="Error codes"
        desc={
          <T
            fr="L'API utilise les codes de statut HTTP standards. Les erreurs incluent un message descriptif dans le corps de la réponse."
            en="The API uses standard HTTP status codes. Errors include a descriptive message in the response body."
          />
        }
      />

      <H2><T fr="Format d'erreur" en="Error format" /></H2>
      <CodeBlock lang="json">{`{
  "detail": "Payment not found"
}`}</CodeBlock>

      <H2><T fr="Codes HTTP" en="HTTP codes" /></H2>
      <FieldTable fields={[
        { name: "200", type: "OK", desc: "Requête réussie." },
        { name: "201", type: "Created", desc: "Ressource créée (ex: nouveau paiement)." },
        { name: "400", type: "Bad Request", desc: "Paramètres invalides (montant < 100, devise non supportée, etc.)." },
        { name: "401", type: "Unauthorized", desc: "Clés API manquantes ou invalides." },
        { name: "403", type: "Forbidden", desc: "Accès refusé (ex: paiement d'un autre marchand)." },
        { name: "404", type: "Not Found", desc: "Ressource introuvable (référence de paiement invalide)." },
        { name: "422", type: "Validation Error", desc: "Erreur de validation des données (détails dans le corps)." },
        { name: "429", type: "Rate Limited", desc: "Trop de requêtes. Attendez avant de réessayer." },
        { name: "502", type: "Bad Gateway", desc: "Erreur du fournisseur de paiement (TouchPay ou Stripe)." },
        { name: "500", type: "Server Error", desc: "Erreur interne du serveur." },
      ]} />

      <H2><T fr="Erreur de validation (422)" en="Validation error (422)" /></H2>
      <CodeBlock lang="json">{`{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "Le montant minimum est 100 XAF",
      "type": "value_error"
    }
  ]
}`}</CodeBlock>
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/*  Section Router                                 */
/* ═══════════════════════════════════════════════ */
const SECTION_MAP: Record<string, () => React.ReactElement> = {
  intro: IntroSection,
  auth: AuthSection,
  create: CreatePaymentSection,
  get: GetPaymentSection,
  list: ListPaymentsSection,
  modes: PaymentModesSection,
  webhook: WebhookSection,
  events: EventsSection,
  statuses: StatusesSection,
  errors: ErrorsSection,
};

/* ═══════════════════════════════════════════════ */
/*  Page                                           */
/* ═══════════════════════════════════════════════ */
export default function DocsPage() {
  const [section, setSection] = useState("intro");
  const [copied, setCopied] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const grouped: Record<string, typeof SECTIONS> = {};
  SECTIONS.forEach(s => {
    grouped[s.cat] = grouped[s.cat] || [];
    grouped[s.cat].push(s);
  });

  const ActiveSection = SECTION_MAP[section] || IntroSection;

  const handleCopyDocs = () => {
    const el = mainRef.current;
    if (!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ background: "var(--bg)", display: "grid", gridTemplateColumns: "232px 1fr", minHeight: "calc(100vh - 110px)" }}>
      {/* Sidebar */}
      <aside style={{ background: "var(--bg)", borderRight: "1px solid var(--line)", padding: "24px 16px", overflowY: "auto", position: "sticky", top: 0, height: "calc(100vh - 110px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px 12px", borderBottom: "1px solid var(--line)" }}>
          <Icon name="book" size={14} color="var(--ink)" />
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500 }}>API v2.0</span>
        </div>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-2)", padding: "16px 10px 6px" }}>{cat}</div>
            {items.map(it => (
              <div
                key={it.id}
                onClick={() => setSection(it.id)}
                style={{
                  padding: "6px 10px", borderRadius: 6, fontSize: 13, cursor: "pointer",
                  color: section === it.id ? "white" : "var(--ink-3)",
                  background: section === it.id ? "var(--primary)" : "transparent",
                  fontWeight: section === it.id ? 500 : 400,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {it.label}
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <main ref={mainRef} style={{ padding: "40px 48px", maxWidth: 920, overflowY: "auto", height: "calc(100vh - 110px)", position: "relative" }}>
        <button
          onClick={handleCopyDocs}
          style={{
            position: "sticky", top: 0, float: "right", zIndex: 10,
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 6, fontSize: 12, fontFamily: "var(--mono)",
            background: copied ? "var(--success)" : "var(--surface)",
            color: copied ? "white" : "var(--ink-3)",
            border: copied ? "1px solid var(--success)" : "1px solid var(--line)",
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={12} />
          {copied ? "Copié !" : "Copier"}
        </button>
        <ActiveSection />
      </main>
    </div>
  );
}
