"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Toggle } from "@/components/ui/toggle";
import { CodeBlock } from "@/components/ui/code-block";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

const WEBHOOK_DELIVERIES = [
  { id: "wh-001", event: "payment.success", url: "https://api.myshop.cm/hook", status: "delivered" as const, code: 200, time: "Il y a 12 min", duration: "120ms" },
  { id: "wh-002", event: "payment.success", url: "https://api.myshop.cm/hook", status: "delivered" as const, code: 200, time: "Il y a 45 min", duration: "95ms" },
  { id: "wh-003", event: "payment.failed", url: "https://api.myshop.cm/hook", status: "failed" as const, code: 500, time: "Il y a 2h", duration: "3012ms" },
  { id: "wh-004", event: "payment.success", url: "https://api.myshop.cm/hook", status: "delivered" as const, code: 200, time: "Il y a 3h", duration: "88ms" },
  { id: "wh-005", event: "refund.created", url: "https://api.myshop.cm/hook", status: "delivered" as const, code: 200, time: "Hier, 18:40", duration: "142ms" },
];

const WEBHOOK_ENDPOINTS = [
  { url: "https://api.myshop.cm/hook", events: ["payment.success", "payment.failed", "refund.created"], active: true },
  { url: "https://staging.myshop.cm/hook", events: ["payment.success"], active: false },
];

export default function ApiKeysPage() {
  const { merchantUser } = useAuth();
  const [env, setEnv] = useState<"live" | "test">(merchantUser?.is_test_mode ? "test" : "live");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const apiKey = env === "live"
    ? (merchantUser?.api_key_live || "nkap_live_xxxxxxxxxxxxxxxx")
    : (merchantUser?.api_key_test || "nkap_test_xxxxxxxxxxxxxxxx");

  const webhookSecret = merchantUser?.webhook_secret || "whsec_xxxxxxxxxxxxxxxxxxxxxxxx";

  const curlExample = `curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://pay.ltcgroup.site"}/api/v1/payments \\
  -H "X-API-Key: ${apiKey}" \\
  -H "X-API-Secret: YOUR_API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "currency": "XAF",
    "description": "Commande #123",
    "customer_phone": "237699123456",
    "payment_method": "om",
    "webhook_url": "https://api.myshop.cm/hook"
  }'`;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="D\u00e9veloppeur" en="Developer" />, <T key="c2" fr="API & Webhooks" en="API & Webhooks" />]}
      title={<T fr="API & Webhooks" en="API & Webhooks" />}
      sub={<T fr="Cl\u00e9s d\u0027authentification, endpoints webhook et int\u00e9gration" en="Authentication keys, webhook endpoints and integration" />}
      actions={
        <a href="/merchant/dashboard/docs" className="btn btn-ghost btn-sm">
          <Icon name="book" size={13} /> <T fr="Documentation" en="Documentation" />
        </a>
      }
    >
      {/* Environment toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          className={env === "test" ? "btn btn-sm" : "btn btn-ghost btn-sm"}
          style={env === "test" ? { background: "oklch(0.92 0.08 80)", color: "oklch(0.45 0.12 80)", fontWeight: 600 } : {}}
          onClick={() => setEnv("test")}
        >
          <Pill tone="test"><T fr="Test" en="Test" /></Pill>
        </button>
        <button
          className={env === "live" ? "btn btn-sm" : "btn btn-ghost btn-sm"}
          style={env === "live" ? { background: "oklch(0.92 0.1 145)", color: "oklch(0.4 0.12 145)", fontWeight: 600 } : {}}
          onClick={() => setEnv("live")}
        >
          <Pill tone="live"><T fr="Production" en="Live" /></Pill>
        </button>
        {merchantUser?.is_test_mode && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>
            <Icon name="info" size={12} /> <T fr="Votre compte est en mode test" en="Your account is in test mode" />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* API Key card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="bolt" size={14} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <T fr="Cl\u00e9 API" en="API Key" />
              </span>
            </div>
            <Pill tone={env === "live" ? "live" : "test"}>{env === "live" ? "Live" : "Test"}</Pill>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            <T fr="Identifie votre compte dans chaque requ\u00eate" en="Identifies your account in each request" />
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            background: "var(--bg-2)",
            borderRadius: 6,
          }}>
            <code className="mono" style={{ flex: 1, fontSize: 12, wordBreak: "break-all" }}>
              {apiKey}
            </code>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => copyToClipboard(apiKey, "api-key")}
            >
              <Icon name={copiedField === "api-key" ? "check" : "copy"} size={13} color={copiedField === "api-key" ? "var(--accent-success)" : undefined} />
            </button>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
            Header: X-API-Key
          </div>
        </div>

        {/* Webhook Secret card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="lock" size={14} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <T fr="Secret Webhook" en="Webhook Secret" />
              </span>
            </div>
            <Pill tone="neutral">HMAC-SHA256</Pill>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            <T fr="V\u00e9rifie l\u0027authenticit\u00e9 des callbacks webhook" en="Verifies webhook callback authenticity" />
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            background: "var(--bg-2)",
            borderRadius: 6,
          }}>
            <code className="mono" style={{ flex: 1, fontSize: 12, wordBreak: "break-all" }}>
              {showWebhookSecret ? webhookSecret : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
            </code>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
            >
              <Icon name={showWebhookSecret ? "eyeOff" : "eye"} size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => copyToClipboard(webhookSecret, "webhook-secret")}
            >
              <Icon name={copiedField === "webhook-secret" ? "check" : "copy"} size={13} color={copiedField === "webhook-secret" ? "var(--accent-success)" : undefined} />
            </button>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
            Header: X-LtcPay-Signature
          </div>
        </div>
      </div>

      {/* Webhook endpoints */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Endpoints Webhook" en="Webhook endpoints" />
            </h3>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              <T fr="URLs qui re\u00e7oivent les notifications de paiement" en="URLs that receive payment notifications" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm">
            <Icon name="plus" size={13} /> <T fr="Ajouter" en="Add" />
          </button>
        </div>
        {WEBHOOK_ENDPOINTS.map((ep, i) => (
          <div key={ep.url} style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: i < WEBHOOK_ENDPOINTS.length - 1 ? "1px solid var(--line)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: ep.active ? "var(--accent-success)" : "var(--line-2)",
              }} />
              <div>
                <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{ep.url}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {ep.events.join(", ")}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Pill tone={ep.active ? "success" : "neutral"}>
                {ep.active ? <T fr="actif" en="active" /> : <T fr="inactif" en="inactive" />}
              </Pill>
              <button className="btn btn-ghost btn-sm"><Icon name="more" size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent webhook deliveries */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Livraisons r\u00e9centes" en="Recent deliveries" />
          </h3>
          <button className="btn btn-ghost btn-sm">
            <Icon name="refresh" size={13} /> <T fr="Actualiser" en="Refresh" />
          </button>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1.5fr 1.5fr 80px 80px 100px" }}>
            <span><T fr="\u00c9v\u00e9nement" en="Event" /></span>
            <span>URL</span>
            <span><T fr="Statut" en="Status" /></span>
            <span>Code</span>
            <span><T fr="Dur\u00e9e" en="Duration" /></span>
            <span style={{ textAlign: "right" }}><T fr="Quand" en="When" /></span>
          </div>
          {WEBHOOK_DELIVERIES.map(d => (
            <div className="row clickable" key={d.id} style={{ gridTemplateColumns: "1fr 1.5fr 1.5fr 80px 80px 100px" }}>
              <div className="mono" style={{ fontSize: 11 }}>{d.event}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{d.url}</div>
              <div>
                <Pill tone={d.status === "delivered" ? "success" : "fail"}>
                  {d.status === "delivered" ? <T fr="livr\u00e9" en="delivered" /> : <T fr="\u00e9chou\u00e9" en="failed" />}
                </Pill>
              </div>
              <div className="mono" style={{ fontSize: 11, color: d.code === 200 ? "var(--accent-success)" : "oklch(0.55 0.2 25)" }}>{d.code}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{d.duration}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{d.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration example */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Icon name="code" size={14} />
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Exemple d\u0027int\u00e9gration" en="Integration example" />
          </h3>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          <T
            fr="Cr\u00e9ez un paiement en envoyant une requ\u00eate POST avec vos cl\u00e9s API dans les headers."
            en="Create a payment by sending a POST request with your API keys in the headers."
          />
        </div>
        <CodeBlock lang="bash">{curlExample}</CodeBlock>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
          <T
            fr="Configurez votre Callback URL dans les param\u00e8tres pour recevoir les notifications de paiement."
            en="Set up your Callback URL in settings to receive payment notifications."
          />
        </div>
      </div>
    </PageWrapper>
  );
}
