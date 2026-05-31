"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { CodeBlock } from "@/components/ui/code-block";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";


export default function ApiKeysPage() {
  const { merchantUser } = useAuth();
  const [env, setEnv] = useState<"live" | "test">(merchantUser?.is_test_mode ? "test" : "live");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const webhookVerifyExample = `// Node.js — verify webhook signature
import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

app.post('/webhooks/nkap', (req, res) => {
  const sig = req.headers['x-ltcpay-signature'];
  if (!verifyWebhook(req.rawBody, sig, process.env.NKAP_SECRET)) {
    return res.status(401).send('invalid signature');
  }
  const { event, data } = JSON.parse(req.rawBody);
  if (event === 'payment.completed') {
    fulfillOrder(data.merchant_reference);
  }
  res.status(200).send('ok');
});`;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Développeur" en="Developer" />, <T key="c2" fr="API & Webhooks" en="API & Webhooks" />]}
      title="API & Webhooks"
      sub={<T fr="Clés d'API, endpoints webhook, livraisons" en="API keys, webhook endpoints, deliveries" />}
      actions={
        <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--bg-2)", borderRadius: 8 }}>
          <button
            className={"btn btn-sm " + (env === "test" ? "btn-primary" : "btn-ghost")}
            style={{ border: 0, background: env === "test" ? "var(--ink)" : "transparent", color: env === "test" ? "white" : "var(--muted)" }}
            onClick={() => setEnv("test")}
          >
            Test
          </button>
          <button
            className={"btn btn-sm " + (env === "live" ? "btn-primary" : "btn-ghost")}
            style={{ border: 0, background: env === "live" ? "var(--ink)" : "transparent", color: env === "live" ? "white" : "var(--muted)" }}
            onClick={() => setEnv("live")}
          >
            Live
          </button>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* API Keys card */}
        <div className="nk-card">
          <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
                <T fr="Clés d'API" en="API keys" />
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
                <T fr="Ne partagez jamais votre secret." en="Never share your secret." />
              </p>
            </div>
            <Pill tone={env === "live" ? "live" : "test"}>{env}</Pill>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "var(--bg-2)", borderRadius: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", width: 80 }}>pk_{env}</span>
              <span className="mono" style={{ flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {env === "live" ? (merchantUser?.api_key_live || "—") : (merchantUser?.api_key_test || "—")}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }} onClick={() => copyToClipboard(env === "live" ? (merchantUser?.api_key_live || "") : (merchantUser?.api_key_test || ""), "pk")}>
                <Icon name={copiedField === "pk" ? "check" : "copy"} size={12} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "var(--bg-2)", borderRadius: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", width: 80 }}>webhook</span>
              <span className="mono" style={{ flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {showSecret ? (merchantUser?.webhook_secret || "—") : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }} onClick={() => setShowSecret(!showSecret)}>
                <Icon name={showSecret ? "eyeOff" : "eye"} size={12} />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }} onClick={() => copyToClipboard(merchantUser?.webhook_secret || "", "sk")}>
                <Icon name={copiedField === "sk" ? "check" : "copy"} size={12} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            <button className="btn btn-ghost btn-sm">
              <Icon name="refresh" size={12} /> <T fr="Faire tourner" en="Rotate" />
            </button>
            <span style={{ flex: 1 }} />
            {merchantUser?.created_at && (
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                <T fr={`Cree le ${new Date(merchantUser.created_at).toLocaleDateString("fr-FR")}`} en={`Created ${new Date(merchantUser.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`} />
              </span>
            )}
          </div>
        </div>

        {/* Webhooks card */}
        <div className="nk-card">
          <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>Webhooks</h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
                <T fr="Notifications signées HMAC-SHA256" en="HMAC-SHA256 signed notifications" />
              </p>
            </div>
          </div>
          {merchantUser?.callback_url ? (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "12px 0", alignItems: "center" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "oklch(0.93 0.05 145)", color: "var(--success)", fontWeight: 600 }}>POST</span>
                  <span className="mono" style={{ fontSize: 12 }}>{merchantUser.callback_url}</span>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>payment.completed · payment.failed · payment.refunded</div>
              </div>
              <button className="btn btn-ghost btn-sm">
                <T fr="Tester" en="Test" />
              </button>
            </div>
          ) : (
            <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 13 }}>
              <T fr="Aucun endpoint configure. Ajoutez une URL callback dans les parametres." en="No endpoint configured. Add a callback URL in settings." />
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            <Icon name="plus" size={12} /> <T fr="Ajouter un endpoint" en="Add endpoint" />
          </button>
        </div>
      </div>

      {/* Webhook info */}
      <div className="nk-card" style={{ marginBottom: 12 }}>
        <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Livraisons webhook" en="Webhook deliveries" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Les livraisons sont signees HMAC-SHA256" en="Deliveries are signed HMAC-SHA256" />
            </p>
          </div>
        </div>
        <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
          <Icon name="check" size={24} color="var(--success)" />
          <p style={{ marginTop: 8 }}>
            <T fr="Le journal des livraisons sera disponible prochainement." en="Delivery log will be available soon." />
          </p>
        </div>
      </div>

      {/* Integration example — Node.js webhook verification */}
      <div className="nk-card">
        <div className="card-head" style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Exemple d'intégration" en="Integration example" />
          </h3>
        </div>
        <CodeBlock lang="javascript">{webhookVerifyExample}</CodeBlock>
      </div>
    </PageWrapper>
  );
}
