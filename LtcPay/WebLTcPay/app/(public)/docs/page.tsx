"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { CodeBlock } from "@/components/ui/code-block";
import { T } from "@/lib/i18n";

const SECTIONS = [
  { id: "intro", label: "Introduction", cat: "Getting started" },
  { id: "auth", label: "Authentication", cat: "Getting started" },
  { id: "create", label: "Create payment", cat: "Payments" },
  { id: "get", label: "Get payment", cat: "Payments" },
  { id: "list", label: "List payments", cat: "Payments" },
  { id: "refund", label: "Refund payment", cat: "Payments" },
  { id: "webhook", label: "Webhook signature", cat: "Webhooks" },
  { id: "events", label: "Event types", cat: "Webhooks" },
  { id: "errors", label: "Error codes", cat: "Reference" },
];

export default function DocsPage() {
  const [section, setSection] = useState("create");

  const grouped: Record<string, typeof SECTIONS> = {};
  SECTIONS.forEach(s => {
    grouped[s.cat] = grouped[s.cat] || [];
    grouped[s.cat].push(s);
  });

  return (
    <div style={{ background: "var(--bg)", display: "grid", gridTemplateColumns: "232px 1fr", minHeight: "calc(100vh - 110px)" }}>
      {/* Sidebar */}
      <aside style={{ background: "var(--bg)", borderRight: "1px solid var(--line)", padding: "24px 16px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px 12px", borderBottom: "1px solid var(--line)" }}>
          <Icon name="book" size={14} color="var(--ink)" />
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500 }}>API v1.4.2</span>
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
                }}
              >
                {it.label}
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ padding: "40px 48px", maxWidth: 920 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Payments</div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.02em", margin: "0 0 8px" }}>Create a payment</h1>
        <p style={{ color: "var(--ink-3)", lineHeight: 1.6, fontSize: 14 }}>
          <T fr="Cr\u00e9e un nouveau paiement et retourne une URL de checkout vers laquelle rediriger votre client. La r\u00e9f\u00e9rence retourn\u00e9e est unique et stable."
             en="Creates a new payment and returns a checkout URL to redirect your customer to. The returned reference is unique and stable." />
        </p>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 18 }}>
          <span style={{ padding: "2px 6px", borderRadius: 3, background: "var(--success)", color: "white", fontSize: 11, fontWeight: 600 }}>POST</span>
          https://api.nkap.pay/v1/payments
        </div>

        <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.015em", margin: "32px 0 12px" }}>Request body</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", margin: "12px 0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "8px 16px", background: "var(--bg)", fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)" }}>
            <span>Field</span><span>Type</span><span>Description</span>
          </div>
          {[
            { name: "amount", type: "integer", desc: "Amount in smallest unit. 5000 = 5 000 F CFA.", required: true },
            { name: "currency", type: "string", desc: "One of XAF, XOF, EUR, USD.", required: true },
            { name: "merchant_reference", type: "string", desc: "Your internal order ID. Returned in webhooks." },
            { name: "description", type: "string", desc: "Shown to the customer on the checkout page." },
            { name: "customer.name", type: "string", desc: "Pre-fills the customer field." },
            { name: "customer.phone", type: "string", desc: "E.164 format. Auto-detects MoMo carrier." },
            { name: "callback_url", type: "string", desc: "Override webhook destination per-payment." },
            { name: "return_url", type: "string", desc: "Where customer is redirected after payment." },
          ].map((row, i) => (
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

        <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.015em", margin: "32px 0 12px" }}>Example request</h2>
        <CodeBlock lang="curl">{`curl -X POST https://api.nkap.pay/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: nkap_live_pk_..." \\
  -H "X-API-Secret: nkap_live_sk_..." \\
  -d '{
    "amount": 75000,
    "currency": "XAF",
    "merchant_reference": "ORDER-3041",
    "description": "Pagne + livraison",
    "customer": {
      "name": "Jean-Pierre Mbarga",
      "phone": "237670123456"
    },
    "return_url": "https://mamishop.cm/thanks"
  }'`}</CodeBlock>

        <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.015em", margin: "32px 0 12px" }}>Response</h2>
        <CodeBlock lang="json">{`{
  "payment_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "reference": "PAY-A1B2C3D4E5F67890",
  "amount": "75000.00",
  "currency": "XAF",
  "status": "PENDING",
  "payment_url": "https://pay.nkap.pay/PAY-A1B2C3D4E5F67890",
  "expires_at": "2026-05-26T15:12:00Z",
  "created_at": "2026-05-26T14:42:00Z"
}`}</CodeBlock>

        <p style={{ marginTop: 24, padding: 16, background: "var(--primary-faint)", borderRadius: 8, color: "var(--primary-2)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="info" size={14} color="var(--primary)" />
          <T fr="Redirigez imm\u00e9diatement vers payment_url. La session expire en 30 minutes par d\u00e9faut." en="Redirect immediately to payment_url. Sessions expire in 30 minutes by default." />
        </p>
      </main>
    </div>
  );
}
