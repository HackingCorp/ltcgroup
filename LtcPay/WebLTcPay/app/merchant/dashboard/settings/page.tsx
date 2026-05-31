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
  { key: "branding", fr: "Branding checkout", en: "Checkout branding", icon: "star" },
  { key: "danger", fr: "Zone rouge", en: "Danger zone", icon: "alert" },
];

const BUSINESS_INFO = [
  { labelFr: "Raison sociale", labelEn: "Legal name", value: "Boutique Mami SARL", verified: false, action: "edit" as const },
  { labelFr: "Registre de commerce", labelEn: "Trade register", value: "RC/YDE/2024/B/0421", verified: true, action: "verified" as const },
  { labelFr: "Num\u00e9ro contribuable", labelEn: "Tax ID", value: "M0824100021T", verified: true, action: "verified" as const },
  { labelFr: "Email principal", labelEn: "Primary email", value: "contact@mamishop.cm", verified: false, action: "edit" as const },
  { labelFr: "T\u00e9l\u00e9phone", labelEn: "Phone", value: "+237 670 12 34 56", verified: true, action: "verified" as const },
  { labelFr: "Adresse", labelEn: "Address", value: "Yaound\u00e9, BP 1234", verified: false, action: "edit" as const },
];

const IP_WHITELIST = [
  "41.202.0.0/16",
  "154.0.0.0/24",
];

const BRAND_COLORS = ["#2D24E5", "#0E4D3A", "#E07852", "#C77900", "#0A0A0A"];

export default function MerchantSettingsPage() {
  const [tab, setTab] = useState<Tab>("account");
  const [twoFA, setTwoFA] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState(true);
  const [payoutSchedule, setPayoutSchedule] = useState("daily");
  const [selectedColor, setSelectedColor] = useState("#2D24E5");

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Param\u00e8tres" en="Settings" />]}
      title={<T fr="Param\u00e8tres" en="Settings" />}
      sub={<T fr="Compte, s\u00e9curit\u00e9, branding, et autres r\u00e9glages" en="Account, security, branding, and other settings" />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24 }}>
        {/* Tab navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                appearance: "none",
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 450,
                fontFamily: "inherit",
                background: tab === t.key ? "var(--ink)" : "transparent",
                color: tab === t.key ? "var(--bg)" : "var(--muted)",
              }}
            >
              <T fr={t.fr} en={t.en} />
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {/* Account tab */}
          {tab === "account" && (
            <div className="card">
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, margin: "0 0 4px" }}>
                <T fr="Informations entreprise" en="Business information" />
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 24px" }}>
                <T fr="Donn\u00e9es l\u00e9gales et de contact. Modifications soumises \u00e0 validation KYC." en="Legal and contact data. Edits subject to KYC review." />
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {BUSINESS_INFO.map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < BUSINESS_INFO.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{r.value}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        <T fr={r.labelFr} en={r.labelEn} />
                        {r.labelFr === "Registre de commerce" && " \u2014 Cameroun"}
                      </div>
                    </div>
                    {r.action === "verified" ? (
                      <Pill tone="success">verified</Pill>
                    ) : (
                      <button className="btn btn-ghost btn-sm">
                        <T fr="Modifier" en="Edit" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payouts tab */}
          {tab === "payouts" && (
            <div className="card">
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, margin: "0 0 24px" }}>
                <T fr="Comptes de r\u00e8glement" en="Payout accounts" />
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Primary bank account */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "1px solid var(--ink)", borderRadius: 10, background: "oklch(0.97 0.01 260)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "white", display: "grid", placeItems: "center" }}>
                    <Icon name="bank" size={18} color="var(--ink)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontWeight: 500, display: "block" }}>Afriland First Bank \u00b7 \u2022\u2022\u2022\u20224912</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      <T fr="Compte principal \u2014 r\u00e8glement T+1" en="Primary account \u2014 T+1 settlement" />
                    </span>
                  </div>
                  <Pill tone="info">primary</Pill>
                </div>

                {/* Secondary wallet */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "1px solid var(--line)", borderRadius: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FF6600", display: "grid", placeItems: "center", color: "white", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700 }}>OM</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontWeight: 500, display: "block" }}>Orange Money \u00b7 \u2022\u2022\u2022 56</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      <T fr="Wallet secondaire \u2014 retrait instantan\u00e9" en="Secondary wallet \u2014 instant withdraw" />
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm">
                    <T fr="D\u00e9finir par d\u00e9faut" en="Set as default" />
                  </button>
                </div>

                <button className="btn btn-ghost" style={{ marginTop: 8, justifyContent: "center" }}>
                  <Icon name="plus" size={14} /> <T fr="Ajouter un compte" en="Add account" />
                </button>
              </div>

              {/* Payout schedule as selectable cards */}
              <div style={{ marginTop: 32 }}>
                <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 16, margin: "0 0 12px" }}>
                  <T fr="Fr\u00e9quence de r\u00e8glement" en="Payout schedule" />
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { v: "daily", labelFr: "Quotidien", labelEn: "Daily", sub: "T+1" },
                    { v: "weekly", labelFr: "Hebdomadaire", labelEn: "Weekly", subFr: "Tous les vendredis", subEn: "Every Friday" },
                    { v: "manual", labelFr: "Manuel", labelEn: "Manual", subFr: "\u00c0 la demande", subEn: "On demand" },
                  ].map(o => (
                    <div
                      key={o.v}
                      onClick={() => setPayoutSchedule(o.v)}
                      style={{
                        padding: 14,
                        border: "1px solid " + (payoutSchedule === o.v ? "var(--ink)" : "var(--line)"),
                        borderRadius: 10,
                        background: payoutSchedule === o.v ? "var(--bg-2)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: 14 }}>
                        <T fr={o.labelFr} en={o.labelEn} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                        {o.sub ? o.sub : <T fr={o.subFr || ""} en={o.subEn || ""} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security tab */}
          {tab === "security" && (
            <div className="card">
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, margin: "0 0 24px" }}>
                <T fr="S\u00e9curit\u00e9" en="Security" />
              </h3>
              {[
                { t: <T fr="Authentification \u00e0 deux facteurs (TOTP)" en="Two-factor auth (TOTP)" />, d: <T fr="Application authenticator requise \u00e0 la connexion" en="Authenticator app required to sign in" />, on: twoFA, toggle: setTwoFA },
                { t: <T fr="Restriction IP sur l'API" en="API IP whitelist" />, d: IP_WHITELIST.join(", "), on: ipWhitelist, toggle: setIpWhitelist },
                { t: <T fr="Notifications SMS pour grosses transactions" en="SMS alerts for large transactions" />, d: <T fr="Pour les transactions > 1 000 000 F" en="For transactions > 1,000,000 F" />, on: smsAlerts, toggle: setSmsAlerts },
                { t: <T fr="Confirmation par email pour retraits" en="Email confirmation for withdrawals" />, d: <T fr="Active une \u00e9tape de validation par email" en="Adds an email validation step" />, on: emailConfirm, toggle: setEmailConfirm },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < 3 ? "1px solid var(--line)" : "none" }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{s.t}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.d}</div>
                  </div>
                  <Toggle on={s.on} onChange={s.toggle} />
                </div>
              ))}
            </div>
          )}

          {/* Branding tab */}
          {tab === "branding" && (
            <div className="card">
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, margin: "0 0 4px" }}>
                <T fr="Branding du checkout" en="Checkout branding" />
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 24px" }}>
                <T fr="Personnalisez la page de paiement vue par vos clients." en="Customize the payment page your customers see." />
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Left: controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Logo upload */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}><T fr="Logo" en="Logo" /></div>
                    <div style={{
                      height: 80,
                      background: "var(--bg-2)",
                      border: "2px dashed var(--line-2)",
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      color: "var(--muted)",
                    }}>
                      upload PNG/SVG \u00b7 200\u00d7200
                    </div>
                  </div>

                  {/* Color swatches */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}><T fr="Couleur primaire" en="Primary color" /></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {BRAND_COLORS.map(c => (
                        <div
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: c,
                            cursor: "pointer",
                            border: c === selectedColor ? "2px solid var(--ink)" : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Subdomain */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}><T fr="Sous-domaine" en="Subdomain" /></div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                      <T fr="Votre URL checkout personnalis\u00e9e" en="Your custom checkout URL" />
                    </div>
                    <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: 8 }}>
                      <input
                        className="input"
                        style={{ borderRadius: "8px 0 0 8px", border: 0, padding: "9px 12px", fontSize: 13, flex: 1 }}
                        defaultValue="mamishop"
                      />
                      <span style={{ padding: "9px 12px", color: "var(--muted)", fontSize: 13, background: "var(--bg-2)", borderRadius: "0 8px 8px 0" }}>
                        .checkout.nkap.pay
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: preview */}
                <div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    <T fr="Aper\u00e7u" en="Preview" />
                  </div>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: 20, fontSize: 12 }}>
                    <div style={{ height: 24, background: "var(--bg-2)", borderRadius: 4, marginBottom: 16 }} />
                    <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 32, letterSpacing: "-0.025em" }}>75 000 F</div>
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>Boutique Mami \u00b7 Commande #3041</div>
                    <button
                      className="btn"
                      style={{
                        width: "100%",
                        marginTop: 16,
                        justifyContent: "center",
                        background: selectedColor,
                        color: "white",
                        border: "none",
                        padding: "10px 16px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <T fr="Payer" en="Pay" /> 75 000 F
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Danger zone tab */}
          {tab === "danger" && (
            <div className="card" style={{ borderColor: "oklch(0.7 0.15 30)" }}>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, margin: "0 0 4px", color: "oklch(0.55 0.2 25)" }}>
                <T fr="Zone rouge" en="Danger zone" />
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 24px" }}>
                <T fr="Actions destructives. Sauvegardez vos donn\u00e9es avant." en="Destructive actions. Back up your data first." />
              </p>
              {[
                {
                  t: <T fr="D\u00e9sactiver le mode production" en="Disable live mode" />,
                  d: <T fr="Repasse le compte en sandbox. Les paiements en cours sont annul\u00e9s." en="Reverts the account to sandbox. In-flight payments are cancelled." />,
                  btn: <T fr="D\u00e9sactiver" en="Disable" />,
                  danger: false,
                },
                {
                  t: <T fr="Supprimer le compte" en="Delete account" />,
                  d: <T fr="Supprime d\u00e9finitivement votre compte et toutes vos donn\u00e9es. Irr\u00e9versible." en="Permanently deletes your account and all data. Irreversible." />,
                  btn: <T fr="Supprimer" en="Delete" />,
                  danger: true,
                },
              ].map((d, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: i > 0 ? "1px solid oklch(0.7 0.15 30)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{d.t}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{d.d}</div>
                  </div>
                  <button
                    className={"btn " + (d.danger ? "btn-danger" : "btn-ghost")}
                    style={d.danger ? {} : { borderColor: "oklch(0.7 0.15 30)", color: "oklch(0.55 0.2 25)" }}
                  >
                    {d.btn}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
