"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Toggle } from "@/components/ui/toggle";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

type Tab = "account" | "payouts" | "security" | "branding" | "danger";

const TABS: { key: Tab; fr: string; en: string; icon: string }[] = [
  { key: "account", fr: "Compte", en: "Account", icon: "building" },
  { key: "payouts", fr: "R\u00e8glements", en: "Payouts", icon: "bank" },
  { key: "security", fr: "S\u00e9curit\u00e9", en: "Security", icon: "shield" },
  { key: "branding", fr: "Marque", en: "Branding", icon: "star" },
  { key: "danger", fr: "Zone danger", en: "Danger zone", icon: "alert" },
];

const BUSINESS_INFO = [
  { labelFr: "Raison sociale", labelEn: "Business name", value: "LTC Group SARL", verified: true },
  { labelFr: "Num\u00e9ro RCCM", labelEn: "RCCM number", value: "RC/DLA/2024/B/1847", verified: true },
  { labelFr: "NIU", labelEn: "Tax ID", value: "M012400028471R", verified: true },
  { labelFr: "Adresse", labelEn: "Address", value: "Rue 1.033, Bonanjo, Douala", verified: false },
  { labelFr: "Secteur d\u0027activit\u00e9", labelEn: "Industry", value: "Fintech / Paiements", verified: false },
  { labelFr: "Site web", labelEn: "Website", value: "https://nkap.pay", verified: true },
  { labelFr: "Email de contact", labelEn: "Contact email", value: "contact@ltcgroup.cm", verified: true },
  { labelFr: "T\u00e9l\u00e9phone", labelEn: "Phone", value: "+237 6 99 12 34 56", verified: false },
];

const BANK_ACCOUNTS = [
  { bank: "Afriland First Bank", account: "****7823", type: "Compte courant", typeEn: "Current account", primary: true },
  { bank: "Ecobank Cameroun", account: "****4501", type: "\u00c9pargne", typeEn: "Savings", primary: false },
];

const IP_WHITELIST = [
  "102.16.45.0/24",
  "41.202.219.12",
  "196.168.1.0/24",
];

export default function MerchantSettingsPage() {
  const [tab, setTab] = useState<Tab>("account");
  const [twoFA, setTwoFA] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Param\u00e8tres" en="Settings" />]}
      title={<T fr="Param\u00e8tres" en="Settings" />}
      sub={<T fr="Configuration g\u00e9n\u00e9rale de votre compte marchand Nkap Pay" en="General configuration for your Nkap Pay merchant account" />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        {/* Tab navigation */}
        <div className="card" style={{ padding: 8, alignSelf: "start" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderRadius: 6,
                background: tab === t.key ? "var(--bg-2)" : "transparent",
                color: tab === t.key ? "var(--ink)" : "var(--muted)",
                fontWeight: tab === t.key ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <Icon name={t.icon} size={14} />
              <T fr={t.fr} en={t.en} />
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {/* Account tab */}
          {tab === "account" && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
                    <T fr="Informations de l\u0027entreprise" en="Business information" />
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    <T fr="Donn\u00e9es v\u00e9rifi\u00e9es lors du KYC" en="Data verified during KYC" />
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="settings" size={13} /> <T fr="Modifier" en="Edit" />
                </button>
              </div>
              {BUSINESS_INFO.map((info, i) => (
                <div
                  key={info.labelFr}
                  style={{
                    padding: "12px 20px",
                    display: "grid",
                    gridTemplateColumns: "180px 1fr auto",
                    alignItems: "center",
                    borderBottom: i < BUSINESS_INFO.length - 1 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                    <T fr={info.labelFr} en={info.labelEn} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{info.value}</div>
                  <div>
                    {info.verified ? (
                      <Pill tone="success"><Icon name="check" size={10} /> <T fr="v\u00e9rifi\u00e9" en="verified" /></Pill>
                    ) : (
                      <Pill tone="neutral"><T fr="non v\u00e9rifi\u00e9" en="unverified" /></Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payouts tab */}
          {tab === "payouts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
                    <T fr="Comptes bancaires" en="Bank accounts" />
                  </h3>
                  <button className="btn btn-ghost btn-sm">
                    <Icon name="plus" size={13} /> <T fr="Ajouter" en="Add" />
                  </button>
                </div>
                {BANK_ACCOUNTS.map((ba, i) => (
                  <div
                    key={ba.account}
                    style={{
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: i < BANK_ACCOUNTS.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "var(--bg-2)",
                        display: "grid",
                        placeItems: "center",
                      }}>
                        <Icon name="bank" size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{ba.bank}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                          {ba.account} {"\u00b7"} <T fr={ba.type} en={ba.typeEn} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {ba.primary && <Pill tone="info"><T fr="principal" en="primary" /></Pill>}
                      <button className="btn btn-ghost btn-sm"><Icon name="more" size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
                  <T fr="Calendrier de r\u00e8glement" en="Payout schedule" />
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { fr: "Fr\u00e9quence", en: "Frequency", value: "Hebdomadaire", valueEn: "Weekly" },
                    { fr: "Jour de r\u00e8glement", en: "Payout day", value: "Vendredi", valueEn: "Friday" },
                    { fr: "Seuil minimum", en: "Minimum threshold", value: "50 000 F", valueEn: "50,000 F" },
                  ].map(item => (
                    <div key={item.fr} style={{ padding: 14, background: "var(--bg-2)", borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginBottom: 6 }}>
                        <T fr={item.fr} en={item.en} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        <T fr={item.value} en={item.valueEn} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security tab */}
          {tab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 16px" }}>
                  <T fr="Authentification" en="Authentication" />
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
                        <Icon name="lock" size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          <T fr="Authentification \u00e0 deux facteurs (2FA)" en="Two-factor authentication (2FA)" />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          <T fr="Code TOTP requis \u00e0 chaque connexion" en="TOTP code required on each login" />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Pill tone={twoFA ? "success" : "warn"}>{twoFA ? <T fr="actif" en="active" /> : <T fr="inactif" en="inactive" />}</Pill>
                      <Toggle on={twoFA} onChange={setTwoFA} />
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
                        <Icon name="bell" size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          <T fr="Alertes SMS" en="SMS alerts" />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          <T fr="Recevoir un SMS pour chaque paiement > 100 000 F" en="Receive SMS for each payment > 100,000 F" />
                        </div>
                      </div>
                    </div>
                    <Toggle on={smsAlerts} onChange={setSmsAlerts} />
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
                        <Icon name="shield" size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          <T fr="Alertes de connexion" en="Login alerts" />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          <T fr="Email lors d\u0027une connexion depuis un nouvel appareil" en="Email on login from a new device" />
                        </div>
                      </div>
                    </div>
                    <Toggle on={loginAlerts} onChange={setLoginAlerts} />
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
                    <T fr="Liste blanche IP" en="IP whitelist" />
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Toggle on={ipWhitelist} onChange={setIpWhitelist} />
                    <Pill tone={ipWhitelist ? "success" : "neutral"}>{ipWhitelist ? <T fr="actif" en="active" /> : <T fr="inactif" en="inactive" />}</Pill>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                  <T fr="Seules ces adresses IP pourront appeler votre API" en="Only these IP addresses can call your API" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {IP_WHITELIST.map(ip => (
                    <div key={ip} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-2)", borderRadius: 6 }}>
                      <span className="mono" style={{ fontSize: 12 }}>{ip}</span>
                      <button className="btn btn-ghost btn-sm"><Icon name="x" size={12} /></button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
                  <Icon name="plus" size={12} /> <T fr="Ajouter une IP" en="Add IP" />
                </button>
              </div>
            </div>
          )}

          {/* Branding tab */}
          {tab === "branding" && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 6px" }}>
                <T fr="Personnalisation du checkout" en="Checkout customization" />
              </h3>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
                <T fr="Adaptez l\u0027apparence de la page de paiement \u00e0 votre marque" en="Adapt the payment page appearance to your brand" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--bg-2)", display: "grid", placeItems: "center", border: "2px dashed var(--line-2)" }}>
                      <Icon name="upload" size={20} color="var(--muted)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}><T fr="Logo de l\u0027entreprise" en="Company logo" /></div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}><T fr="PNG ou SVG, 512x512 max" en="PNG or SVG, 512x512 max" /></div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm"><Icon name="upload" size={13} /> <T fr="Importer" en="Upload" /></button>
                </div>

                {/* Colors */}
                <div style={{ paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                    <T fr="Couleurs" en="Colors" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-2)", borderRadius: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a1a2e", border: "2px solid var(--line)" }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}><T fr="Couleur primaire" en="Primary color" /></div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>#1a1a2e</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-2)", borderRadius: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "#e8b931", border: "2px solid var(--line)" }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}><T fr="Couleur d\u0027accent" en="Accent color" /></div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>#e8b931</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subdomain */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                    <T fr="Sous-domaine de paiement" en="Payment subdomain" />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <div style={{
                      padding: "8px 14px",
                      background: "var(--bg-2)",
                      borderRadius: "6px 0 0 6px",
                      border: "1px solid var(--line)",
                      borderRight: "none",
                      fontSize: 13,
                      color: "var(--muted)",
                    }}>
                      https://
                    </div>
                    <div style={{
                      padding: "8px 14px",
                      border: "1px solid var(--line)",
                      fontSize: 13,
                      fontWeight: 500,
                      minWidth: 120,
                    }}>
                      ltcgroup
                    </div>
                    <div style={{
                      padding: "8px 14px",
                      background: "var(--bg-2)",
                      borderRadius: "0 6px 6px 0",
                      border: "1px solid var(--line)",
                      borderLeft: "none",
                      fontSize: 13,
                      color: "var(--muted)",
                    }}>
                      .pay.nkap.cm
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    <T fr="Les clients verront cette URL lors du paiement" en="Customers will see this URL during payment" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Danger zone tab */}
          {tab === "danger" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 20, border: "1px solid oklch(0.7 0.15 30)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "oklch(0.5 0.15 30)" }}>
                      <T fr="D\u00e9sactiver le mode production" en="Disable live mode" />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      <T
                        fr="Basculer en mode test. Les paiements en production seront refus\u00e9s."
                        en="Switch to test mode. Live payments will be rejected."
                      />
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm">
                    <T fr="D\u00e9sactiver" en="Disable" />
                  </button>
                </div>
              </div>

              <div className="card" style={{ padding: 20, border: "1px solid oklch(0.65 0.2 25)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "oklch(0.45 0.2 25)" }}>
                      <T fr="Supprimer le compte" en="Delete account" />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      <T
                        fr="Cette action est irr\u00e9versible. Toutes les donn\u00e9es seront supprim\u00e9es d\u00e9finitivement."
                        en="This action is irreversible. All data will be permanently deleted."
                      />
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm">
                    <Icon name="trash" size={13} /> <T fr="Supprimer" en="Delete" />
                  </button>
                </div>
              </div>

              <div className="card" style={{ padding: 20, borderLeft: "3px solid var(--ink)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Icon name="info" size={16} color="var(--ink)" />
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                    <T
                      fr="Avant de supprimer votre compte, assurez-vous que tous les r\u00e8glements en attente ont \u00e9t\u00e9 trait\u00e9s et que vous avez t\u00e9l\u00e9charg\u00e9 tous vos rapports fiscaux."
                      en="Before deleting your account, make sure all pending payouts have been processed and you have downloaded all your tax reports."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
