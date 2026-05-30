"use client";

import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmt, fmtDate } from "@/lib/format";

/* ── Static mock data ── */
const MOCK_TRANSACTIONS = [
  { id: "1", reference: "TXN-20260530-001", merchantName: "Boulangerie Ekoko", amount: 15000, fee: 225, currency: "XAF", method: "Orange Money", status: "completed" as const, created_at: "2026-05-30T09:14:00Z" },
  { id: "2", reference: "TXN-20260530-002", merchantName: "Librairie Nyobe", amount: 8500, fee: 128, currency: "XAF", method: "MTN Money", status: "completed" as const, created_at: "2026-05-30T08:47:00Z" },
  { id: "3", reference: "TXN-20260529-003", merchantName: "Pharmacie Centrale", amount: 42000, fee: 630, currency: "XAF", method: "Orange Money", status: "pending" as const, created_at: "2026-05-29T17:32:00Z" },
  { id: "4", reference: "TXN-20260529-004", merchantName: "Tech Solutions CM", amount: 120000, fee: 1800, currency: "XAF", method: "Carte bancaire", status: "completed" as const, created_at: "2026-05-29T14:05:00Z" },
  { id: "5", reference: "TXN-20260529-005", merchantName: "Resto Le Baobab", amount: 6800, fee: 102, currency: "XAF", method: "MTN Money", status: "failed" as const, created_at: "2026-05-29T12:18:00Z" },
  { id: "6", reference: "TXN-20260528-006", merchantName: "Boutique Mode Afrik", amount: 35000, fee: 525, currency: "XAF", method: "Orange Money", status: "completed" as const, created_at: "2026-05-28T16:55:00Z" },
  { id: "7", reference: "TXN-20260528-007", merchantName: "Salon Beaute Plus", amount: 12000, fee: 180, currency: "XAF", method: "MTN Money", status: "completed" as const, created_at: "2026-05-28T11:40:00Z" },
  { id: "8", reference: "TXN-20260527-008", merchantName: "Agence Voyage Express", amount: 250000, fee: 3750, currency: "XAF", method: "Carte bancaire", status: "pending" as const, created_at: "2026-05-27T10:20:00Z" },
  { id: "9", reference: "TXN-20260527-009", merchantName: "Cyber Cafe Connect", amount: 3500, fee: 53, currency: "XAF", method: "Orange Money", status: "failed" as const, created_at: "2026-05-27T09:05:00Z" },
  { id: "10", reference: "TXN-20260526-010", merchantName: "Epicerie du Coin", amount: 18500, fee: 278, currency: "XAF", method: "MTN Money", status: "completed" as const, created_at: "2026-05-26T15:30:00Z" },
];

function statusTone(s: string): "success" | "fail" | "warn" | "neutral" {
  switch (s) {
    case "completed": return "success";
    case "failed": return "fail";
    case "pending": return "warn";
    default: return "neutral";
  }
}

export default function TransactionsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_TRANSACTIONS;
    const q = search.toLowerCase();
    return MOCK_TRANSACTIONS.filter(
      (t) =>
        t.reference.toLowerCase().includes(q) ||
        t.merchantName.toLowerCase().includes(q)
    );
  }, [search]);

  const totalVolume = MOCK_TRANSACTIONS.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalFees = MOCK_TRANSACTIONS.filter((t) => t.status === "completed").reduce((s, t) => s + t.fee, 0);
  const successCount = MOCK_TRANSACTIONS.filter((t) => t.status === "completed").length;

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
        <KpiCard label={<T fr="Frais collectes" en="Fees collected" />} value={fmtXAF(totalFees)} />
        <KpiCard label={<T fr="Transactions reussies" en="Successful TX" />} value={String(successCount)} />
        <KpiCard label={<T fr="Total transactions" en="Total transactions" />} value={fmt(MOCK_TRANSACTIONS.length)} />
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 12, position: "relative", maxWidth: 360 }}>
        <input
          className="nk-input nk-input-mono"
          placeholder="TXN-xxx, marchand..."
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
          <div className="row head" style={{ gridTemplateColumns: "1.3fr 1.1fr 0.9fr 0.8fr 0.7fr 0.9fr" }}>
            <div><T fr="Reference" en="Reference" /></div>
            <div><T fr="Marchand" en="Merchant" /></div>
            <div><T fr="Montant" en="Amount" /></div>
            <div><T fr="Methode" en="Method" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
          </div>
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="row clickable"
              style={{ gridTemplateColumns: "1.3fr 1.1fr 0.9fr 0.8fr 0.7fr 0.9fr" }}
            >
              <div className="mono" style={{ fontSize: 12 }}>{tx.reference}</div>
              <div style={{ fontSize: 13 }}>{tx.merchantName}</div>
              <div className="display" style={{ fontWeight: 500, fontSize: 14 }}>
                {fmtXAF(tx.amount)}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{tx.method}</div>
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
