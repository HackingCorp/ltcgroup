"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { Input } from "@/components/ui";
import { fmt } from "@/lib/format";
import {
  countriesService,
  type Country,
  type CountryOperator,
  type CreateCountryData,
  type UpdateCountryData,
  type CreateOperatorData,
  type UpdateOperatorData,
} from "@/services/countries.service";

/* ── Helper: backend static URL ──────────────────────────── */

function backendUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.protocol}//pay.ltcgroup.site${path}`;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}${path}`;
}

/* ── Country presets (auto-fill metadata) ──────────────────── */

interface OperatorPreset {
  operator_code: string;
  operator_name: string;
  service_code: string;
  color: string;
  min_amount: number;
  max_amount: number;
  ussd_code: string;
}

interface CountryPreset {
  code: string;
  name: string;
  currency: string;
  phone_prefix: string;
  phone_digits: number;
  phone_pattern: string;
  flag_emoji: string;
  default_city: string;
  min_amount: number;
  max_amount: number;
  operators: OperatorPreset[];
}

const COUNTRY_PRESETS: CountryPreset[] = [
  { code: "CM", name: "Cameroun", currency: "XAF", phone_prefix: "237", phone_digits: 9, phone_pattern: "6XX XX XX XX", flag_emoji: "\u{1F1E8}\u{1F1F2}", default_city: "Douala", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "MTN", operator_name: "MTN MoMo", service_code: "PAIEMENTMARCHAND_MTN_CM", color: "#FFCC00", min_amount: 100, max_amount: 500000, ussd_code: "*126#" },
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "CM_PAIEMENTMARCHAND_OM_TP", color: "#FF6B00", min_amount: 100, max_amount: 500000, ussd_code: "#150*4#" },
  ]},
  { code: "CI", name: "C\u00f4te d'Ivoire", currency: "XOF", phone_prefix: "225", phone_digits: 10, phone_pattern: "0X XX XX XX XX", flag_emoji: "\u{1F1E8}\u{1F1EE}", default_city: "Abidjan", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "PAIEMENTMARCHANDOMPAYCIDIRECT", color: "#FF6B00", min_amount: 100, max_amount: 500000, ussd_code: "#144*82#" },
    { operator_code: "MTN", operator_name: "MTN Money", service_code: "PAIEMENTMARCHAND_MTN_CI", color: "#FFCC00", min_amount: 100, max_amount: 500000, ussd_code: "*133#" },
    { operator_code: "WAVE", operator_name: "Wave", service_code: "PAIEMENTMARCHAND_WAVE_CI", color: "#1DC3E2", min_amount: 100, max_amount: 1000000, ussd_code: "" },
  ]},
  { code: "SN", name: "S\u00e9n\u00e9gal", currency: "XOF", phone_prefix: "221", phone_digits: 9, phone_pattern: "7X XXX XX XX", flag_emoji: "\u{1F1F8}\u{1F1F3}", default_city: "Dakar", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "PAIEMENTMARCHAND_OM_SN", color: "#FF6B00", min_amount: 100, max_amount: 500000, ussd_code: "#144*82#" },
    { operator_code: "WAVE", operator_name: "Wave", service_code: "PAIEMENTMARCHAND_WAVE_SN", color: "#1DC3E2", min_amount: 100, max_amount: 1000000, ussd_code: "" },
    { operator_code: "FREE", operator_name: "Free Money", service_code: "PAIEMENTMARCHAND_FREE_SN", color: "#CD1E25", min_amount: 100, max_amount: 500000, ussd_code: "#555#" },
  ]},
  { code: "GA", name: "Gabon", currency: "XAF", phone_prefix: "241", phone_digits: 8, phone_pattern: "XX XX XX XX", flag_emoji: "\u{1F1EC}\u{1F1E6}", default_city: "Libreville", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "AIRTEL", operator_name: "Airtel Money", service_code: "PAIEMENTMARCHAND_AIRTEL_GA", color: "#ED1C24", min_amount: 100, max_amount: 500000, ussd_code: "*444#" },
    { operator_code: "MOOV", operator_name: "Moov Money", service_code: "PAIEMENTMARCHAND_MOOV_GA", color: "#0066B3", min_amount: 100, max_amount: 500000, ussd_code: "" },
  ]},
  { code: "CG", name: "Congo", currency: "XAF", phone_prefix: "242", phone_digits: 9, phone_pattern: "0X XXX XXXX", flag_emoji: "\u{1F1E8}\u{1F1EC}", default_city: "Brazzaville", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "AIRTEL", operator_name: "Airtel Money", service_code: "PAIEMENTMARCHAND_AIRTEL_CG", color: "#ED1C24", min_amount: 100, max_amount: 500000, ussd_code: "*444#" },
    { operator_code: "MTN", operator_name: "MTN Money", service_code: "PAIEMENTMARCHAND_MTN_CG", color: "#FFCC00", min_amount: 100, max_amount: 500000, ussd_code: "*150#" },
  ]},
  { code: "CD", name: "RDC", currency: "CDF", phone_prefix: "243", phone_digits: 9, phone_pattern: "9X XXX XXXX", flag_emoji: "\u{1F1E8}\u{1F1E9}", default_city: "Kinshasa", min_amount: 500, max_amount: 5000000, operators: [
    { operator_code: "AIRTEL", operator_name: "Airtel Money", service_code: "PAIEMENTMARCHAND_AIRTEL_CD", color: "#ED1C24", min_amount: 500, max_amount: 5000000, ussd_code: "*444#" },
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "PAIEMENTMARCHAND_OM_CD", color: "#FF6B00", min_amount: 500, max_amount: 5000000, ussd_code: "#144#" },
    { operator_code: "MPESA", operator_name: "M-Pesa", service_code: "PAIEMENTMARCHAND_MPESA_CD", color: "#4CB050", min_amount: 500, max_amount: 5000000, ussd_code: "*151#" },
    { operator_code: "AFRIMONEY", operator_name: "Afrimoney", service_code: "PAIEMENTMARCHAND_AFRIMONEY_CD", color: "#003399", min_amount: 500, max_amount: 5000000, ussd_code: "" },
  ]},
  { code: "TD", name: "Tchad", currency: "XAF", phone_prefix: "235", phone_digits: 8, phone_pattern: "XX XX XX XX", flag_emoji: "\u{1F1F9}\u{1F1E9}", default_city: "N'Djamena", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "MOOV", operator_name: "Moov Money", service_code: "PAIEMENTMARCHAND_MOOV_TD", color: "#0066B3", min_amount: 100, max_amount: 500000, ussd_code: "" },
    { operator_code: "AIRTEL", operator_name: "Airtel Money", service_code: "PAIEMENTMARCHAND_AIRTEL_TD", color: "#ED1C24", min_amount: 100, max_amount: 500000, ussd_code: "*444#" },
  ]},
  { code: "CF", name: "R\u00e9publique Centrafricaine", currency: "XAF", phone_prefix: "236", phone_digits: 8, phone_pattern: "XX XX XX XX", flag_emoji: "\u{1F1E8}\u{1F1EB}", default_city: "Bangui", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "PAIEMENTMARCHAND_OM_CF", color: "#FF6B00", min_amount: 100, max_amount: 500000, ussd_code: "#144#" },
  ]},
  { code: "BJ", name: "B\u00e9nin", currency: "XOF", phone_prefix: "229", phone_digits: 10, phone_pattern: "XX XX XX XX XX", flag_emoji: "\u{1F1E7}\u{1F1EF}", default_city: "Cotonou", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "MTN", operator_name: "MTN Money", service_code: "PAIEMENTMARCHAND_MTN_BJ", color: "#FFCC00", min_amount: 100, max_amount: 500000, ussd_code: "*880#" },
    { operator_code: "MOOV", operator_name: "Moov Money", service_code: "PAIEMENTMARCHAND_MOOV_BJ", color: "#0066B3", min_amount: 100, max_amount: 500000, ussd_code: "" },
  ]},
  { code: "TG", name: "Togo", currency: "XOF", phone_prefix: "228", phone_digits: 8, phone_pattern: "XX XX XX XX", flag_emoji: "\u{1F1F9}\u{1F1EC}", default_city: "Lom\u00e9", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "TMONEY", operator_name: "T-Money", service_code: "PAIEMENTMARCHAND_TMONEY_TG", color: "#00A651", min_amount: 100, max_amount: 500000, ussd_code: "*145#" },
    { operator_code: "MOOV", operator_name: "Moov Money", service_code: "PAIEMENTMARCHAND_MOOV_TG", color: "#0066B3", min_amount: 100, max_amount: 500000, ussd_code: "" },
  ]},
  { code: "BF", name: "Burkina Faso", currency: "XOF", phone_prefix: "226", phone_digits: 8, phone_pattern: "XX XX XX XX", flag_emoji: "\u{1F1E7}\u{1F1EB}", default_city: "Ouagadougou", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "MOOV", operator_name: "Moov Money", service_code: "PAIEMENTMARCHAND_MOOV_BF", color: "#0066B3", min_amount: 100, max_amount: 500000, ussd_code: "" },
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "PAIEMENTMARCHAND_OM_BF", color: "#FF6B00", min_amount: 100, max_amount: 500000, ussd_code: "#144#" },
  ]},
  { code: "ML", name: "Mali", currency: "XOF", phone_prefix: "223", phone_digits: 8, phone_pattern: "XX XX XX XX", flag_emoji: "\u{1F1F2}\u{1F1F1}", default_city: "Bamako", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "PAIEMENTMARCHAND_OM_ML", color: "#FF6B00", min_amount: 100, max_amount: 500000, ussd_code: "#144#" },
    { operator_code: "MOOV", operator_name: "Moov Money", service_code: "PAIEMENTMARCHAND_MOOV_ML", color: "#0066B3", min_amount: 100, max_amount: 500000, ussd_code: "" },
    { operator_code: "WAVE", operator_name: "Wave", service_code: "PAIEMENTMARCHAND_WAVE_ML", color: "#1DC3E2", min_amount: 100, max_amount: 1000000, ussd_code: "" },
  ]},
  { code: "NE", name: "Niger", currency: "XOF", phone_prefix: "227", phone_digits: 8, phone_pattern: "XX XX XX XX", flag_emoji: "\u{1F1F3}\u{1F1EA}", default_city: "Niamey", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "AIRTEL", operator_name: "Airtel Money", service_code: "PAIEMENTMARCHAND_AIRTEL_NE", color: "#ED1C24", min_amount: 100, max_amount: 500000, ussd_code: "*444#" },
  ]},
  { code: "GN", name: "Guin\u00e9e", currency: "GNF", phone_prefix: "224", phone_digits: 9, phone_pattern: "6XX XX XX XX", flag_emoji: "\u{1F1EC}\u{1F1F3}", default_city: "Conakry", min_amount: 1000, max_amount: 5000000, operators: [
    { operator_code: "MTN", operator_name: "MTN Money", service_code: "PAIEMENTMARCHAND_MTN_GN", color: "#FFCC00", min_amount: 1000, max_amount: 5000000, ussd_code: "*150#" },
    { operator_code: "ORANGE", operator_name: "Orange Money", service_code: "PAIEMENTMARCHAND_OM_GN", color: "#FF6B00", min_amount: 1000, max_amount: 5000000, ussd_code: "#144#" },
  ]},
  { code: "GQ", name: "Guin\u00e9e \u00c9quatoriale", currency: "XAF", phone_prefix: "240", phone_digits: 9, phone_pattern: "XXX XXX XXX", flag_emoji: "\u{1F1EC}\u{1F1F6}", default_city: "Malabo", min_amount: 100, max_amount: 500000, operators: [
    { operator_code: "MUNI", operator_name: "Muni", service_code: "PAIEMENTMARCHAND_MUNI_GQ", color: "#009639", min_amount: 100, max_amount: 500000, ussd_code: "" },
  ]},
  { code: "KE", name: "Kenya", currency: "KES", phone_prefix: "254", phone_digits: 9, phone_pattern: "7XX XXX XXX", flag_emoji: "\u{1F1F0}\u{1F1EA}", default_city: "Nairobi", min_amount: 10, max_amount: 150000, operators: [
    { operator_code: "MPESA", operator_name: "M-Pesa", service_code: "PAIEMENTMARCHAND_MPESA_KE", color: "#4CB050", min_amount: 10, max_amount: 150000, ussd_code: "*334#" },
    { operator_code: "AIRTEL", operator_name: "Airtel Money", service_code: "PAIEMENTMARCHAND_AIRTEL_KE", color: "#ED1C24", min_amount: 10, max_amount: 150000, ussd_code: "*444#" },
  ]},
  { code: "UG", name: "Uganda", currency: "UGX", phone_prefix: "256", phone_digits: 9, phone_pattern: "7XX XXX XXX", flag_emoji: "\u{1F1FA}\u{1F1EC}", default_city: "Kampala", min_amount: 500, max_amount: 5000000, operators: [
    { operator_code: "MTN", operator_name: "MTN", service_code: "PAIEMENTMARCHAND_MTN_UG", color: "#FFCC00", min_amount: 500, max_amount: 5000000, ussd_code: "*165#" },
    { operator_code: "AIRTEL", operator_name: "Airtel", service_code: "PAIEMENTMARCHAND_AIRTEL_UG", color: "#ED1C24", min_amount: 500, max_amount: 5000000, ussd_code: "*185#" },
  ]},
  { code: "NG", name: "Nigeria", currency: "NGN", phone_prefix: "234", phone_digits: 10, phone_pattern: "8XX XXX XXXX", flag_emoji: "\u{1F1F3}\u{1F1EC}", default_city: "Lagos", min_amount: 100, max_amount: 10000000, operators: [] },
];

/* ── page ──────────────────────────────────────────────────── */

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [operators, setOperators] = useState<Record<string, CountryOperator[]>>({});
  const [addOpFor, setAddOpFor] = useState<string | null>(null);
  const [editingOp, setEditingOp] = useState<{ countryCode: string; op: CountryOperator } | null>(null);

  const load = () => {
    setIsLoading(true);
    countriesService
      .list()
      .then(setCountries)
      .catch(() => setError("Failed to load countries"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (code: string) => {
    if (expandedCode === code) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(code);
    if (!operators[code]) {
      countriesService.listOperators(code).then((ops) =>
        setOperators((prev) => ({ ...prev, [code]: ops }))
      );
    }
  };

  const handleToggleActive = async (c: Country) => {
    try {
      await countriesService.update(c.code, { is_active: !c.is_active });
      load();
    } catch {
      setError("Failed to toggle country");
    }
  };

  const handleDeleteCountry = async (code: string) => {
    if (!confirm("Supprimer ce pays ?")) return;
    try {
      await countriesService.remove(code);
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to delete country");
    }
  };

  const handleToggleOp = async (countryCode: string, op: CountryOperator) => {
    try {
      await countriesService.updateOperator(countryCode, op.id, { is_active: !op.is_active });
      const ops = await countriesService.listOperators(countryCode);
      setOperators((prev) => ({ ...prev, [countryCode]: ops }));
    } catch {
      setError("Failed to toggle operator");
    }
  };

  const handleDeleteOp = async (countryCode: string, opId: string) => {
    if (!confirm("Supprimer cet operateur ?")) return;
    try {
      await countriesService.removeOperator(countryCode, opId);
      const ops = await countriesService.listOperators(countryCode);
      setOperators((prev) => ({ ...prev, [countryCode]: ops }));
    } catch {
      setError("Failed to delete operator");
    }
  };

  const activeCount = countries.filter((c) => c.is_active).length;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Pays & Operateurs" en="Countries & Operators" />]}
      title={<T fr="Pays & Operateurs" en="Countries & Operators" />}
      sub={<T fr={`${countries.length} pays configures · ${activeCount} actifs`} en={`${countries.length} countries configured · ${activeCount} active`} />}
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          <Icon name="plus" size={13} color="white" /> <T fr="Ajouter un pays" en="Add Country" />
        </button>
      }
    >
      {error && (
        <div className="nk-card" style={{ padding: 14, background: "var(--rose-soft)", color: "var(--rose)", fontSize: 13, marginBottom: 12 }}>
          {error}
          <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>
            <Icon name="x" size={14} color="var(--rose)" />
          </button>
        </div>
      )}

      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
            <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : countries.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <T fr="Aucun pays configure" en="No countries configured" />
          </div>
        ) : (
          <>
            <div className="tbl">
              <div className="row head" style={{ gridTemplateColumns: "40px 1.2fr 0.5fr 0.6fr 0.8fr 0.7fr 0.5fr 80px" }}>
                <span></span>
                <span><T fr="Pays" en="Country" /></span>
                <span><T fr="Devise" en="Currency" /></span>
                <span><T fr="Prefixe" en="Prefix" /></span>
                <span><T fr="Limites" en="Limits" /></span>
                <span><T fr="Credentials" en="Credentials" /></span>
                <span><T fr="Statut" en="Status" /></span>
                <span><T fr="Actions" en="Actions" /></span>
              </div>

              {countries.map((c) => (
                <div key={c.code}>
                  {/* Country row */}
                  <div
                    className="row clickable"
                    style={{ gridTemplateColumns: "40px 1.2fr 0.5fr 0.6fr 0.8fr 0.7fr 0.5fr 80px", cursor: "pointer" }}
                    onClick={() => toggleExpand(c.code)}
                  >
                    <span style={{ display: "grid", placeItems: "center" }}>
                      <Icon name={expandedCode === c.code ? "chevD" : "chevR"} size={14} color="var(--muted)" />
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{c.flag_emoji || "🏳️"}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{c.code}</div>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 12 }}>{c.currency}</div>
                    <div className="mono" style={{ fontSize: 12 }}>+{c.phone_prefix}</div>
                    <div className="mono" style={{ fontSize: 11 }}>{fmt(c.min_amount)} – {fmt(c.max_amount)}</div>
                    <div>
                      <Pill tone={c.credentials_configured ? "success" : "warn"}>
                        {c.credentials_configured ? <T fr="OK" en="OK" /> : <T fr="Manquant" en="Missing" />}
                      </Pill>
                    </div>
                    <div>
                      <Pill tone={c.is_active ? "success" : "fail"}>
                        {c.is_active ? <T fr="Actif" en="Active" /> : <T fr="Inactif" en="Inactive" />}
                      </Pill>
                    </div>
                    <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleActive(c)}
                        className="btn btn-ghost btn-sm"
                        title={c.is_active ? "Desactiver" : "Activer"}
                        style={{ padding: "4px 6px" }}
                      >
                        <Icon name={c.is_active ? "pause" : "play"} size={13} />
                      </button>
                      <button
                        onClick={() => setEditingCountry(c)}
                        className="btn btn-ghost btn-sm"
                        title="Modifier"
                        style={{ padding: "4px 6px" }}
                      >
                        <Icon name="settings" size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCountry(c.code)}
                        className="btn btn-ghost btn-sm"
                        title="Supprimer"
                        style={{ padding: "4px 6px", color: "var(--rose)" }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Operators sub-table */}
                  {expandedCode === c.code && (
                    <div style={{ background: "var(--bg-2)", padding: "12px 16px 12px 52px", borderBottom: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
                          <T fr="Operateurs" en="Operators" /> ({(operators[c.code] || []).length})
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAddOpFor(c.code)} style={{ fontSize: 11 }}>
                          <Icon name="plus" size={12} /> <T fr="Ajouter" en="Add" />
                        </button>
                      </div>

                      {(operators[c.code] || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>
                          <T fr="Aucun operateur" en="No operators" />
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {(operators[c.code] || []).map((op) => (
                            <div
                              key={op.id}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                background: "var(--surface)", borderRadius: 8, fontSize: 13,
                              }}
                            >
                              {op.logo_url ? (
                                <img src={backendUrl(op.logo_url)} alt={op.operator_name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "contain", flexShrink: 0 }} />
                              ) : (
                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: op.color, flexShrink: 0 }} />
                              )}
                              <span style={{ fontWeight: 500, minWidth: 100 }}>{op.operator_name}</span>
                              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", flex: 1 }}>{op.service_code}</span>
                              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{fmt(op.min_amount)} – {fmt(op.max_amount)}</span>
                              <Pill tone={op.is_active ? "success" : "fail"}>
                                {op.is_active ? "ON" : "OFF"}
                              </Pill>
                              <div style={{ display: "flex", gap: 2 }}>
                                <button
                                  onClick={() => handleToggleOp(c.code, op)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: "2px 4px" }}
                                  title={op.is_active ? "Desactiver" : "Activer"}
                                >
                                  <Icon name={op.is_active ? "pause" : "play"} size={12} />
                                </button>
                                <button
                                  onClick={() => setEditingOp({ countryCode: c.code, op })}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: "2px 4px" }}
                                  title="Modifier"
                                >
                                  <Icon name="settings" size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteOp(c.code, op.id)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: "2px 4px", color: "var(--rose)" }}
                                  title="Supprimer"
                                >
                                  <Icon name="trash" size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)" }}>
              <span><T fr={`${countries.length} pays configures`} en={`${countries.length} countries configured`} /></span>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CountryModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); load(); }}
        />
      )}

      {editingCountry && (
        <CountryModal
          country={editingCountry}
          onClose={() => setEditingCountry(null)}
          onSaved={() => { setEditingCountry(null); load(); }}
        />
      )}

      {addOpFor && (
        <OperatorModal
          countryCode={addOpFor}
          onClose={() => setAddOpFor(null)}
          onSaved={() => {
            countriesService.listOperators(addOpFor).then((ops) =>
              setOperators((prev) => ({ ...prev, [addOpFor]: ops }))
            );
            setAddOpFor(null);
          }}
        />
      )}

      {editingOp && (
        <OperatorModal
          countryCode={editingOp.countryCode}
          operator={editingOp.op}
          onClose={() => setEditingOp(null)}
          onSaved={() => {
            const cc = editingOp.countryCode;
            countriesService.listOperators(cc).then((ops) =>
              setOperators((prev) => ({ ...prev, [cc]: ops }))
            );
            setEditingOp(null);
          }}
        />
      )}
    </PageWrapper>
  );
}

/* ── Country create/edit modal ─────────────────────────────── */

function CountryModal({
  country,
  onClose,
  onSaved,
}: {
  country?: Country;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!country;
  const [form, setForm] = useState<CreateCountryData>({
    code: country?.code || "",
    name: country?.name || "",
    currency: country?.currency || "XAF",
    phone_prefix: country?.phone_prefix || "",
    phone_digits: country?.phone_digits ?? 9,
    phone_pattern: country?.phone_pattern || "6XX XX XX XX",
    flag_emoji: country?.flag_emoji || "",
    default_city: country?.default_city || "",
    min_amount: country?.min_amount ?? 100,
    max_amount: country?.max_amount ?? 500000,
    is_active: country?.is_active ?? true,
  });
  const [creds, setCreds] = useState({
    agency_code: "",
    login: "",
    password: "",
    secret: "",
    merchant_id: "",
    secure_code: "",
    merchant_website: "",
    sdk_url: "https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.1.js",
    direct_api_url: "https://apidist.gutouch.net/apidist/sec/touchpayapi",
  });
  const [showCreds, setShowCreds] = useState(!isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));
  const setCred = (field: string, value: string) =>
    setCreds((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...form };
      if (showCreds) {
        const nonEmpty: Record<string, string> = {};
        for (const [k, v] of Object.entries(creds)) {
          if (v) nonEmpty[k] = v;
        }
        if (Object.keys(nonEmpty).length > 0) {
          payload.credentials = nonEmpty as CreateCountryData["credentials"];
        }
      }
      if (isEdit) {
        const { code: _code, ...rest } = payload;
        await countriesService.update(country!.code, rest as UpdateCountryData);
      } else {
        await countriesService.create(payload);
        // Auto-create operators from preset
        const preset = COUNTRY_PRESETS.find((p) => p.code === payload.code);
        if (preset && preset.operators.length > 0) {
          for (const op of preset.operators) {
            try {
              await countriesService.createOperator(payload.code, op);
            } catch { /* operator may already exist, skip */ }
          }
        }
      }
      onSaved();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save country");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", borderRadius: 12, background: "var(--surface)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>
            {isEdit
              ? <T fr={`Modifier ${country!.name}`} en={`Edit ${country!.name}`} />
              : <T fr="Ajouter un pays" en="Add Country" />
            }
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <Icon name="x" size={18} color="var(--muted)" />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, background: "var(--rose-soft)", color: "var(--rose)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          {/* Country preset picker (create mode only) */}
          {!isEdit && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Choisir un pays" en="Select a country" />
              </label>
              <select
                value={form.code}
                onChange={(e) => {
                  const preset = COUNTRY_PRESETS.find((p) => p.code === e.target.value);
                  if (preset) {
                    setForm((prev) => ({ ...prev, ...preset }));
                  } else {
                    set("code", "");
                  }
                }}
                className="nk-input"
                style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg-2)", cursor: "pointer" }}
              >
                <option value="">— <T fr="Selectionner ou saisir manuellement" en="Select or enter manually" /> —</option>
                {COUNTRY_PRESETS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.flag_emoji} {p.name} ({p.code}) — {p.currency} +{p.phone_prefix}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row: code + name */}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Code *" en="Code *" />
              </label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="CM"
                maxLength={2}
                disabled={isEdit}
                required
                style={isEdit ? { opacity: 0.5 } : undefined}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Nom *" en="Name *" />
              </label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Cameroun" required />
            </div>
          </div>

          {/* Row: currency + phone prefix + digits */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Devise *" en="Currency *" />
              </label>
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} placeholder="XAF" maxLength={3} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Prefixe *" en="Prefix *" />
              </label>
              <Input value={form.phone_prefix} onChange={(e) => set("phone_prefix", e.target.value)} placeholder="237" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Chiffres" en="Digits" />
              </label>
              <Input type="number" value={form.phone_digits} onChange={(e) => set("phone_digits", parseInt(e.target.value) || 9)} min={4} max={15} />
            </div>
          </div>

          {/* Row: phone pattern + flag + city */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Format tel" en="Phone pattern" />
              </label>
              <Input value={form.phone_pattern} onChange={(e) => set("phone_pattern", e.target.value)} placeholder="6XX XX XX XX" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Drapeau" en="Flag" />
              </label>
              <Input value={form.flag_emoji} onChange={(e) => set("flag_emoji", e.target.value)} placeholder="🇨🇲" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Ville par defaut" en="Default city" />
              </label>
              <Input value={form.default_city} onChange={(e) => set("default_city", e.target.value)} placeholder="Douala" />
            </div>
          </div>

          {/* Row: min/max */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Montant min" en="Min amount" />
              </label>
              <Input type="number" value={form.min_amount} onChange={(e) => set("min_amount", parseInt(e.target.value) || 100)} min={1} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Montant max" en="Max amount" />
              </label>
              <Input type="number" value={form.max_amount} onChange={(e) => set("max_amount", parseInt(e.target.value) || 500000)} min={1} />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}>
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => set("is_active", e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <div>
              <span style={{ fontSize: 13, fontWeight: 500 }}><T fr="Pays actif" en="Country active" /></span>
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>
                {form.is_active
                  ? <T fr="Les marchands peuvent accepter des paiements dans ce pays" en="Merchants can accept payments in this country" />
                  : <T fr="Paiements desactives pour ce pays" en="Payments disabled for this country" />
                }
              </p>
            </div>
          </div>

          {/* Credentials section */}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <button
              type="button"
              onClick={() => setShowCreds(!showCreds)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-2)", padding: 0 }}
            >
              <Icon name={showCreds ? "chevD" : "chevR"} size={14} />
              <T fr="Credentials TouchPay" en="TouchPay Credentials" />
              {isEdit && country?.credentials_configured && (
                <Pill tone="success"><T fr="Configures" en="Configured" /></Pill>
              )}
            </button>

            {showCreds && (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {isEdit && (
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
                    <T fr="Laissez vide pour conserver les valeurs actuelles." en="Leave empty to keep current values." />
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Agency Code</label>
                    <Input value={creds.agency_code} onChange={(e) => setCred("agency_code", e.target.value)} placeholder="Agency code" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Login</label>
                    <Input value={creds.login} onChange={(e) => setCred("login", e.target.value)} placeholder="Login" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Password</label>
                    <Input type="password" value={creds.password} onChange={(e) => setCred("password", e.target.value)} placeholder="••••••••" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Secret</label>
                    <Input type="password" value={creds.secret} onChange={(e) => setCred("secret", e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Merchant ID</label>
                    <Input value={creds.merchant_id} onChange={(e) => setCred("merchant_id", e.target.value)} placeholder="LTCGR11789" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Secure Code</label>
                    <Input type="password" value={creds.secure_code} onChange={(e) => setCred("secure_code", e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Merchant Website</label>
                  <Input value={creds.merchant_website} onChange={(e) => setCred("merchant_website", e.target.value)} placeholder="ltcgroup.site" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>SDK URL</label>
                  <Input value={creds.sdk_url} onChange={(e) => setCred("sdk_url", e.target.value)} style={{ fontSize: 11 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Direct API URL</label>
                  <Input value={creds.direct_api_url} onChange={(e) => setCred("direct_api_url", e.target.value)} style={{ fontSize: 11 }} />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <T fr="Annuler" en="Cancel" />
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? <T fr="Enregistrement..." en="Saving..." />
                : isEdit
                  ? <T fr="Enregistrer" en="Save Changes" />
                  : <T fr="Creer le pays" en="Create Country" />
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Operator create/edit modal ────────────────────────────── */

function OperatorModal({
  countryCode,
  operator,
  onClose,
  onSaved,
}: {
  countryCode: string;
  operator?: CountryOperator;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!operator;
  const [form, setForm] = useState<CreateOperatorData>({
    operator_code: operator?.operator_code || "",
    operator_name: operator?.operator_name || "",
    service_code: operator?.service_code || "",
    color: operator?.color || "#000000",
    logo_url: operator?.logo_url || "",
    min_amount: operator?.min_amount ?? 100,
    max_amount: operator?.max_amount ?? 500000,
    ussd_code: operator?.ussd_code || "",
    is_active: operator?.is_active ?? true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(operator?.logo_url ? backendUrl(operator.logo_url) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo trop volumineux (max 2 Mo)");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let savedOp;
      if (isEdit) {
        savedOp = await countriesService.updateOperator(countryCode, operator!.id, form as UpdateOperatorData);
      } else {
        savedOp = await countriesService.createOperator(countryCode, form);
      }
      // Upload logo if a file was selected
      if (logoFile && savedOp?.id) {
        await countriesService.uploadOperatorLogo(countryCode, savedOp.id, logoFile);
      }
      onSaved();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save operator");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: "100%", maxWidth: 440, maxHeight: "90vh", overflow: "auto", borderRadius: 12, background: "var(--surface)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>
            {isEdit
              ? <T fr={`Modifier ${operator!.operator_name}`} en={`Edit ${operator!.operator_name}`} />
              : <T fr={`Ajouter un operateur (${countryCode})`} en={`Add Operator (${countryCode})`} />
            }
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <Icon name="x" size={18} color="var(--muted)" />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, background: "var(--rose-soft)", color: "var(--rose)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Code *" en="Code *" />
              </label>
              <Input
                value={form.operator_code}
                onChange={(e) => set("operator_code", e.target.value.toUpperCase())}
                placeholder="MTN"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Nom *" en="Name *" />
              </label>
              <Input value={form.operator_name} onChange={(e) => set("operator_name", e.target.value)} placeholder="MTN MoMo" required />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Code service TouchPay *" en="TouchPay Service Code *" />
            </label>
            <Input value={form.service_code} onChange={(e) => set("service_code", e.target.value)} placeholder="PAIEMENTMARCHAND_MTN_CM" required />
          </div>

          {/* Row: min/max amount */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Montant min" en="Min amount" />
              </label>
              <Input type="number" value={form.min_amount} onChange={(e) => set("min_amount", parseInt(e.target.value) || 100)} min={1} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Montant max" en="Max amount" />
              </label>
              <Input type="number" value={form.max_amount} onChange={(e) => set("max_amount", parseInt(e.target.value) || 500000)} min={1} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Couleur" en="Color" />
              </label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                style={{ width: "100%", height: 36, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", padding: 2 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Code USSD" en="USSD Code" />
              </label>
              <Input value={form.ussd_code} onChange={(e) => set("ussd_code", e.target.value)} placeholder="*126#" />
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Logo operateur" en="Operator Logo" />
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "contain", border: "1px solid var(--line)", background: "#fff" }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, border: "2px dashed var(--line)", display: "grid", placeItems: "center", background: "var(--bg-2)" }}>
                  <Icon name="upload" size={18} color="var(--muted)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  style={{ fontSize: 12, width: "100%" }}
                />
                <p style={{ fontSize: 10, color: "var(--muted)", margin: "4px 0 0" }}>
                  PNG, JPG, WebP, SVG — max 2 Mo
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}>
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => set("is_active", e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13, fontWeight: 500 }}><T fr="Operateur actif" en="Operator active" /></span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <T fr="Annuler" en="Cancel" />
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? <T fr="Enregistrement..." en="Saving..." />
                : isEdit
                  ? <T fr="Enregistrer" en="Save Changes" />
                  : <T fr="Ajouter" en="Add Operator" />
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
