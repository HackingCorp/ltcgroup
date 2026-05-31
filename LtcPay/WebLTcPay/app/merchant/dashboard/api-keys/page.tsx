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
  { id: "wh-001", event: "payment.completed", url: "https://api.mamishop.cm/webhooks/nkap", status: "delivered" as const, code: 200, time: "14:42:35", duration: "142ms" },
  { id: "wh-002", event: "payment.completed", url: "https://api.mamishop.cm/webhooks/nkap", status: "delivered" as const, code: 200, time: "14:35:14", duration: "188ms" },
  { id: "wh-003", event: "payment.completed", url: "https://api.mamishop.cm/webhooks/nkap", status: "delivered" as const, code: 200, time: "14:22:51", duration: "201ms" },
  { id: "wh-004", event: "payment.failed", url: "https://api.mamishop.cm/webhooks/nkap", status: "delivered" as const, code: 200, time: "14:08:33", duration: "164ms" },
  { id: "wh-005", event: "payment.completed", url: "https://api.mamishop.cm/webhooks/nkap", status: "failed" as const, code: 500, time: "13:55:01", duration: "5022ms" },
  { id: "wh-006", event: "payment.completed", url: "https://api.mamishop.cm/webhooks/nkap", status: "delivered" as const, code: 200, time: "13:42:22", duration: "158ms" },
];

const WEBHOOK_ENDPOINTS = [
  { url: "https://api.mamishop.cm/webhooks/nkap", events: "payment.completed \u00b7 payment.failed \u00b7 payment.refunded", active: true, uptime: "99.2%" },
  { url: "https://staging.mamishop.cm/webhooks/nkap", events: "payment.completed", active: true, uptime: "100%" },
];

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

  const webhookVerifyExample = `// Node.js \u2014 verify webhook signature
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
      crumb={[<T key="c1" fr="D\u00e9veloppeur" en="Developer" />, <T key="c2" fr="API & Webhooks" en="API & Webhooks" />]}
      title="API & Webhooks"
      sub={<T fr="Cl\u00e9s d'API, endpoints webhook, livraisons" en="API keys, webhook endpoints, deliveries" />}
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
        <div className="card">
          <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
                <T fr="Cl\u00e9s d'API" en="API keys" />
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
                ltcpay_{env}_pk_8a3f9c2e1b4d7f50a9b...
              </span>
              <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }} onClick={() => copyToClipboard(`ltcpay_${env}_pk_8a3f9c2e1b4d7f50a9b`, "pk")}>
                <Icon name={copiedField === "pk" ? "check" : "copy"} size={12} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "var(--bg-2)", borderRadius: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", width: 80 }}>sk_{env}</span>
              <span className="mono" style={{ flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {showSecret ? `ltcpay_${env}_sk_3f9c2e1b4d7f50a9b8c7d6e...` : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }} onClick={() => setShowSecret(!showSecret)}>
                <Icon name={showSecret ? "eyeOff" : "eye"} size={12} />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }} onClick={() => copyToClipboard(`ltcpay_${env}_sk_3f9c2e1b4d7f50a9b8c7d6e`, "sk")}>
                <Icon name={copiedField === "sk" ? "check" : "copy"} size={12} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            <button className="btn btn-ghost btn-sm">
              <Icon name="refresh" size={12} /> <T fr="Faire tourner" en="Rotate" />
            </button>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
              <T fr="Cr\u00e9\u00e9e le 12 mars 2026" en="Created Mar 12, 2026" />
            </span>
          </div>
        </div>

        {/* Webhooks card */}
        <div className="card">
          <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>Webhooks</h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
                <T fr="Notifications sign\u00e9es HMAC-SHA256" en="HMAC-SHA256 signed notifications" />
              </p>
            </div>
          </div>
          {WEBHOOK_ENDPOINTS.map((w, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, padding: "12px 0", borderBottom: i === 0 ? "1px solid var(--line)" : "none", alignItems: "center" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-success)" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "oklch(0.93 0.05 145)", color: "var(--accent-success)", fontWeight: 600 }}>POST</span>
                  <span className="mono" style={{ fontSize: 12 }}>{w.url}</span>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{w.events}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--accent-success)" }}>{w.uptime}</span>
              <button className="btn btn-ghost btn-sm">
                <T fr="Tester" en="Test" />
              </button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            <Icon name="plus" size={12} /> <T fr="Ajouter un endpoint" en="Add endpoint" />
          </button>
        </div>
      </div>

      {/* Recent deliveries */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Livraisons r\u00e9centes" en="Recent deliveries" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="12 derni\u00e8res heures \u00b7 100% succ\u00e8s" en="Last 12h \u00b7 100% success" />
            </p>
          </div>
          <button className="btn btn-link" style={{ fontSize: 13, padding: 0, background: "none", border: "none", color: "var(--ink)", cursor: "pointer", textDecoration: "underline" }}>
            <T fr="Journal complet" en="Full log" />
          </button>
        </div>
        <div className="tbl">
          {WEBHOOK_DELIVERIES.map((d) => (
            <div key={d.id} className="row" style={{ gridTemplateColumns: "auto 1fr auto auto auto", padding: "10px 0", borderBottom: "none" }}>
              <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "oklch(0.93 0.05 145)", color: "var(--accent-success)", fontWeight: 600 }}>POST</span>
              <div>
                <div className="mono" style={{ fontSize: 11 }}>{d.url}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{d.event}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: d.code === 500 ? "oklch(0.55 0.2 25)" : "var(--accent-success)", fontWeight: 500 }}>{d.code}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{d.duration}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{d.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Integration example — Node.js webhook verification */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="Exemple d'int\u00e9gration" en="Integration example" />
          </h3>
        </div>
        <CodeBlock lang="javascript">{webhookVerifyExample}</CodeBlock>
      </div>
    </PageWrapper>
  );
}
