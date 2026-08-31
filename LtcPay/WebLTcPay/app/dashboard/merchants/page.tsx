"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");

  const loadMerchants = () => {
    setIsLoading(true);
    // The API caps page_size at 100, so walk every page to hold the full list
    // in memory — search, filters and counts all run client-side over it.
    (async () => {
      const PAGE_SIZE = 100;
      const first = await merchantsService.list(1, PAGE_SIZE);
      const all = [...first.merchants];
      const pages = Math.ceil(first.total_count / PAGE_SIZE);
      for (let p = 2; p <= pages; p++) {
        const next = await merchantsService.list(p, PAGE_SIZE);
        all.push(...next.merchants);
      }
      setMerchants(all);
      setTotalCount(first.total_count);
    })()
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

  // "Live" used to mean is_active alone, so 18 self-registered accounts that
  // had never been verified and could not collect anything were displayed as
  // live. Verification is what actually authorises collecting.
  const isLive = (m: Merchant) => m.is_active && m.is_verified;
  const isUnverified = (m: Merchant) => m.is_active && !m.is_verified;

  const liveCount = merchants.filter(isLive).length;
  const unverifiedCount = merchants.filter(isUnverified).length;
  const suspendedCount = merchants.filter((m) => !m.is_active).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merchants.filter((m) => {
      if (filter === "live" && !isLive(m)) return false;
      if (filter === "unverified" && !isUnverified(m)) return false;
      if (filter === "suspended" && m.is_active) return false;
      if (!q) return true;
      return [m.name, m.email, m.id, m.phone, m.website]
        .some((field) => field?.toLowerCase().includes(q));
    });
  }, [merchants, filter, search]);

  const exportCsv = () => {
    const header = ["id", "name", "email", "phone", "website", "fee_rate", "status", "mode", "created_at"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = visible.map((m) => [
      m.id, m.name, m.email, m.phone, m.website, m.fee_rate,
      !m.is_active ? "suspended" : m.is_verified ? "live" : "unverified",
      m.is_test_mode ? "test" : "live", m.created_at,
    ].map(escape).join(","));
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marchands-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const FILTERS = [
    { id: "all", label: <T fr="Tous" en="All" />, count: merchants.length },
    { id: "live", label: "Live", count: liveCount },
    { id: "unverified", label: <T fr="Non vérifiés" en="Unverified" />, count: unverifiedCount, tone: "warn" as const },
    { id: "suspended", label: <T fr="Suspendus" en="Suspended" />, count: suspendedCount, tone: "fail" as const },
  ];

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Marchands" en="Merchants" />]}
      title={<T fr="Marchands" en="Merchants" />}
      sub={
        <T
          fr={`${liveCount} live · ${unverifiedCount} non vérifiés · ${suspendedCount} suspendus`}
          en={`${liveCount} live · ${unverifiedCount} unverified · ${suspendedCount} suspended`}
        />
      }
      actions={<>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={visible.length === 0}>
          <Icon name="download" size={13} /> CSV
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          <Icon name="plus" size={13} color="white" /> <T fr="Onboard marchand" en="Onboard merchant" />
        </button>
      </>}
    >
      {error && (
        <div className="nk-card" style={{ padding: 14, background: "var(--rose-soft)", color: "var(--rose)", fontSize: 13, marginBottom: 12 }}>
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
      <div className="nk-card" style={{ padding: 14, marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6 }}>
          <Icon name="search" size={14} color="var(--muted)" />
          <input
            className="nk-input"
            style={{ border: 0, padding: 0, background: "transparent", outline: "none", width: "100%", fontSize: 13 }}
            placeholder="nom, ID, RCCM, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
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
              {visible.length > 0 ? (
                visible.map((m) => {
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
                        <div><Pill tone="neutral" plain>{"—"}</Pill> <span className="mono" style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>{m.fee_rate ?? 1.75}%</span></div>
                        <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{bal ? fmtCompact(bal.total_earned) + " F" : "—"}</div>
                        <div><Pill tone="success">low</Pill></div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}
                        </div>
                        <div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                            {!m.is_active ? (
                              <Pill tone="fail">suspended</Pill>
                            ) : m.is_verified ? (
                              <Pill tone="success">live</Pill>
                            ) : (
                              <Pill tone="warn"><T fr="non vérifié" en="unverified" /></Pill>
                            )}
                            {m.is_test_mode && <Pill tone="test">test</Pill>}
                          </div>
                        </div>
                        <Icon name="chevR" size={14} color="var(--muted)" />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14, gridColumn: "1 / -1" }}>
                  {search.trim() || filter !== "all" ? (
                    <T fr="Aucun marchand ne correspond à votre recherche" en="No merchant matches your search" />
                  ) : (
                    <T fr="Aucun marchand pour le moment" en="No merchants yet" />
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)" }}>
              <span><T fr={`${visible.length} sur ${totalCount} marchands`} en={`${visible.length} of ${totalCount} merchants`} /></span>
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
    <div className="nk-card" style={{ marginBottom: 16, border: "1px solid var(--warn)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>
            <T fr={`Marchand cree : ${credentials.name}`} en={`Merchant Created: ${credentials.name}`} />
          </h3>
          <p style={{ color: "var(--warn)", fontSize: 13, fontWeight: 500, margin: "4px 0 0" }}>
            <T fr="Sauvegardez le secret API maintenant — il ne sera plus affiche." en="Save the API Secret now — it will not be shown again." />
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
              <T fr="Minimum 1.75% — par defaut supporte par le marchand" en="Minimum 1.75% — borne by merchant by default" />
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
    is_verified: merchant.is_verified,
    is_test_mode: merchant.is_test_mode,
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
              <T fr="Minimum 1.75% — par defaut supporte par le marchand" en="Minimum 1.75% — borne by merchant by default" />
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}>
            <input
              type="checkbox"
              checked={form.is_verified ?? false}
              onChange={(e) => setForm((prev) => ({ ...prev, is_verified: e.target.checked, is_test_mode: !e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <div>
              <span style={{ fontSize: 13, fontWeight: 500 }}><T fr="Marchand vérifié" en="Verified merchant" /></span>
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>
                {form.is_verified
                  ? <T fr="Clé live active — le marchand peut encaisser de l'argent réel" en="Live key active — the merchant can collect real money" />
                  : <T fr="Clé live inactive, création de paiement refusée. À cocher seulement après vérification de l'identité du marchand." en="Live key inert, payment creation refused. Tick only after verifying the merchant's identity." />
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
