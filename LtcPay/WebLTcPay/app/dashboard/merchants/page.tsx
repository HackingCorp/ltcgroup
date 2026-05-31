"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtCompact } from "@/lib/format";
import { Input } from "@/components/ui";
import { merchantsService } from "@/services/merchants.service";
import type { MerchantBalanceInfo } from "@/services/merchants.service";
import type { Merchant, MerchantCredentials } from "@/types";
import type { CreateMerchantData, UpdateMerchantData } from "@/services/merchants.service";

/* ── mock data for design alignment ────────────────────────── */

const ADMIN_MERCHANTS_MOCK = [
  { id: "MER-001", name: "Boutique Mami SARL", country: "CM", volume30: 5240000, txCount: 1247, status: "live", plan: "Growth", fee: "1,5%", since: "12 mars 2026", risk: "low" },
  { id: "MER-002", name: "Restaurant Le Baobab", country: "CM", volume30: 2180000, txCount: 432, status: "live", plan: "Starter", fee: "2,5%", since: "08 avr 2026", risk: "low" },
  { id: "MER-003", name: "KILIMO SARL", country: "CI", volume30: 18500000, txCount: 3287, status: "live", plan: "Growth", fee: "1,5%", since: "22 fev 2026", risk: "medium" },
  { id: "MER-004", name: "Ecole Nkapla Pro", country: "SN", volume30: 920000, txCount: 184, status: "live", plan: "Starter", fee: "2,5%", since: "01 mai 2026", risk: "low" },
  { id: "MER-005", name: "TaxiYde Mobile", country: "CM", volume30: 412000, txCount: 1054, status: "kyc_pending", plan: "\u2014", fee: "\u2014", since: "24 mai 2026", risk: "\u2014" },
  { id: "MER-006", name: "Beaute Africaine SAS", country: "CI", volume30: 8420000, txCount: 1820, status: "live", plan: "Growth", fee: "1,5%", since: "14 jan 2026", risk: "low" },
  { id: "MER-007", name: "Cabinet Atangana & Co", country: "CM", volume30: 1240000, txCount: 87, status: "live", plan: "Starter", fee: "2,5%", since: "03 fev 2026", risk: "low" },
  { id: "MER-008", name: "Mobile Plus Center", country: "SN", volume30: 0, txCount: 0, status: "suspended", plan: "Starter", fee: "\u2014", since: "18 jan 2026", risk: "high" },
  { id: "MER-009", name: "Agro Export Cameroun", country: "CM", volume30: 124500000, txCount: 412, status: "live", plan: "Scale", fee: "0,9%", since: "10 sept 2025", risk: "low" },
  { id: "MER-010", name: "Wave Senegal Reseller", country: "SN", volume30: 6240000, txCount: 2148, status: "live", plan: "Growth", fee: "1,2%", since: "28 nov 2025", risk: "low" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [credentials, setCredentials] = useState<MerchantCredentials | null>(null);
  const [error, setError] = useState("");
  const [balances, setBalances] = useState<Record<string, MerchantBalanceInfo>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [filter, setFilter] = useState("all");

  const loadMerchants = () => {
    setIsLoading(true);
    merchantsService
      .list()
      .then((data) => {
        setMerchants(data.merchants);
        setTotalCount(data.total_count);
      })
      .catch(() => setError("Failed to load merchants"))
      .finally(() => setIsLoading(false));
  };

  const loadBalances = () => {
    setBalancesLoading(true);
    merchantsService
      .getAllBalances()
      .then(setBalances)
      .catch(() => {})
      .finally(() => setBalancesLoading(false));
  };

  useEffect(() => {
    loadMerchants();
    loadBalances();
  }, []);

  const activeCount = merchants.filter((m) => m.is_active).length;
  const suspendedCount = merchants.filter((m) => !m.is_active).length;

  /* Use real merchants if loaded, otherwise show mock data */
  const hasMerchants = merchants.length > 0;

  const FILTERS = [
    { id: "all", label: <T fr="Tous" en="All" />, count: hasMerchants ? totalCount : 2482 },
    { id: "live", label: "Live", count: hasMerchants ? activeCount : 2463 },
    { id: "kyc", label: <T fr="KYC en attente" en="Pending KYC" />, count: 7, tone: "warn" as const },
    { id: "suspended", label: <T fr="Suspendus" en="Suspended" />, count: hasMerchants ? suspendedCount : 12, tone: "fail" as const },
    { id: "scale", label: "Scale", count: 24, tone: "info" as const },
  ];

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Marchands" en="Merchants" />]}
      title={<T fr="Marchands" en="Merchants" />}
      sub={<T fr={`${hasMerchants ? activeCount : 2482} actifs \u00B7 7 en attente KYC \u00B7 ${hasMerchants ? suspendedCount : 12} suspendus`} en={`${hasMerchants ? activeCount : "2,482"} active \u00B7 7 pending KYC \u00B7 ${hasMerchants ? suspendedCount : 12} suspended`} />}
      actions={<>
        <button className="btn btn-ghost btn-sm"><Icon name="filter" size={13} /> <T fr="Filtres" en="Filters" /></button>
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> CSV</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          <Icon name="plus" size={13} color="white" /> <T fr="Onboard marchand" en="Onboard merchant" />
        </button>
      </>}
    >
      {error && (
        <div className="card" style={{ padding: 14, background: "var(--rose-soft)", color: "var(--rose)", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {credentials && (
        <CredentialsCard
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}

      {/* Search + filter pills */}
      <div className="card" style={{ padding: 14, marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6 }}>
          <Icon name="search" size={14} color="var(--muted)" />
          <input className="input" style={{ border: 0, padding: 0, background: "transparent", outline: "none", width: "100%", fontSize: 13 }} placeholder="nom, ID, RCCM, email..." />
        </div>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              appearance: "none" as const, border: 0, cursor: "pointer", padding: "5px 10px", borderRadius: 6,
              background: filter === f.id ? "var(--ink)" : "var(--bg-2)",
              color: filter === f.id ? "white" : "var(--ink-2)",
              fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center",
            }}
          >
            {f.label}
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, padding: "1px 5px", borderRadius: 3,
              background: filter === f.id ? "rgba(255,255,255,0.15)" : "var(--surface)",
            }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
            <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : (
          <>
            <div className="tbl">
              <div className="row head" style={{ gridTemplateColumns: "1.6fr 0.6fr 0.8fr 1fr 0.8fr 0.7fr 0.7fr 24px" }}>
                <span><T fr="Marchand" en="Merchant" /></span>
                <span><T fr="Pays" en="Country" /></span>
                <span><T fr="Plan" en="Plan" /></span>
                <span style={{ textAlign: "right" }}><T fr="GMV 30j" en="30d GMV" /></span>
                <span><T fr="Risque" en="Risk" /></span>
                <span><T fr="Depuis" en="Since" /></span>
                <span><T fr="Statut" en="Status" /></span>
                <span></span>
              </div>
              {hasMerchants ? (
                /* Real merchants from API */
                merchants.map((m) => {
                  const bal = balances[m.id];
                  return (
                    <Link href={`/dashboard/merchants/${m.id}`} key={m.id} style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="row clickable" style={{ gridTemplateColumns: "1.6fr 0.6fr 0.8fr 1fr 0.8fr 0.7fr 0.7fr 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={m.name} size={28} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                            <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{m.id}</div>
                          </div>
                        </div>
                        <div className="mono" style={{ fontSize: 11 }}>CM</div>
                        <div><Pill tone="neutral" plain>{"\u2014"}</Pill> <span className="mono" style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>{m.fee_rate ?? 1.75}%</span></div>
                        <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{bal ? fmtCompact(bal.total_earned) + " F" : "\u2014"}</div>
                        <div><Pill tone="success">low</Pill></div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>\u2014</div>
                        <div>
                          <Pill tone={m.is_active ? "success" : "fail"}>{m.is_active ? "live" : "suspended"}</Pill>
                        </div>
                        <Icon name="chevR" size={14} color="var(--muted)" />
                      </div>
                    </Link>
                  );
                })
              ) : (
                /* Mock data matching design */
                ADMIN_MERCHANTS_MOCK.map((m) => (
                  <div className="row clickable" key={m.id} style={{ gridTemplateColumns: "1.6fr 0.6fr 0.8fr 1fr 0.8fr 0.7fr 0.7fr 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={m.name} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{m.id}</div>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 11 }}>{m.country}</div>
                    <div><Pill tone={m.plan === "Scale" ? "info" : "neutral"} plain>{m.plan}</Pill> <span className="mono" style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>{m.fee}</span></div>
                    <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{fmtCompact(m.volume30)} F</div>
                    <div>
                      {m.risk !== "\u2014" && <Pill tone={m.risk === "low" ? "success" : m.risk === "medium" ? "warn" : "fail"}>{m.risk}</Pill>}
                      {m.risk === "\u2014" && <span style={{ color: "var(--muted-2)" }}>{"\u2014"}</span>}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{m.since}</div>
                    <div>
                      <Pill tone={m.status === "live" ? "success" : m.status === "kyc_pending" ? "warn" : "fail"}>{m.status === "kyc_pending" ? "kyc" : m.status}</Pill>
                    </div>
                    <Icon name="chevR" size={14} color="var(--muted)" />
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)" }}>
              <span><T fr={`Affichage 1-${hasMerchants ? merchants.length : 10} sur ${hasMerchants ? totalCount : "2 482"} marchands`} en={`Showing 1-${hasMerchants ? merchants.length : 10} of ${hasMerchants ? totalCount : "2,482"} merchants`} /></span>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateMerchantModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(creds) => {
            setCredentials(creds);
            setShowCreateModal(false);
            loadMerchants();
            loadBalances();
          }}
        />
      )}

      {editingMerchant && (
        <EditMerchantModal
          merchant={editingMerchant}
          onClose={() => setEditingMerchant(null)}
          onUpdated={() => {
            setEditingMerchant(null);
            loadMerchants();
            loadBalances();
          }}
        />
      )}
    </PageWrapper>
  );
}

/* ── Credentials card ─────────────────────────────────────── */

function CredentialsCard({
  credentials,
  onClose,
}: {
  credentials: MerchantCredentials;
  onClose: () => void;
}) {
  return (
    <div className="card" style={{ marginBottom: 16, border: "1px solid var(--warn)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>
            <T fr={`Marchand cree : ${credentials.name}`} en={`Merchant Created: ${credentials.name}`} />
          </h3>
          <p style={{ color: "var(--warn)", fontSize: 13, fontWeight: 500, margin: "4px 0 0" }}>
            <T fr="Sauvegardez le secret API maintenant \u2014 il ne sera plus affiche." en="Save the API Secret now \u2014 it will not be shown again." />
          </p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon name="x" size={16} color="var(--muted)" />
        </button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <CredentialRow label="API Key (Live)" value={credentials.api_key_live} />
        <CredentialRow label="API Key (Test)" value={credentials.api_key_test} />
        <CredentialRow label="API Secret" value={credentials.api_secret} highlight />
        <CredentialRow label="Webhook Secret" value={credentials.webhook_secret} />
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-2)", borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
        <code className="mono" style={{ fontSize: 11, wordBreak: "break-all", color: highlight ? "var(--warn)" : "var(--ink)", fontWeight: highlight ? 600 : 400 }}>
          {value}
        </code>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        style={{ background: "none", border: "none", padding: 4, cursor: "pointer", flexShrink: 0, marginLeft: 8 }}
      >
        <Icon name="copy" size={14} color="var(--muted)" />
      </button>
    </div>
  );
}

/* ── Create modal ─────────────────────────────────────────── */

function CreateMerchantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (creds: MerchantCredentials) => void;
}) {
  const [form, setForm] = useState<CreateMerchantData>({
    name: "",
    email: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const creds = await merchantsService.create(form);
      onCreated(creds);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to create merchant");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof CreateMerchantData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value || undefined }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", borderRadius: 12, background: "var(--surface)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}><T fr="Ajouter un marchand" en="Add Merchant" /></h2>
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
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Nom *" en="Name *" />
            </label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Merchant name" required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Email *" en="Email *" />
            </label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="merchant@example.com" required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Telephone" en="Phone" />
              </label>
              <Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+237..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Type d'activite" en="Business Type" />
              </label>
              <Input value={form.business_type || ""} onChange={(e) => set("business_type", e.target.value)} placeholder="e-commerce, SaaS..." />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Site web" en="Website" />
            </label>
            <Input value={form.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="URL Callback" en="Callback URL" />
            </label>
            <Input value={form.callback_url || ""} onChange={(e) => set("callback_url", e.target.value)} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="URL Logo" en="Logo URL" />
            </label>
            <Input value={form.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://example.com/logo.png" />
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              <T fr="Affiche sur la page de paiement du client" en="Displayed on the customer payment page" />
            </p>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Taux de frais (%) *" en="Fee rate (%) *" />
            </label>
            <Input
              type="number"
              step="0.01"
              min="1.75"
              max="20"
              value={form.fee_rate ?? 1.75}
              onChange={(e) => setForm((prev) => ({ ...prev, fee_rate: parseFloat(e.target.value) || 1.75 }))}
            />
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              <T fr="Minimum 1.75% \u2014 par defaut supporte par le marchand" en="Minimum 1.75% \u2014 borne by merchant by default" />
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <T fr="Annuler" en="Cancel" />
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <T fr="Creation..." en="Creating..." /> : <T fr="Creer le marchand" en="Create Merchant" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit modal ───────────────────────────────────────────── */

function EditMerchantModal({
  merchant,
  onClose,
  onUpdated,
}: {
  merchant: Merchant;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState<UpdateMerchantData>({
    name: merchant.name,
    phone: merchant.phone || "",
    website: merchant.website || "",
    callback_url: merchant.callback_url || "",
    business_type: merchant.business_type || "",
    description: merchant.description || "",
    logo_url: merchant.logo_url || "",
    is_active: merchant.is_active,
    default_payment_mode: merchant.default_payment_mode,
    fee_rate: merchant.fee_rate,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload: UpdateMerchantData = { ...form };
      for (const key of ["phone", "website", "callback_url", "business_type", "description", "logo_url"] as const) {
        if (payload[key] === "") payload[key] = undefined;
      }
      await merchantsService.update(merchant.id, payload);
      onUpdated();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to update merchant");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", borderRadius: 12, background: "var(--surface)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}><T fr="Modifier le marchand" en="Edit Merchant" /></h2>
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
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Nom *" en="Name *" />
            </label>
            <Input
              value={form.name || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Merchant name"
              required
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Email</label>
            <Input value={merchant.email} disabled style={{ opacity: 0.5 }} />
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              <T fr="L'email ne peut pas etre modifie" en="Email cannot be changed" />
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Telephone" en="Phone" />
              </label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+237..."
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Type d'activite" en="Business Type" />
              </label>
              <Input
                value={form.business_type || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, business_type: e.target.value }))}
                placeholder="e-commerce, SaaS..."
              />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Site web" en="Website" />
            </label>
            <Input
              value={form.website || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="URL Callback" en="Callback URL" />
            </label>
            <Input
              value={form.callback_url || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, callback_url: e.target.value }))}
              placeholder="https://example.com/webhook"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Description</label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description du marchand"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="URL Logo" en="Logo URL" />
            </label>
            <Input
              value={form.logo_url || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              <T fr="Taux de frais (%) *" en="Fee rate (%) *" />
            </label>
            <Input
              type="number"
              step="0.01"
              min="1.75"
              max="20"
              value={form.fee_rate ?? 1.75}
              onChange={(e) => setForm((prev) => ({ ...prev, fee_rate: parseFloat(e.target.value) || 1.75 }))}
            />
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              <T fr="Minimum 1.75% \u2014 par defaut supporte par le marchand" en="Minimum 1.75% \u2014 borne by merchant by default" />
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}>
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <div>
              <span style={{ fontSize: 13, fontWeight: 500 }}><T fr="Marchand actif" en="Active merchant" /></span>
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>
                {form.is_active
                  ? <T fr="Le marchand peut utiliser l'API" en="Merchant can use the API" />
                  : <T fr="Acces API desactive" en="API access disabled" />
                }
              </p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <T fr="Annuler" en="Cancel" />
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <T fr="Enregistrement..." en="Saving..." /> : <T fr="Enregistrer" en="Save Changes" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
