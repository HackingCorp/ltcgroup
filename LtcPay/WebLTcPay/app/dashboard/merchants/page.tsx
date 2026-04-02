"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Loading, Button, Input } from "@/components/ui";
import { merchantsService } from "@/services/merchants.service";
import { Store, Plus, Copy, Eye, EyeOff, X } from "lucide-react";
import type { Merchant, MerchantCredentials } from "@/types";
import type { CreateMerchantData } from "@/services/merchants.service";

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [credentials, setCredentials] = useState<MerchantCredentials | null>(null);
  const [error, setError] = useState("");

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

  useEffect(() => {
    loadMerchants();
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
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">API Key (Test)</th>
                    <th className="pb-3 font-medium">API Key (Live)</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {merchants.map((m) => (
                    <tr key={m.id}>
                      <td className="py-3 font-medium text-gray-900">{m.name}</td>
                      <td className="py-3 text-gray-600">{m.email}</td>
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
                      <td className="py-3">
                        <ApiKeyCell value={m.api_key_test} />
                      </td>
                      <td className="py-3">
                        <ApiKeyCell value={m.api_key_live} />
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                    </tr>
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
          }}
        />
      )}
    </div>
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
