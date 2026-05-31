"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Toggle } from "@/components/ui/toggle";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

interface NotificationItem {
  t: React.ReactNode;
  d: React.ReactNode;
  tone: "success" | "warn" | "info" | "fail" | "neutral";
  time: string;
  unread?: boolean;
}

interface NotificationGroup {
  day: React.ReactNode;
  items: NotificationItem[];
}

const GROUPS: NotificationGroup[] = [
  {
    day: <T fr="Aujourd'hui" en="Today" />,
    items: [
      { t: <T fr="Paiement de 75 000 F reçu" en="75,000 F payment received" />, d: <T fr="Jean-Pierre Mbarga · Orange Money · réf. ORDER-3041" en="Jean-Pierre Mbarga · Orange Money · ref. ORDER-3041" />, tone: "success", time: "14:42", unread: true },
      { t: <T fr="Paiement de 12 500 F reçu" en="12,500 F payment received" />, d: "Awa Diop · MTN MoMo · réf. ORDER-3040", tone: "success", time: "14:35", unread: true },
      { t: <T fr="3 paiements en attente d'OTP" en="3 payments awaiting OTP" />, d: "PAY-7C8B92F1, PAY-3B12C9D4, PAY-5E91A2B7", tone: "warn", time: "14:30", unread: true },
      { t: <T fr="Nouvelle clé API utilisée" en="New API key in use" />, d: "41.202.x.x (Douala)", tone: "info", time: "12:14" },
    ],
  },
  {
    day: <T fr="Hier" en="Yesterday" />,
    items: [
      { t: <T fr="Règlement de 1 892 450 F envoyé" en="1,892,450 F payout sent" />, d: <T fr="Vers Afriland First Bank â¢â¢â¢â¢4912" en="To Afriland First Bank â¢â¢â¢â¢4912" />, tone: "neutral", time: "25 mai · 23:00" },
      { t: <T fr="Nouvelle connexion détectée" en="New login detected" />, d: "iPhone 15 Pro · Douala · IP 41.202.x.x", tone: "info", time: "25 mai · 18:42" },
      { t: <T fr="Webhook échoué (500)" en="Webhook failed (500)" />, d: "https://api.mamishop.cm/webhooks/nkap", tone: "fail", time: "25 mai · 13:55" },
    ],
  },
  {
    day: <T fr="Cette semaine" en="This week" />,
    items: [
      { t: <T fr="Plan Growth activé" en="Growth plan activated" />, d: <T fr="Tarif descendu Ã  1,5%. Ãconomie ce mois : 52 200 F" en="Rate down to 1.5%. Savings this month: 52,200 F" />, tone: "success", time: "23 mai" },
      { t: <T fr="Nouveau membre invité" en="New member invited" />, d: "olive@mamishop.cm · rôle Support", tone: "info", time: "22 mai" },
    ],
  },
];

const toneMap: Record<string, { bg: string; c: string; ic: string }> = {
  success: { bg: "oklch(0.93 0.05 145)", c: "var(--accent-success)", ic: "check" },
  warn: { bg: "oklch(0.93 0.08 80)", c: "oklch(0.55 0.15 80)", ic: "alert" },
  info: { bg: "oklch(0.97 0.01 260)", c: "var(--ink)", ic: "info" },
  fail: { bg: "oklch(0.93 0.05 25)", c: "oklch(0.55 0.2 25)", ic: "x" },
  neutral: { bg: "var(--bg-2)", c: "var(--ink)", ic: "arrowDown" },
};

const CHANNELS = [
  { key: "dashboard", name: "Dashboard", defaultOn: true },
  { key: "email", name: "Email · marie@mamishop.cm", defaultOn: true },
  { key: "sms", name: "SMS · +237 670 12 34 56", defaultOn: true },
  { key: "slack", name: "Slack · #payments", defaultOn: false },
  { key: "webhook", name: "Webhook custom", defaultOn: false },
];

const ALERT_TYPES = [
  { key: "large_payments", fr: "Paiements réussis > 100k F", en: "Successful payments > 100k F", defaultOn: true },
  { key: "failed", fr: "Paiements échoués", en: "Failed payments", defaultOn: true },
  { key: "webhook_errors", fr: "Webhooks en erreur", en: "Webhook errors", defaultOn: true },
  { key: "payouts", fr: "Règlements bancaires", en: "Bank payouts", defaultOn: true },
  { key: "signins", fr: "Nouvelles connexions", en: "New sign-ins", defaultOn: true },
  { key: "newsletter", fr: "Newsletter produit", en: "Product newsletter", defaultOn: false },
];

export default function MerchantNotificationsPage() {
  const [channels, setChannels] = useState<Record<string, boolean>>(
    Object.fromEntries(CHANNELS.map(c => [c.key, c.defaultOn]))
  );
  const [alerts, setAlerts] = useState<Record<string, boolean>>(
    Object.fromEntries(ALERT_TYPES.map(a => [a.key, a.defaultOn]))
  );

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Notifications" en="Notifications" />]}
      title={<T fr="Notifications" en="Notifications" />}
      sub={<T fr="12 non lues · Tout marquer comme lu" en="12 unread · Mark all as read" />}
      actions={
        <>
          <button className="btn btn-ghost btn-sm">
            <T fr="Tout marquer lu" en="Mark all read" />
          </button>
          <button className="btn btn-ghost btn-sm">
            <Icon name="settings" size={13} /> <T fr="Préférences" en="Preferences" />
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Notification list */}
        <div>
          {GROUPS.map((g, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                {g.day}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.items.map((n, j) => {
                  const t = toneMap[n.tone];
                  return (
                    <div
                      key={j}
                      className="card"
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        position: "relative",
                        borderColor: n.unread ? "var(--ink)" : "var(--line)",
                      }}
                    >
                      {n.unread && (
                        <div style={{ position: "absolute", left: -4, top: 16, width: 6, height: 6, borderRadius: "50%", background: "var(--ink)" }} />
                      )}
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: t.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon name={t.ic} size={14} color={t.c} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: n.unread ? 500 : 450, fontSize: 14 }}>{n.t}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{n.d}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{n.time}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar: channels & alert types */}
        <div>
          {/* Channels */}
          <div className="card">
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 16px" }}>
              <T fr="Canaux" en="Channels" />
            </h4>
            {CHANNELS.map((c, i) => (
              <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 13 }}>
                <span>{c.name}</span>
                <Toggle on={channels[c.key]} onChange={v => setChannels(prev => ({ ...prev, [c.key]: v }))} />
              </div>
            ))}
          </div>

          {/* Alert types */}
          <div className="card" style={{ marginTop: 12 }}>
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 4px" }}>
              <T fr="Types d'alertes" en="Alert types" />
            </h4>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
              <T fr="Choisissez ce que vous voulez recevoir" en="Choose what you want to receive" />
            </p>
            {ALERT_TYPES.map((c, i) => (
              <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
                <span><T fr={c.fr} en={c.en} /></span>
                <Toggle on={alerts[c.key]} onChange={v => setAlerts(prev => ({ ...prev, [c.key]: v }))} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
