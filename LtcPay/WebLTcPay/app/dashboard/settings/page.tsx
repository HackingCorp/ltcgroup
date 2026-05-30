"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

type Tab = "general" | "security" | "notifications";

const TABS: { key: Tab; labelFr: string; labelEn: string; icon: string }[] = [
  { key: "general", labelFr: "General", labelEn: "General", icon: "settings" },
  { key: "security", labelFr: "Securite", labelEn: "Security", icon: "shield" },
  { key: "notifications", labelFr: "Notifications", labelEn: "Notifications", icon: "bell" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Plateforme" en="Platform" />,
        <T key="c2" fr="Parametres" en="Settings" />,
      ]}
      title={<T fr="Parametres" en="Settings" />}
      sub={<T fr="Configuration de la plateforme et preferences" en="Platform configuration and preferences" />}
    >
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              appearance: "none",
              border: "none",
              background: "transparent",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 500 : 400,
              color: activeTab === tab.key ? "var(--ink)" : "var(--muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--ink)" : "2px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--body)",
              transition: "color 0.12s, border-color 0.12s",
              marginBottom: -1,
            }}
          >
            <Icon name={tab.icon} size={14} color={activeTab === tab.key ? "var(--ink)" : "var(--muted)"} />
            <T fr={tab.labelFr} en={tab.labelEn} />
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "general" && <GeneralTab />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "notifications" && <NotificationsTab />}
    </PageWrapper>
  );
}

/* ─── General tab ─── */
function GeneralTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Platform info */}
      <div className="nk-card">
        <div className="card-head">
          <div>
            <h3><T fr="Informations de la plateforme" en="Platform information" /></h3>
            <p className="sub"><T fr="Parametres generaux du systeme" en="General system settings" /></p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label className="field-label"><T fr="Nom de la plateforme" en="Platform name" /></label>
            <input className="nk-input" defaultValue="Nkap Pay" />
          </div>
          <div className="field">
            <label className="field-label"><T fr="Email de contact" en="Contact email" /></label>
            <input className="nk-input" defaultValue="admin@nkappay.com" />
          </div>
          <div className="field">
            <label className="field-label"><T fr="Devise par defaut" en="Default currency" /></label>
            <input className="nk-input" defaultValue="XAF" disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field">
            <label className="field-label"><T fr="Fuseau horaire" en="Timezone" /></label>
            <input className="nk-input" defaultValue="Africa/Douala (UTC+1)" disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary btn-sm">
            <Icon name="check" size={13} color="var(--bg)" />
            <T fr="Enregistrer" en="Save" />
          </button>
        </div>
      </div>

      {/* API config */}
      <div className="nk-card">
        <div className="card-head">
          <div>
            <h3><T fr="Configuration API" en="API configuration" /></h3>
            <p className="sub"><T fr="Parametres de connexion TouchPay" en="TouchPay connection settings" /></p>
          </div>
          <Pill tone="success"><T fr="Connecte" en="Connected" /></Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label className="field-label"><T fr="Endpoint SDK" en="SDK endpoint" /></label>
            <input className="nk-input nk-input-mono" defaultValue="touchpay.gutouch.net" disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field">
            <label className="field-label"><T fr="Endpoint API directe" en="Direct API endpoint" /></label>
            <input className="nk-input nk-input-mono" defaultValue="apidist.gutouch.net" disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Security tab ─── */
function SecurityTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Password */}
      <div className="nk-card">
        <div className="card-head">
          <div>
            <h3><T fr="Mot de passe" en="Password" /></h3>
            <p className="sub"><T fr="Modifiez votre mot de passe administrateur" en="Change your admin password" /></p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          <div className="field">
            <label className="field-label"><T fr="Mot de passe actuel" en="Current password" /></label>
            <input className="nk-input" type="password" placeholder="********" />
          </div>
          <div className="field">
            <label className="field-label"><T fr="Nouveau mot de passe" en="New password" /></label>
            <input className="nk-input" type="password" placeholder="********" />
          </div>
          <div className="field">
            <label className="field-label"><T fr="Confirmer" en="Confirm" /></label>
            <input className="nk-input" type="password" placeholder="********" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary btn-sm">
            <Icon name="lock" size={13} color="var(--bg)" />
            <T fr="Mettre a jour" en="Update" />
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div className="nk-card">
        <div className="card-head">
          <div>
            <h3><T fr="Sessions actives" en="Active sessions" /></h3>
            <p className="sub"><T fr="Gerez les sessions connectees" en="Manage connected sessions" /></p>
          </div>
        </div>
        <div className="tbl" style={{ margin: "0 -20px -20px" }}>
          <div className="row head" style={{ gridTemplateColumns: "1fr 1fr 0.6fr" }}>
            <div><T fr="Appareil" en="Device" /></div>
            <div><T fr="Adresse IP" en="IP address" /></div>
            <div style={{ textAlign: "right" }}><T fr="Derniere activite" en="Last active" /></div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 0.6fr" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="globe" size={14} color="var(--muted)" />
              <span>Chrome / macOS</span>
              <Pill tone="success"><T fr="Actuel" en="Current" /></Pill>
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>192.168.1.42</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}><T fr="Maintenant" en="Now" /></div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 0.6fr" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="phone" size={14} color="var(--muted)" />
              <span>Safari / iOS</span>
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>10.0.0.15</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>28 mai 2026</div>
          </div>
        </div>
      </div>

      {/* 2FA */}
      <div className="nk-card">
        <div className="card-head">
          <div>
            <h3><T fr="Authentification a deux facteurs" en="Two-factor authentication" /></h3>
            <p className="sub"><T fr="Ajoutez une couche de securite supplementaire" en="Add an extra layer of security" /></p>
          </div>
          <Pill tone="warn"><T fr="Desactive" en="Disabled" /></Pill>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, maxWidth: 500 }}>
          <T
            fr="Activez l'authentification a deux facteurs pour proteger votre compte avec un code supplementaire lors de la connexion."
            en="Enable two-factor authentication to protect your account with an additional code at login."
          />
        </p>
        <button className="btn btn-ghost btn-sm">
          <Icon name="shield" size={13} />
          <T fr="Activer 2FA" en="Enable 2FA" />
        </button>
      </div>
    </div>
  );
}

/* ─── Notifications tab ─── */
function NotificationsTab() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [failedPayments, setFailedPayments] = useState(true);
  const [newMerchants, setNewMerchants] = useState(false);
  const [dailyReport, setDailyReport] = useState(true);

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: on ? "var(--primary)" : "var(--line-2)",
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "background 0.15s",
    flexShrink: 0,
  });

  const dotStyle = (on: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 3,
    left: on ? 21 : 3,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "white",
    transition: "left 0.15s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="nk-card">
        <div className="card-head">
          <div>
            <h3><T fr="Preferences de notification" en="Notification preferences" /></h3>
            <p className="sub"><T fr="Configurez les alertes et rapports" en="Configure alerts and reports" /></p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Toggle row */}
          {[
            {
              titleFr: "Alertes par email",
              titleEn: "Email alerts",
              descFr: "Recevez des notifications par email pour les evenements importants",
              descEn: "Receive email notifications for important events",
              value: emailAlerts,
              onChange: setEmailAlerts,
              icon: "mail",
            },
            {
              titleFr: "Paiements echoues",
              titleEn: "Failed payments",
              descFr: "Soyez alerte lorsqu'un paiement echoue",
              descEn: "Get alerted when a payment fails",
              value: failedPayments,
              onChange: setFailedPayments,
              icon: "alert",
            },
            {
              titleFr: "Nouveaux marchands",
              titleEn: "New merchants",
              descFr: "Notification lors de l'inscription d'un nouveau marchand",
              descEn: "Get notified when a new merchant registers",
              value: newMerchants,
              onChange: setNewMerchants,
              icon: "users",
            },
            {
              titleFr: "Rapport quotidien",
              titleEn: "Daily report",
              descFr: "Resume quotidien de l'activite de la plateforme",
              descEn: "Daily summary of platform activity",
              value: dailyReport,
              onChange: setDailyReport,
              icon: "chart",
            },
          ].map((item, idx) => (
            <div
              key={item.icon}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                padding: "14px 0",
                borderTop: idx > 0 ? "1px solid var(--line)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ marginTop: 2 }}>
                  <Icon name={item.icon} size={16} color="var(--muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    <T fr={item.titleFr} en={item.titleEn} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    <T fr={item.descFr} en={item.descEn} />
                  </div>
                </div>
              </div>
              <button
                style={toggleStyle(item.value)}
                onClick={() => item.onChange(!item.value)}
                aria-label={item.titleEn}
              >
                <div style={dotStyle(item.value)} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary btn-sm">
            <Icon name="check" size={13} color="var(--bg)" />
            <T fr="Enregistrer" en="Save" />
          </button>
        </div>
      </div>

      {/* Webhook section */}
      <div className="nk-card">
        <div className="card-head">
          <div>
            <h3><T fr="Webhooks systeme" en="System webhooks" /></h3>
            <p className="sub"><T fr="URL de callback pour les evenements de la plateforme" en="Callback URLs for platform events" /></p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 500 }}>
          <div className="field">
            <label className="field-label"><T fr="URL de webhook" en="Webhook URL" /></label>
            <input className="nk-input nk-input-mono" placeholder="https://example.com/webhook" />
          </div>
          <p className="field-help">
            <T fr="Les evenements de paiement seront envoyes a cette URL via POST." en="Payment events will be sent to this URL via POST." />
          </p>
        </div>
      </div>
    </div>
  );
}
