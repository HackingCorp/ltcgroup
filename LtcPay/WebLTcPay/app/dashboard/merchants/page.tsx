"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Loading, Button, Input } from "@/components/ui";
import { merchantsService } from "@/services/merchants.service";
import type { MerchantBalanceInfo } from "@/services/merchants.service";
import { Store, Plus, Copy, Eye, EyeOff, X, RefreshCw, KeyRound, Shield, Power, Trash2, ChevronRight, Wallet, Pencil } from "lucide-react";
import type { Merchant, MerchantCredentials } from "@/types";
import type { CreateMerchantData, UpdateMerchantData } from "@/services/merchants.service";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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

  if (isLoading) {
    return <Loading className="py-20" size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-sm text-gray-500">
            {totalCount} merchant{totalCount !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Merchant
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {credentials && (
        <CredentialsCard
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}

      <Card>
        <CardContent>
          {merchants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Merchant</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Balance</th>
                    <th className="pb-3 font-medium text-right">Paiements</th>
                    <th className="pb-3 font-medium text-center">Commission</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Store className="mb-3 h-10 w-10 text-gray-300" />
              <p>No merchants yet</p>
              <p className="text-xs">Click &quot;Add Merchant&quot; to create one</p>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}

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
      <tr className="hover:bg-gray-50">
        <td className="py-3">
          <div>
            <p className="font-medium text-gray-900">{m.name}</p>
            <p className="text-xs text-gray-500">{m.email}</p>
          </div>
        </td>
        <td className="py-3">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              m.is_active
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {m.is_active ? "Active" : "Inactive"}
          </span>
        </td>
        <td className="py-3 text-right">
          {balanceLoading ? (
            <span className="text-xs text-gray-400">...</span>
          ) : balance ? (
            <div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(balance.available_balance)}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(balance.total_earned)} earned
              </p>
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>
        <td className="py-3 text-right">
          {balance ? (
            <div>
              <p className="font-medium text-gray-900">{balance.completed_payments}</p>
              <p className="text-xs text-gray-500">{balance.total_payments} total</p>
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>
        <td className="py-3 text-center">
          <p className="text-sm font-medium text-gray-900">{m.fee_rate ?? 1.75}%</p>
          <p className="text-xs text-gray-500">
            payé par {m.fee_bearer === "CLIENT" ? "client" : "marchand"}
          </p>
        </td>
        <td className="py-3">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {showDetails ? "Hide" : "Keys"}
            </button>
            <button
              onClick={() => onEdit(m)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              {actionLoading ? "..." : "Delete"}
            </button>
            <Link
              href={`/dashboard/merchants/${m.id}`}
              className="inline-flex items-center gap-1 rounded-md bg-navy-500 px-2 py-1 text-xs font-medium text-white hover:bg-navy-600 transition-colors"
            >
              <Wallet className="h-3 w-3" />
              Details
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </td>
      </tr>
      {showDetails && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">API Key (Test)</p>
                  <ApiKeyCell value={m.api_key_test} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">API Key (Live)</p>
                  <ApiKeyCell value={m.api_key_live} />
                </div>
              </div>
              {m.webhook_secret && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Webhook Secret</p>
                  <ApiKeyCell value={m.webhook_secret} />
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={handleRegenerateApiSecret}
                  disabled={regenerating !== null || actionLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {regenerating === "api" ? "Regenerating..." : "Regenerate API Secret"}
                </button>
                <button
                  onClick={handleRegenerateWebhookSecret}
                  disabled={regenerating !== null || actionLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {regenerating === "webhook" ? "Regenerating..." : "Regenerate Webhook Secret"}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleToggleActive}
                    disabled={actionLoading || regenerating !== null}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors ${
                      m.is_active
                        ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {actionLoading ? "..." : m.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading || regenerating !== null}
                    className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {actionLoading ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ApiKeyCell({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const masked = value.slice(0, 14) + "..." + value.slice(-4);

  return (
    <div className="flex items-center gap-1">
      <code className="text-xs text-gray-600">{visible ? value : masked}</code>
      <button
        onClick={() => setVisible(!visible)}
        className="p-0.5 text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        className="p-0.5 text-gray-400 hover:text-gray-600"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CredentialsCard({
  credentials,
  onClose,
}: {
  credentials: MerchantCredentials;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Merchant Created: {credentials.name}
            </h3>
            <p className="mt-1 text-sm text-amber-600 font-medium">
              Save the API Secret now — it will not be shown again.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <CredentialRow label="API Key (Live)" value={credentials.api_key_live} />
          <CredentialRow label="API Key (Test)" value={credentials.api_key_test} />
          <CredentialRow label="API Secret" value={credentials.api_secret} highlight />
          <CredentialRow label="Webhook Secret" value={credentials.webhook_secret} />
        </div>
      </CardContent>
    </Card>
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
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <code
          className={`text-xs break-all ${
            highlight ? "text-amber-700 font-semibold" : "text-gray-800"
          }`}
        >
          {value}
        </code>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        className="ml-2 shrink-0 p-1 text-gray-400 hover:text-gray-600"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Merchant</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name *
            </label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Merchant name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email *
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="merchant@example.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <Input
                value={form.phone || ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+237..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Business Type
              </label>
              <Input
                value={form.business_type || ""}
                onChange={(e) => set("business_type", e.target.value)}
                placeholder="e-commerce, SaaS..."
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Website
            </label>
            <Input
              value={form.website || ""}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Callback URL
            </label>
            <Input
              value={form.callback_url || ""}
              onChange={(e) => set("callback_url", e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Logo URL
            </label>
            <Input
              value={form.logo_url || ""}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <p className="mt-1 text-xs text-gray-400">
              Affiché sur la page de paiement du client
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Taux de frais (%) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="1.75"
                max="20"
                value={form.fee_rate ?? 1.75}
                onChange={(e) => setForm((prev) => ({ ...prev, fee_rate: parseFloat(e.target.value) || 1.75 }))}
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 1.75%</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Frais supportés par
              </label>
              <select
                value={form.fee_bearer ?? "MERCHANT"}
                onChange={(e) => setForm((prev) => ({ ...prev, fee_bearer: e.target.value as "MERCHANT" | "CLIENT" }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              >
                <option value="MERCHANT">Marchand</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-800">
              <strong>ℹ️ Mode de paiement automatique :</strong> Les deux options (SDK et Direct API) sont toujours disponibles.
              Le mode est déterminé automatiquement lors de la création du paiement :
            </p>
            <ul className="mt-2 text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li><strong>Sans</strong> opérateur/téléphone → SDK (lien réutilisable)</li>
              <li><strong>Avec</strong> opérateur/téléphone → Direct API (initiation immédiate)</li>
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Merchant"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
    fee_bearer: merchant.fee_bearer,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      // Strip empty strings to undefined so backend ignores them
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Merchant</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name *
            </label>
            <Input
              value={form.name || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Merchant name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              value={merchant.email}
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-400">
              L&apos;email ne peut pas être modifié
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+237..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Business Type
              </label>
              <Input
                value={form.business_type || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, business_type: e.target.value }))}
                placeholder="e-commerce, SaaS..."
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Website
            </label>
            <Input
              value={form.website || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Callback URL
            </label>
            <Input
              value={form.callback_url || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, callback_url: e.target.value }))}
              placeholder="https://example.com/webhook"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description du marchand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Logo URL
            </label>
            <Input
              value={form.logo_url || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Taux de frais (%) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="1.75"
                max="20"
                value={form.fee_rate ?? 1.75}
                onChange={(e) => setForm((prev) => ({ ...prev, fee_rate: parseFloat(e.target.value) || 1.75 }))}
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 1.75%</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Frais supportés par
              </label>
              <select
                value={form.fee_bearer ?? "MERCHANT"}
                onChange={(e) => setForm((prev) => ({ ...prev, fee_bearer: e.target.value as "MERCHANT" | "CLIENT" }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              >
                <option value="MERCHANT">Marchand</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
              />
              Marchand actif
            </label>
            <p className="text-xs text-gray-500">
              {form.is_active ? "Le marchand peut utiliser l'API" : "Accès API désactivé"}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
