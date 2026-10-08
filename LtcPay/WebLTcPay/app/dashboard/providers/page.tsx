"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import {
  providersService,
  type Provider,
  type MerchantProviderPrefs,
  type SebPaySyncResult,
} from "@/services/providers.service";
import { countriesService, type Country } from "@/services/countries.service";
import { merchantsService } from "@/services/merchants.service";

const GROUP_LABEL: Record<string, { fr: string; en: string }> = {
  MOBILE: { fr: "Mobile Money", en: "Mobile Money" },
  CARD: { fr: "Carte bancaire", en: "Bank card" },
};

// The rail a provider is routed on is not always what it accepts. E-nkap is
// routed as CARD, but its hosted page also collects Mobile Money across the
// 10 countries it covers — the customer picks the country and the method
// there, we never send either. Showing only "Carte bancaire" understates it.
const ACCEPTS_LABEL: Record<string, { fr: string; en: string }> = {
  ENKAP: { fr: "Carte bancaire + Mobile Money", en: "Bank card + Mobile Money" },
};

function methodsLabel(p: Provider): { fr: string; en: string } {
  return (
    ACCEPTS_LABEL[p.code] ??
    GROUP_LABEL[p.provider_group] ?? { fr: p.provider_group, en: p.provider_group }
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // SebPay credentials + operator sync
  const [sebPublicKey, setSebPublicKey] = useState("");
  const [sebSecretKey, setSebSecretKey] = useState("");
  const [sebSync, setSebSync] = useState<SebPaySyncResult | null>(null);

  // Merchant prefs editor state
  const [merchants, setMerchants] = useState<{ id: string; name: string }[]>([]);
  const [selMerchant, setSelMerchant] = useState("");
  const [prefsText, setPrefsText] = useState("");
  const [prefsMsg, setPrefsMsg] = useState("");

  async function reload() {
    try {
      const [provs, ctys] = await Promise.all([
        providersService.list(),
        countriesService.list(),
      ]);
      setProviders(provs);
      setCountries(ctys);
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    merchantsService
      .list(1, 100)
      .then((r: any) =>
        setMerchants(
          (r.merchants || r.items || []).map((m: any) => ({ id: m.id, name: m.name })),
        ),
      )
      .catch(() => {});
  }, []);

  const byCountry = useMemo(() => {
    const map: Record<string, { MOBILE: Provider[]; CARD: Provider[] }> = {};
    for (const c of countries) map[c.code] = { MOBILE: [], CARD: [] };
    for (const p of providers) {
      for (const link of p.countries) {
        if (!map[link.country_code]) map[link.country_code] = { MOBILE: [], CARD: [] };
        map[link.country_code][p.provider_group].push(p);
      }
    }
    for (const cc of Object.keys(map)) {
      for (const g of ["MOBILE", "CARD"] as const) {
        map[cc][g].sort((a, b) => {
          const pa = a.countries.find((l) => l.country_code === cc)?.priority ?? 99;
          const pb = b.countries.find((l) => l.country_code === cc)?.priority ?? 99;
          return pa - pb;
        });
      }
    }
    return map;
  }, [providers, countries]);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setBusy(null);
    }
  }

  function linkOf(p: Provider, cc: string) {
    return p.countries.find((l) => l.country_code === cc);
  }

  async function setDefault(cc: string, group: "MOBILE" | "CARD", code: string) {
    await run(`def-${cc}-${code}`, async () => {
      const siblings = byCountry[cc]?.[group] ?? [];
      await providersService.setCountryLink(code, cc, 1, true);
      let prio = 2;
      for (const p of siblings) {
        if (p.code === code) continue;
        const link = linkOf(p, cc);
        await providersService.setCountryLink(p.code, cc, prio++, link?.is_active ?? true);
      }
    });
  }

  async function toggleCountry(cc: string, p: Provider) {
    const link = linkOf(p, cc);
    if (!link) return;
    await run(`tog-${cc}-${p.code}`, () =>
      providersService.setCountryLink(p.code, cc, link.priority, !link.is_active),
    );
  }

  async function addToCountry(cc: string, group: "MOBILE" | "CARD", code: string) {
    if (!code) return;
    const count = (byCountry[cc]?.[group] ?? []).length;
    await run(`add-${cc}-${code}`, () =>
      providersService.setCountryLink(code, cc, count + 1, true),
    );
  }

  async function saveSebPayKeys() {
    const config: Record<string, string> = {};
    if (sebPublicKey.trim()) config.public_key = sebPublicKey.trim();
    if (sebSecretKey.trim()) config.secret_key = sebSecretKey.trim();
    if (!Object.keys(config).length) return;
    await run("seb-keys", async () => {
      await providersService.update("SEBPAY", { config });
      setSebPublicKey("");
      setSebSecretKey("");
    });
  }

  async function syncSebPay() {
    setSebSync(null);
    await run("seb-sync", async () => setSebSync(await providersService.syncSebPayOperators()));
  }

  async function loadPrefs(id: string) {
    setSelMerchant(id);
    setPrefsMsg("");
    if (!id) return setPrefsText("");
    try {
      const prefs = await providersService.getMerchantPrefs(id);
      setPrefsText(JSON.stringify(prefs, null, 2));
    } catch (e: any) {
      setPrefsMsg(e?.response?.data?.detail || "Erreur de chargement");
    }
  }

  async function savePrefs() {
    setPrefsMsg("");
    let parsed: MerchantProviderPrefs | null = null;
    const raw = prefsText.trim();
    if (raw && raw !== "{}") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return setPrefsMsg("JSON invalide");
      }
    }
    try {
      await providersService.setMerchantPrefs(selMerchant, parsed);
      setPrefsMsg("Enregistré ✓");
    } catch (e: any) {
      setPrefsMsg(e?.response?.data?.detail || "Erreur d'enregistrement");
    }
  }

  const cellStyle: React.CSSProperties = {
    padding: "10px 12px",
    verticalAlign: "top",
    borderBottom: "1px solid var(--line)",
  };

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Fournisseurs" en="Providers" />]}
      title={<T fr="Fournisseurs de paiement" en="Payment providers" />}
      sub={
        <T
          fr="Activez les fournisseurs et choisissez, pays par pays, le défaut et le secours. Deux canaux : le Mobile Money en push (on envoie la demande sur le téléphone) et la page hébergée (le client est redirigé et choisit lui-même carte ou Mobile Money)."
          en="Toggle providers and pick, per country, the default and fallback. Two channels: push Mobile Money (we send the prompt to the phone) and the hosted page (the customer is redirected and picks card or Mobile Money themselves)."
        />
      }
    >
      {error && (
        <div style={{ background: "var(--rose-bg, #fee)", color: "var(--rose)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Provider registry ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 28 }}>
        {providers.map((p) => (
          <div key={p.code} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 14 }}>{p.name}</strong>
              <Pill tone={p.is_active ? "success" : "neutral"}>
                {p.is_active ? "Actif" : "Désactivé"}
              </Pill>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 12px" }}>
              <T fr={methodsLabel(p).fr} en={methodsLabel(p).en} />
              {" · "}
              {p.countries.length} <T fr="pays" en="countries" />
              {" · "}
              {p.config_keys.length > 0 ? (
                <T fr="configuré" en="configured" />
              ) : (
                <T fr="sans config" en="no config" />
              )}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              disabled={busy === `glob-${p.code}`}
              onClick={() =>
                run(`glob-${p.code}`, () =>
                  providersService.update(p.code, { is_active: !p.is_active }),
                )
              }
            >
              {p.is_active ? (
                <T fr="Désactiver partout" en="Disable everywhere" />
              ) : (
                <T fr="Activer" en="Enable" />
              )}
            </button>
            {p.code === "SEBPAY" && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  className="input"
                  placeholder={p.config_keys.includes("public_key") ? "pk_… (enregistrée)" : "pk_live_…"}
                  value={sebPublicKey}
                  onChange={(e) => setSebPublicKey(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <input
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder={p.config_keys.includes("secret_key") ? "sk_… (enregistrée)" : "sk_live_…"}
                  value={sebSecretKey}
                  onChange={(e) => setSebSecretKey(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={busy !== null || (!sebPublicKey.trim() && !sebSecretKey.trim())}
                    onClick={saveSebPayKeys}
                  >
                    <T fr="Enregistrer les clés" en="Save keys" />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={busy !== null || !p.config_keys.includes("secret_key")}
                    onClick={syncSebPay}
                  >
                    <T fr="Synchroniser les opérateurs" en="Sync operators" />
                  </button>
                </div>
                {sebSync && (
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                    <T fr="Créés" en="Created" /> : {sebSync.created.length} ·{" "}
                    <T fr="mis à jour" en="updated" /> : {sebSync.updated.length}
                    {sebSync.otp_operators.length > 0 && (
                      <div>
                        <T fr="Avec code OTP payeur" en="With payer OTP" /> :{" "}
                        {sebSync.otp_operators.join(", ")}
                      </div>
                    )}
                    {sebSync.countries_not_configured.length > 0 && (
                      <div>
                        <T fr="Pays SebPay absents de LtcPay" en="SebPay countries missing in LtcPay" /> :{" "}
                        {sebSync.countries_not_configured.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Per-country routing ── */}
      <h2 style={{ fontSize: 16, margin: "8px 0 12px" }}>
        <T fr="Routage par pays" en="Per-country routing" />
      </h2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>
              <th style={cellStyle}><T fr="Pays" en="Country" /></th>
              <th style={cellStyle}><T fr="Mobile Money (push)" en="Mobile Money (push)" /></th>
              <th style={cellStyle}><T fr="Page hébergée" en="Hosted page" /></th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.code}>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  <span style={{ marginRight: 6 }}>{c.flag_emoji}</span>
                  <strong>{c.code}</strong>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.name}</div>
                  {!c.is_active && <Pill tone="neutral"><T fr="pays inactif" en="inactive" /></Pill>}
                </td>
                {(["MOBILE", "CARD"] as const).map((group) => {
                  const list = byCountry[c.code]?.[group] ?? [];
                  const candidates = providers.filter(
                    (p) => p.provider_group === group && !list.some((x) => x.code === p.code),
                  );
                  return (
                    <td key={group} style={cellStyle}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {list.length === 0 && (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>
                            {group === "CARD" ? (
                              <T fr="— (Stripe global par défaut)" en="— (global Stripe fallback)" />
                            ) : (
                              "—"
                            )}
                          </span>
                        )}
                        {list.map((p, i) => {
                          const link = linkOf(p, c.code)!;
                          return (
                            <div key={p.code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Pill tone={!p.is_active || !link.is_active ? "neutral" : i === 0 ? "success" : "info"}>
                                {p.code}
                                {i === 0 ? " · défaut" : ` · secours ${i}`}
                              </Pill>
                              {i !== 0 && link.is_active && p.is_active && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 11 }}
                                  disabled={busy !== null}
                                  onClick={() => setDefault(c.code, group, p.code)}
                                >
                                  <T fr="Définir par défaut" en="Set default" />
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: 11, color: link.is_active ? "var(--rose)" : "var(--green, green)" }}
                                disabled={busy !== null}
                                onClick={() => toggleCountry(c.code, p)}
                              >
                                {link.is_active ? (
                                  <T fr="Désactiver ici" en="Disable here" />
                                ) : (
                                  <T fr="Réactiver" en="Enable" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                        {candidates.length > 0 && (
                          <select
                            defaultValue=""
                            disabled={busy !== null}
                            style={{ fontSize: 12, padding: "4px 6px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", maxWidth: 200 }}
                            onChange={(e) => {
                              addToCountry(c.code, group, e.target.value);
                              e.target.value = "";
                            }}
                          >
                            <option value="" disabled>
                              + Ajouter un fournisseur…
                            </option>
                            {candidates.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Merchant preferences ── */}
      <h2 style={{ fontSize: 16, margin: "28px 0 6px" }}>
        <T fr="Préférences par marchand" en="Per-merchant preferences" />
      </h2>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        <T
          fr='Ordre de préférence propre à un marchand, par groupe et par pays. Ex.: {"MOBILE": {"CM": ["ACCOUNTPE", "TOUCHPAY"]}, "CARD": {"CM": ["STRIPE"]}}. Les fournisseurs listés passent en premier ; un fournisseur désactivé reste désactivé. Vider pour revenir au routage par pays.'
          en='Merchant-specific ordering per group and country. Listed providers go first; disabled providers stay disabled. Clear to fall back to country routing.'
        />
      </p>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, maxWidth: 640 }}>
        <select
          value={selMerchant}
          onChange={(e) => loadPrefs(e.target.value)}
          style={{ fontSize: 13, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", width: "100%", marginBottom: 10 }}
        >
          <option value="">
            — Choisir un marchand —
          </option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {selMerchant && (
          <>
            <textarea
              value={prefsText}
              onChange={(e) => setPrefsText(e.target.value)}
              rows={7}
              spellCheck={false}
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "transparent" }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={savePrefs}>
                <T fr="Enregistrer" en="Save" />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setPrefsText("{}"); }}
              >
                <T fr="Vider" en="Clear" />
              </button>
              <span style={{ fontSize: 12, color: prefsMsg.includes("✓") ? "var(--green, green)" : "var(--rose)" }}>{prefsMsg}</span>
            </div>
          </>
        )}
      </div>

      {loading && (
        <div style={{ marginTop: 16, color: "var(--muted)", fontSize: 13 }}>
          <T fr="Chargement…" en="Loading…" />
        </div>
      )}
    </PageWrapper>
  );
}
