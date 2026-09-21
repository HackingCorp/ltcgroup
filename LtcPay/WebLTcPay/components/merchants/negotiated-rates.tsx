"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { T } from "@/lib/i18n";
import {
  countriesService,
  merchantRatesService,
  type Country,
  type CountryOperator,
  type MerchantRate,
} from "@/services/countries.service";

/**
 * Mobile Money rates agreed with one merchant, per country and operator.
 *
 * A merchant carries a single rate, but an operator does not cost the same
 * everywhere — 1.5% on Cameroon MTN against 4% on Congo Airtel. A row here
 * is billed as entered: it is a negotiated price, so the platform floor
 * does not lift it back up, and a rate under the provider's own cost is
 * flagged rather than silently corrected.
 */
export function NegotiatedRates({ merchantId }: { merchantId: string }) {
  const [rates, setRates] = useState<MerchantRate[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [operators, setOperators] = useState<Record<string, CountryOperator[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [rate, setRate] = useState("");

  const load = async () => {
    try {
      const [rows, list] = await Promise.all([
        merchantRatesService.list(merchantId),
        countriesService.list(),
      ]);
      setRates(rows);
      setCountries(list.filter((c) => c.is_active));
    } catch {
      setError("Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [merchantId]);

  // Operator list for the country being edited, fetched once per country.
  useEffect(() => {
    if (!country || operators[country]) return;
    countriesService
      .listOperators(country)
      .then((ops) => setOperators((prev) => ({ ...prev, [country]: ops })))
      .catch(() => {});
  }, [country, operators]);

  const save = async () => {
    const value = parseFloat(rate);
    if (!country || Number.isNaN(value)) {
      setError("Choisissez un pays et un taux");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await merchantRatesService.upsert(merchantId, {
        country_code: country,
        operator_code: operator || null,
        fee_rate: value,
      });
      setCountry(""); setOperator(""); setRate("");
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await merchantRatesService.remove(merchantId, id);
    await load();
  };

  // Deduplicate: the same operator exists once per provider.
  const operatorCodes = Array.from(
    new Set((operators[country] || []).map((o) => o.operator_code)),
  ).sort();

  return (
    <div className="nk-card" style={{ padding: 20, marginTop: 16 }}>
      <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 15, margin: "0 0 4px" }}>
        <T fr="Taux négociés par pays" en="Negotiated rates by country" />
      </h3>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 14px" }}>
        <T
          fr="Remplace le taux Mobile Money du marchand pour un pays, ou un seul opérateur de ce pays. Sans ligne, le taux du marchand s'applique avec le plancher plateforme."
          en="Replaces the merchant's Mobile Money rate for a country, or one operator within it. With no row, the merchant's rate applies with the platform floor."
        />
      </p>

      {error && (
        <div style={{ marginBottom: 10, padding: 8, borderRadius: 6, background: "var(--rose-soft)", color: "var(--rose)", fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: "var(--muted)" }}>...</p>
      ) : rates.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
          <T fr="Aucun taux négocié." en="No negotiated rate." />
        </p>
      ) : (
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {rates.map((r) => {
            const belowCost =
              r.provider_fee_rate != null && r.fee_rate < r.provider_fee_rate;
            return (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8, fontSize: 13,
                  background: "var(--surface)",
                  border: belowCost ? "1px solid var(--rose)" : "1px solid transparent",
                }}
              >
                <span style={{ fontWeight: 500, minWidth: 34 }}>{r.country_code}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)", flex: 1 }}>
                  {r.operator_code || "tous opérateurs"}
                </span>
                {r.provider_fee_rate != null && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                    coût {r.provider_fee_rate}%
                  </span>
                )}
                <span
                  className="mono"
                  style={{ fontWeight: 600, color: belowCost ? "var(--rose)" : "inherit" }}
                >
                  {r.fee_rate}%
                </span>
                <button
                  onClick={() => remove(r.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "2px 4px" }}
                  title="Supprimer"
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {rates.some((r) => r.provider_fee_rate != null && r.fee_rate < r.provider_fee_rate) && (
        <p style={{ fontSize: 11, color: "var(--rose)", margin: "0 0 12px" }}>
          <T
            fr="⚠ Un taux encadré est sous le coût du fournisseur : ces paiements perdent de l'argent."
            en="⚠ A boxed rate sits below the provider cost: those payments lose money."
          />
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px auto", gap: 8, alignItems: "center" }}>
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); setOperator(""); }}
          className="input"
          style={{ fontSize: 13 }}
        >
          <option value=""><T fr="Pays…" en="Country…" /></option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.flag_emoji} {c.name}</option>
          ))}
        </select>

        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          className="input"
          style={{ fontSize: 13 }}
          disabled={!country}
        >
          <option value=""><T fr="Tous opérateurs" en="All operators" /></option>
          {operatorCodes.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>

        <input
          type="number" step="0.25" min="0" max="100"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="%"
          className="input"
          style={{ fontSize: 13 }}
        />

        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? "..." : <T fr="Ajouter" en="Add" />}
        </button>
      </div>
    </div>
  );
}
