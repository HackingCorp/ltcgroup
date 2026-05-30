"use client";

import { Icon } from "@/components/ui/icon";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";

const STEPS = [
  {
    n: "01",
    title: <T fr="Vous cr\u00e9ez le paiement" en="You create the payment" />,
    desc: <T fr="Appel API authentifi\u00e9 avec votre cl\u00e9. Vous sp\u00e9cifiez montant, devise, r\u00e9f\u00e9rence, et un callback URL. Nkap retourne une payment_url en moins de 200ms." en="Authenticated API call with your key. You pass amount, currency, reference, and a callback URL. Nkap returns a payment_url under 200ms." />,
    icon: "code",
    vizContent: ["POST /api/v1/payments", "\u2193", "201 \u00b7 payment_url"],
  },
  {
    n: "02",
    title: <T fr="Le client paie" en="The customer pays" />,
    desc: <T fr="Redirection vers la page Nkap. Le client choisit Orange Money, MTN, Wave ou carte. Confirmation via OTP, USSD ou 3-D Secure." en="Redirect to the Nkap page. Customer picks Orange Money, MTN, Wave or card. Confirms via OTP, USSD or 3-D Secure." />,
    icon: "card",
    vizContent: ["14:42:03 \u2192 create", "14:42:08 \u2192 redirect", "14:42:31 \u2192 otp_sent", "14:42:34 \u2192 \u2713 paid"],
  },
  {
    n: "03",
    title: <T fr="Vous recevez le webhook" en="You receive the webhook" />,
    desc: <T fr="Nkap signe la notification en HMAC-SHA256 et la POST sur votre URL. Idempotent, retry exponentiel jusqu'\u00e0 5 tentatives." en="Nkap signs the notification with HMAC-SHA256 and POSTs to your URL. Idempotent, exponential retry up to 5 times." />,
    icon: "shield",
    vizContent: ["signature.verify()", "order.confirm()", "customer.notify()", "return 200 OK"],
  },
  {
    n: "04",
    title: <T fr="Nkap vire l'argent" en="Nkap settles the money" />,
    desc: <T fr="Cycle quotidien : agr\u00e9gation des transactions, d\u00e9duction des frais, virement bancaire CEMAC en T+1." en="Daily cycle: aggregate transactions, deduct fees, push CEMAC bank transfer T+1." />,
    icon: "bank",
    vizContent: [`\u03a3 ${fmtXAF(847250)}`, "\u2193 T+1", "Afriland \u2022\u2022\u2022\u20224912"],
  },
];

export default function HowItWorksPage() {
  return (
    <div style={{ background: "var(--bg)", padding: "56px 32px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <T fr="Comment \u00e7a marche" en="How it works" />
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 64, lineHeight: 1.02, letterSpacing: "-0.03em", margin: "12px 0 16px" }}>
          <T fr="Du clic au cr\u00e9dit bancaire." en="From click to bank credit." />
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 600, margin: "0 0 48px", lineHeight: 1.45 }}>
          <T fr="Le parcours complet d'un paiement, vu c\u00f4t\u00e9 serveur et c\u00f4t\u00e9 client. Tout est tra\u00e7able, tout est sign\u00e9."
             en="A full payment flow, server-side and client-side. Everything traceable, everything signed." />
        </p>

        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1.2fr 1fr", gap: 32, padding: "32px 0", borderBottom: i < STEPS.length - 1 ? "1px dashed var(--line-2)" : "none", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 72, letterSpacing: "-0.03em", color: "var(--primary)", lineHeight: 1 }}>{s.n}</div>
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 8px" }}>{s.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: 0, maxWidth: 480 }}>{s.desc}</p>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, minHeight: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
              {s.vizContent.map((line, j) => (
                <div key={j} style={{ padding: "6px 10px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, color: j === s.vizContent.length - 1 ? "var(--success)" : "var(--ink)" }}>{line}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
