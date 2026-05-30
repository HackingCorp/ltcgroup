"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF, fmtDate } from "@/lib/format";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import { formatCurrency } from "@/lib/utils";
import type { Payment, PaginatedResponse } from "@/types";

const STATUS_FILTERS: { key: string; fr: string; en: string; tone: "neutral" | "warn" | "success" | "fail" | "info" }[] = [
  { key: "", fr: "Tous", en: "All", tone: "neutral" },
  { key: "pending", fr: "En attente", en: "Pending", tone: "warn" },
  { key: "completed", fr: "R\u00e9ussi", en: "Completed", tone: "success" },
  { key: "failed", fr: "\u00c9chou\u00e9", en: "Failed", tone: "fail" },
  { key: "expired", fr: "Expir\u00e9", en: "Expired", tone: "neutral" },
  { key: "cancelled", fr: "Annul\u00e9", en: "Cancelled", tone: "neutral" },
];

function statusTone(s: string): "success" | "warn" | "fail" | "neutral" {
  if (s === "completed") return "success";
  if (s === "pending") return "warn";
  if (s === "failed") return "fail";
  return "neutral";
}

function methodKind(m?: string): string {
  if (!m) return "card";
  const lower = m.toLowerCase();
  if (lower.includes("orange") || lower.includes("om")) return "orange";
  if (lower.includes("mtn") || lower.includes("momo")) return "mtn";
  if (lower.includes("wave")) return "wave";
  return "card";
}

export default function MerchantPaymentsPage() {
  const { lang } = useLang();
  const [data, setData] = useState<PaginatedResponse<Payment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await merchantDashboardService.getPayments({
          page,
          page_size: 20,
          status: statusFilter || undefined,
        });
        setData(result);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, statusFilter]);

  const filteredItems = data?.items.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(q) ||
      (p.customer_email && p.customer_email.toLowerCase().includes(q)) ||
      (p.customer_phone && p.customer_phone.toLowerCase().includes(q))
    );
  }) ?? [];

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Encaissement" en="Collect" />, <T key="c2" fr="Transactions" en="Transactions" />]}
      title={<T fr="Transactions" en="Transactions" />}
      sub={<T fr="Historique de tous vos paiements" en="History of all your payments" />}
      actions={
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> <T fr="Export CSV" en="Export CSV" /></button>
      }
    >
      {/* Filters row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.key}
              onClick={() => { setStatusFilter(sf.key); setPage(1); }}
              className={statusFilter === sf.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              style={{ fontSize: 12 }}
            >
              {lang === "en" ? sf.en : sf.fr}
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={14} color="var(--muted)" />
          <input
            type="text"
            placeholder={lang === "en" ? "Search reference, email..." : "Chercher r\u00e9f\u00e9rence, email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "6px 10px 6px 8px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 13,
              background: "var(--surface)",
              color: "var(--ink)",
              outline: "none",
              width: 220,
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
            <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            {/* Header row */}
            <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.7fr 0.8fr 0.8fr" }}>
              <div><T fr="R\u00e9f\u00e9rence" en="Reference" /></div>
              <div><T fr="Client" en="Customer" /></div>
              <div><T fr="M\u00e9thode" en="Method" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
              <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
            </div>
            <div className="tbl">
              {filteredItems.map((p) => (
                <Link
                  href={`/merchant/dashboard/payments/${p.reference}`}
                  key={p.id}
                  className="row clickable"
                  style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.7fr 0.8fr 0.8fr", textDecoration: "none", color: "inherit" }}
                >
                  <div>
                    <span className="mono" style={{ fontSize: 12 }}>{p.reference}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {p.customer_email || p.customer_phone || "\u2014"}
                  </div>
                  <div>
                    <MethodChip kind={methodKind(p.payment_method)} />
                  </div>
                  <div>
                    <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                  </div>
                  <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>
                    {formatCurrency(p.amount, p.currency)}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                    {fmtDate(p.created_at)}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {data && (
              <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  <T fr={`Page ${data.page} sur ${data.total_pages} (${data.total} r\u00e9sultats)`} en={`Page ${data.page} of ${data.total_pages} (${data.total} results)`} />
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <Icon name="chevL" size={13} /> <T fr="Pr\u00e9c\u00e9dent" en="Previous" />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={page >= (data.total_pages || 1)} onClick={() => setPage(page + 1)}>
                    <T fr="Suivant" en="Next" /> <Icon name="chevR" size={13} />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="receipt" size={32} color="var(--muted)" />
            <p style={{ marginTop: 12 }}><T fr="Aucune transaction trouv\u00e9e." en="No transactions found." /></p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
