"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Toggle } from "@/components/ui/toggle";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

interface Notification {
  id: string;
  icon: string;
  iconColor: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  time: string;
  unread: boolean;
}

const NOTIFICATIONS: { group: { fr: string; en: string }; items: Notification[] }[] = [
  {
    group: { fr: "Aujourd\u0027hui", en: "Today" },
    items: [
      {
        id: "n1",
        icon: "bolt",
        iconColor: "oklch(0.65 0.18 145)",
        titleFr: "Paiement re\u00e7u",
        titleEn: "Payment received",
        descFr: "PAY-2026-05-30-001 \u2014 45 000 F via Orange Money",
        descEn: "PAY-2026-05-30-001 \u2014 45,000 F via Orange Money",
        time: "Il y a 12 min",
        unread: true,
      },
      {
        id: "n2",
        icon: "alert",
        iconColor: "oklch(0.65 0.18 30)",
        titleFr: "Webhook \u00e9chou\u00e9",
        titleEn: "Webhook failed",
        descFr: "3 tentatives \u00e9chou\u00e9es vers https://api.myshop.cm/hook",
        descEn: "3 failed attempts to https://api.myshop.cm/hook",
        time: "Il y a 45 min",
        unread: true,
      },
      {
        id: "n3",
        icon: "shield",
        iconColor: "oklch(0.55 0.15 260)",
        titleFr: "Connexion depuis un nouvel appareil",
        titleEn: "Login from new device",
        descFr: "Chrome 126 sur Windows \u2014 IP 102.16.xx.xx (Douala)",
        descEn: "Chrome 126 on Windows \u2014 IP 102.16.xx.xx (Douala)",
        time: "Il y a 2h",
        unread: false,
      },
    ],
  },
  {
    group: { fr: "Hier", en: "Yesterday" },
    items: [
      {
        id: "n4",
        icon: "bolt",
        iconColor: "oklch(0.65 0.18 145)",
        titleFr: "Paiement re\u00e7u",
        titleEn: "Payment received",
        descFr: "PAY-2026-05-29-014 \u2014 120 000 F via MTN Money",
        descEn: "PAY-2026-05-29-014 \u2014 120,000 F via MTN Money",
        time: "Hier, 18:32",
        unread: false,
      },
      {
        id: "n5",
        icon: "users",
        iconColor: "oklch(0.55 0.13 220)",
        titleFr: "Nouveau membre ajout\u00e9",
        titleEn: "New team member added",
        descFr: "Samuel Ndongo (s.ndongo@ltcgroup.cm) a \u00e9t\u00e9 invit\u00e9 comme D\u00e9veloppeur",
        descEn: "Samuel Ndongo (s.ndongo@ltcgroup.cm) was invited as Developer",
        time: "Hier, 14:10",
        unread: false,
      },
    ],
  },
  {
    group: { fr: "Cette semaine", en: "This week" },
    items: [
      {
        id: "n6",
        icon: "chart",
        iconColor: "oklch(0.55 0.13 280)",
        titleFr: "Rapport hebdomadaire pr\u00eat",
        titleEn: "Weekly report ready",
        descFr: "Le rapport d\u0027encaissements du 19-25 mai est disponible",
        descEn: "The collections report for May 19-25 is available",
        time: "26 mai, 08:00",
        unread: false,
      },
      {
        id: "n7",
        icon: "check",
        iconColor: "oklch(0.65 0.18 145)",
        titleFr: "KYC : Document valid\u00e9",
        titleEn: "KYC: Document verified",
        descFr: "Votre RCCM a \u00e9t\u00e9 v\u00e9rifi\u00e9 et approuv\u00e9",
        descEn: "Your RCCM has been verified and approved",
        time: "25 mai, 11:20",
        unread: false,
      },
      {
        id: "n8",
        icon: "wallet",
        iconColor: "oklch(0.55 0.18 50)",
        titleFr: "R\u00e8glement effectu\u00e9",
        titleEn: "Payout completed",
        descFr: "412 000 F transf\u00e9r\u00e9s vers Afriland First Bank ****7823",
        descEn: "412,000 F transferred to Afriland First Bank ****7823",
        time: "24 mai, 09:15",
        unread: false,
      },
    ],
  },
];

const CHANNELS = [
  { key: "email", fr: "Email", en: "Email", defaultOn: true },
  { key: "sms", fr: "SMS", en: "SMS", defaultOn: false },
  { key: "push", fr: "Push navigateur", en: "Browser push", defaultOn: true },
  { key: "webhook", fr: "Webhook interne", en: "Internal webhook", defaultOn: true },
];

const ALERT_TYPES = [
  { key: "payments", fr: "Paiements re\u00e7us", en: "Payments received", defaultOn: true },
  { key: "failures", fr: "\u00c9checs & erreurs", en: "Failures & errors", defaultOn: true },
  { key: "security", fr: "S\u00e9curit\u00e9", en: "Security", defaultOn: true },
  { key: "team", fr: "Activit\u00e9 \u00e9quipe", en: "Team activity", defaultOn: false },
  { key: "reports", fr: "Rapports", en: "Reports", defaultOn: true },
  { key: "kyc", fr: "Mises \u00e0 jour KYC", en: "KYC updates", defaultOn: true },
];

export default function MerchantNotificationsPage() {
  const [channels, setChannels] = useState<Record<string, boolean>>(
    Object.fromEntries(CHANNELS.map(c => [c.key, c.defaultOn]))
  );
  const [alerts, setAlerts] = useState<Record<string, boolean>>(
    Object.fromEntries(ALERT_TYPES.map(a => [a.key, a.defaultOn]))
  );

  const unreadCount = NOTIFICATIONS.flatMap(g => g.items).filter(n => n.unread).length;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Notifications" en="Notifications" />]}
      title={<T fr="Notifications" en="Notifications" />}
      sub={<T fr="Centre de notifications et pr\u00e9f\u00e9rences d\u0027alertes" en="Notification center and alert preferences" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="check" size={13} /> <T fr="Tout marquer lu" en="Mark all read" />
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* Notification list */}
        <div>
          {unreadCount > 0 && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
              {unreadCount} <T fr="non lue(s)" en="unread" />
            </div>
          )}
          {NOTIFICATIONS.map(group => (
            <div key={group.group.fr} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)", marginBottom: 8 }}>
                <T fr={group.group.fr} en={group.group.en} />
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {group.items.map((notif, i) => (
                  <div
                    key={notif.id}
                    style={{
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      borderBottom: i < group.items.length - 1 ? "1px solid var(--line)" : "none",
                      background: notif.unread ? "oklch(0.97 0.01 220)" : "transparent",
                    }}
                  >
                    {notif.unread && (
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--ink)",
                        flexShrink: 0,
                        marginTop: 6,
                      }} />
                    )}
                    {!notif.unread && <div style={{ width: 6, flexShrink: 0 }} />}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--bg-2)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}>
                      <Icon name={notif.icon} size={14} color={notif.iconColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: notif.unread ? 600 : 500 }}>
                        <T fr={notif.titleFr} en={notif.titleEn} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        <T fr={notif.descFr} en={notif.descEn} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {notif.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar: preferences */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 15, margin: "0 0 14px" }}>
              <T fr="Canaux de notification" en="Notification channels" />
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHANNELS.map(ch => (
                <div key={ch.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13 }}><T fr={ch.fr} en={ch.en} /></span>
                  <Toggle on={channels[ch.key]} onChange={v => setChannels(prev => ({ ...prev, [ch.key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 15, margin: "0 0 14px" }}>
              <T fr="Types d\u0027alertes" en="Alert types" />
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ALERT_TYPES.map(at => (
                <div key={at.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13 }}><T fr={at.fr} en={at.en} /></span>
                  <Toggle on={alerts[at.key]} onChange={v => setAlerts(prev => ({ ...prev, [at.key]: v }))} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
