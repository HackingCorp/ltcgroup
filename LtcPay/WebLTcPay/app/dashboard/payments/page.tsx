"use client";

import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { paymentsService } from "@/services/payments.service";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/types";

const STATUS_OPTIONS = ["all", "completed", "pending", "failed", "expired", "cancelled"] as const;

function statusTone(s: string): "success" | "fail" | "warn" | "neutral" {
  switch (s.toLowerCase()) {
    case "completed": return "success";
    case "failed": return "fail";
    case "pending": return "warn";
    default: return "neutral";
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    paymentsService
      .list({ per_page: 50 })
      .then((data) => setPayments(data.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = payments;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.reference.toLowerCase().includes(q) ||
          (p.customer_email && p.customer_email.toLowerCase().includes(q)) ||
          (p.customer_phone && p.customer_phone.includes(q))
      );
    }
    return list;
  }, [payments, search, statusFilter]);

  if (isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 256 }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  return (
    <PageWrapper
      crumb={[
        <T key="c1" fr="Plateforme" en="Platform" />,
        <T key="c2" fr="Paiements" en="Payments" />,
      ]}
      title={<T fr="Paiements" en="Payments" />}
      sub={<T fr="Suivez et gerez tous les paiements de la plateforme" en="Track and manage all platform payments" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} />
          <T fr="Exporter" en="Export" />
        </button>
      }
    >
      {/* Search & filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Icon
            name="search"
            size={14}
            color="var(--muted-2)"
            className=""
          />
          <input
            className="nk-input nk-input-mono"
            placeholder="PAY-xxx, email, telephone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <Icon name="search" size={14} color="var(--muted-2)" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setStatusFilter(s)}
              style={{ fontSize: 11, padding: "5px 10px", textTransform: "capitalize" }}
            >
              {s === "all" ? <T fr="Tous" en="All" /> : s}
            </button>
          ))}
        </div>
      </div>

      {/* Payments table */}
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length > 0 ? (
          <div className="tbl">
            <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 1fr" }}>
              <div><T fr="Reference" en="Reference" /></div>
              <div><T fr="Montant" en="Amount" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div><T fr="Methode" en="Method" /></div>
              <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
            </div>
            {filtered.map((p) => (
              <div
                key={p.id}
                className="row clickable"
                style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 1fr" }}
              >
                <div className="mono" style={{ fontSize: 12 }}>{p.reference}</div>
                <div className="display" style={{ fontWeight: 500, fontSize: 14 }}>
                  {formatCurrency(p.amount, p.currency)}
                </div>
                <div>
                  <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
                  {p.payment_method || "\u2014"}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                  {fmtDate(p.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="card" size={32} color="var(--muted-2)" />
            <p style={{ marginTop: 8 }}>
              {search || statusFilter !== "all" ? (
                <T fr="Aucun paiement ne correspond aux filtres" en="No payments match the current filters" />
              ) : (
                <T fr="Aucun paiement pour le moment" en="No payments yet" />
              )}
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
