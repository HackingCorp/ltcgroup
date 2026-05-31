"use client";

import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmt, fmtDate } from "@/lib/format";
import { paymentsService } from "@/services/payments.service";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/types";

function statusTone(s: string): "success" | "fail" | "warn" | "neutral" {
  const lower = s.toLowerCase();
  if (lower === "completed") return "success";
  if (lower === "failed") return "fail";
  if (lower === "pending" || lower === "processing") return "warn";
  return "neutral";
}

export default function TransactionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    paymentsService
      .list({ per_page: 50 })
      .then((data) => setPayments(data.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (t) =>
        t.reference.toLowerCase().includes(q) ||
        (t.customer_email && t.customer_email.toLowerCase().includes(q)) ||
        (t.customer_phone && t.customer_phone.includes(q))
    );
  }, [payments, search]);

  const completedPayments = payments.filter((t) => t.status.toLowerCase() === "completed");
  const totalVolume = completedPayments.reduce((s, t) => s + t.amount, 0);
  const successCount = completedPayments.length;

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
        <T key="c2" fr="Transactions" en="Transactions" />,
      ]}
      title={<T fr="Transactions" en="Transactions" />}
      sub={<T fr="Historique detaille de toutes les transactions" en="Detailed history of all transactions" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} />
          <T fr="Exporter" en="Export" />
        </button>
      }
    >
      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginBottom: 12 }}>
        <KpiCard label={<T fr="Volume traite" en="Processed volume" />} value={fmtXAF(totalVolume)} />
        <KpiCard label={<T fr="Transactions reussies" en="Successful TX" />} value={String(successCount)} />
        <KpiCard label={<T fr="Total transactions" en="Total transactions" />} value={fmt(payments.length)} />
        <KpiCard label={<T fr="Taux de succes" en="Success rate" />} value={payments.length > 0 ? `${Math.round(successCount / payments.length * 100)}%` : "—"} />
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 12, position: "relative", maxWidth: 360 }}>
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

      {/* Transactions table */}
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1.3fr 1fr 0.9fr 0.8fr 0.9fr" }}>
            <div><T fr="Reference" en="Reference" /></div>
            <div><T fr="Montant" en="Amount" /></div>
            <div><T fr="Methode" en="Method" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
          </div>
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="row clickable"
              style={{ gridTemplateColumns: "1.3fr 1fr 0.9fr 0.8fr 0.9fr" }}
            >
              <div className="mono" style={{ fontSize: 12 }}>{tx.reference}</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 14 }}>
                {formatCurrency(tx.amount, tx.currency)}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{tx.payment_method || "—"}</div>
              <div>
                <Pill tone={statusTone(tx.status)}>{tx.status}</Pill>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                {fmtDate(tx.created_at)}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14, gridColumn: "1 / -1" }}>
              <T fr="Aucune transaction trouvee" en="No transactions found" />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
