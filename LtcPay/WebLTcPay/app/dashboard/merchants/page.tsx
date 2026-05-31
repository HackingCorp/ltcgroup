"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";
import { Input } from "@/components/ui";
import { merchantsService } from "@/services/merchants.service";
import type { MerchantBalanceInfo } from "@/services/merchants.service";
import type { Merchant, MerchantCredentials } from "@/types";
import type { CreateMerchantData, UpdateMerchantData } from "@/services/merchants.service";
import { formatCurrency } from "@/lib/utils";

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

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Marchands" en="Merchants" />]}
      title={<T fr="Marchands" en="Merchants" />}
      sub={<T fr={`${totalCount} marchand(s) enregistré(s)`} en={`${totalCount} registered merchant(s)`} />}
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          <Icon name="plus" size={13} color="white" /> <T fr="Ajouter" en="Add Merchant" />
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard hero label={<T fr="Total marchands" en="Total merchants" />} value={String(totalCount)} />
        <KpiCard label={<T fr="Actifs" en="Active" />} value={String(activeCount)} after={<Pill tone="success"><T fr="en ligne" en="online" /></Pill>} />
        <KpiCard label={<T fr="Inactifs" en="Inactive" />} value={String(totalCount - activeCount)} />
        <KpiCard label={<T fr="Mode test" en="Test mode" />} value={String(merchants.filter((m) => m.is_test_mode).length)} />
      </div>

      {error && (
        <div className="card" style={{ padding: 14, background: "var(--rose-soft)", color: "var(--rose)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {credentials && (
        <CredentialsCard
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
            <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : merchants.length > 0 ? (
          <>
            <div className="row head" style={{ gridTemplateColumns: "1.6fr 0.6fr 0.9fr 0.7fr 0.6fr 1.2fr" }}>
              <div><T fr="Marchand" en="Merchant" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div style={{ textAlign: "right" }}><T fr="Solde" en="Balance" /></div>
              <div style={{ textAlign: "right" }}><T fr="Paiements" en="Payments" /></div>
              <div style={{ textAlign: "center" }}><T fr="Commission" en="Fee" /></div>
              <div style={{ textAlign: "right" }}><T fr="Actions" en="Actions" /></div>
            </div>
            <div className="tbl">
              {merchants.map((m) => (
                <MerchantRow
                  key={m.id}
                  merchant={m}
                  balance={balances[m.id]}
                  balanceLoading={balancesLoading}
                  onCredentials={(creds) => setCredentials(creds)}
                  onRefresh={() => { loadMerchants(); loadBalances(); }}
                  onEdit={(merchant) => setEditingMerchant(merchant)}
                />
              ))}
            </div>
          </>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="building" size={32} color="var(--muted)" />
            <p style={{ marginTop: 12 }}><T fr="Aucun marchand. Cliquez sur Ajouter pour en créer un." en="No merchants yet. Click Add to create one." /></p>
          </div>
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

/* ── merchant row ──────────────────────────────────────────── */

function MerchantRow({
  merchant: m,
  balance,
  balanceLoading,
  onCredentials,
  onRefresh,
  onEdit,
}: {
  merchant: Merchant;
  balance?: MerchantBalanceInfo;
  balanceLoading: boolean;
  onCredentials: (creds: MerchantCredentials) => void;
  onRefresh: () => void;
  onEdit: (merchant: Merchant) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleRegenerateApiSecret = async () => {
    if (!confirm(`Regenerate API secret for "${m.name}"? The old secret will stop working immediately.`))
      return;
    setRegenerating("api");
    try {
      const creds = await merchantsService.regenerateApiSecret(m.id);
      onCredentials(creds);
    } catch {
      alert("Failed to regenerate API secret");
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateWebhookSecret = async () => {
    if (!confirm(`Regenerate webhook secret for "${m.name}"? Update your webhook handler with the new secret.`))
      return;
    setRegenerating("webhook");
    try {
      const result = await merchantsService.regenerateWebhookSecret(m.id);
      alert(`New webhook secret:\n\n${result.webhook_secret}\n\nSave it now.`);
      onRefresh();
    } catch {
      alert("Failed to regenerate webhook secret");
    } finally {
      setRegenerating(null);
    }
  };

  const handleToggleActive = async () => {
    const action = m.is_active ? "deactivate" : "reactivate";
    if (!confirm(`${m.is_active ? "Deactivate" : "Reactivate"} "${m.name}"? ${m.is_active ? "They will lose API access immediately." : "They will regain API access."}`))
      return;
    setActionLoading(true);
    try {
      await merchantsService.update(m.id, { is_active: !m.is_active });
      onRefresh();
    } catch {
      alert(`Failed to ${action} merchant`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete merchant "${m.name}"? This action cannot be undone.`))
      return;
    setActionLoading(true);
    try {
      await merchantsService.delete(m.id);
      onRefresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr.response?.status === 409) {
        const detail = axiosErr.response.data?.detail || "Merchant has payments.";
        if (confirm(`${detail}\n\nForce delete and remove all associated payments?`)) {
          try {
            const result = await merchantsService.delete(m.id, true);
            alert(`${result.detail} (${result.payments_deleted} payment(s) removed)`);
            onRefresh();
          } catch {
            alert("Failed to force-delete merchant");
          }
        }
      } else {
        alert("Failed to delete merchant");
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="row" style={{ gridTemplateColumns: "1.6fr 0.6fr 0.9fr 0.7fr 0.6fr 1.2fr" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={m.name} size={28} />
          <div>
            <div style={{ fontWeight: 500 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.email}</div>
          </div>
        </div>
        <div>
          <Pill tone={m.is_active ? "success" : "fail"}>
            {m.is_active ? <T fr="Actif" en="Active" /> : <T fr="Inactif" en="Inactive" />}
          </Pill>
        </div>
        <div style={{ textAlign: "right" }}>
          {balanceLoading ? (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>...</span>
          ) : balance ? (
            <div>
              <div style={{ fontWeight: 600 }}>{fmtXAF(balance.available_balance)}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{fmtXAF(balance.total_earned)} <T fr="gagné" en="earned" /></div>
            </div>
          ) : (
            <span style={{ color: "var(--muted)" }}>{"—"}</span>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          {balance ? (
            <div>
              <div style={{ fontWeight: 500 }}>{balance.completed_payments}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{balance.total_payments} total</div>
            </div>
          ) : (
            <span style={{ color: "var(--muted)" }}>{"—"}</span>
          )}
        </div>
        <div style={{ textAlign: "center", fontWeight: 500 }}>{m.fee_rate ?? 1.75}%</div>
        <div style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11 }}
            onClick={() => setShowDetails(!showDetails)}
          >
            <Icon name={showDetails ? "eyeOff" : "eye"} size={12} />
            {showDetails ? <T fr="Masquer" en="Hide" /> : <T fr="Clés" en="Keys" />}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11 }}
            onClick={() => onEdit(m)}
          >
            <Icon name="settings" size={12} />
            <T fr="Modifier" en="Edit" />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, color: "var(--rose)" }}
            onClick={handleDelete}
            disabled={actionLoading}
          >
            <Icon name="trash" size={12} color="var(--rose)" />
            {actionLoading ? "..." : <T fr="Suppr." en="Delete" />}
          </button>
          <Link
            href={`/dashboard/merchants/${m.id}`}
            className="btn btn-primary btn-sm"
            style={{ fontSize: 11, textDecoration: "none" }}
          >
            <T fr="Détails" en="Details" /> <Icon name="chevR" size={11} color="white" />
          </Link>
        </div>
      </div>
      {showDetails && (
        <div style={{ padding: "12px 18px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}><T fr="Clé API (Test)" en="API Key (Test)" /></div>
              <ApiKeyCell value={m.api_key_test} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}><T fr="Clé API (Live)" en="API Key (Live)" /></div>
              <ApiKeyCell value={m.api_key_live} />
            </div>
          </div>
          {m.webhook_secret && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}><T fr="Secret Webhook" en="Webhook Secret" /></div>
              <ApiKeyCell value={m.webhook_secret} />
            </div>
          )}
          <div style={{ display: "flex", gap: 6, paddingTop: 10, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, color: "var(--warn)" }}
              onClick={handleRegenerateApiSecret}
              disabled={regenerating !== null || actionLoading}
            >
              <Icon name="refresh" size={12} />
              {regenerating === "api" ? "..." : <T fr="Régénérer API Secret" en="Regenerate API Secret" />}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              onClick={handleRegenerateWebhookSecret}
              disabled={regenerating !== null || actionLoading}
            >
              <Icon name="shield" size={12} />
              {regenerating === "webhook" ? "..." : <T fr="Régénérer Webhook Secret" en="Regenerate Webhook Secret" />}
            </button>
            <div style={{ marginLeft: "auto" }} />
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, color: m.is_active ? "var(--warn)" : "var(--success)" }}
              onClick={handleToggleActive}
              disabled={actionLoading || regenerating !== null}
            >
              <Icon name="bolt" size={12} />
              {actionLoading ? "..." : m.is_active ? <T fr="Désactiver" en="Deactivate" /> : <T fr="Réactiver" en="Reactivate" />}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, color: "var(--rose)" }}
              onClick={handleDelete}
              disabled={actionLoading || regenerating !== null}
            >
              <Icon name="trash" size={12} color="var(--rose)" />
              {actionLoading ? "..." : <T fr="Supprimer" en="Delete" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── API key cell ──────────────────────────────────────────── */

function ApiKeyCell({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const masked = value.slice(0, 14) + "..." + value.slice(-4);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <code className="mono" style={{ fontSize: 11, color: "var(--ink)" }}>{visible ? value : masked}</code>
      <button
        onClick={() => setVisible(!visible)}
        style={{ background: "none", border: "none", padding: 2, cursor: "pointer" }}
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={13} color="var(--muted)" />
      </button>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        style={{ background: "none", border: "none", padding: 2, cursor: "pointer" }}
      >
        <Icon name="copy" size={13} color="var(--muted)" />
      </button>
    </div>
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
            <T fr={`Marchand créé : ${credentials.name}`} en={`Merchant Created: ${credentials.name}`} />
          </h3>
          <p style={{ color: "var(--warn)", fontSize: 13, fontWeight: 500, margin: "4px 0 0" }}>
            <T fr="Sauvegardez le secret API maintenant — il ne sera plus affiché." en="Save the API Secret now — it will not be shown again." />
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
                <T fr="Téléphone" en="Phone" />
              </label>
              <Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+237..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Type d'activité" en="Business Type" />
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
              <T fr="Affiché sur la page de paiement du client" en="Displayed on the customer payment page" />
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
              <T fr="Minimum 1.75% — par défaut supporté par le marchand" en="Minimum 1.75% — borne by merchant by default" />
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <T fr="Annuler" en="Cancel" />
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <T fr="Création..." en="Creating..." /> : <T fr="Créer le marchand" en="Create Merchant" />}
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
              <T fr="L'email ne peut pas être modifié" en="Email cannot be changed" />
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Téléphone" en="Phone" />
              </label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+237..."
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                <T fr="Type d'activité" en="Business Type" />
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
              <T fr="Minimum 1.75% — par défaut supporté par le marchand" en="Minimum 1.75% — borne by merchant by default" />
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
                  : <T fr="Accès API désactivé" en="API access disabled" />
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
