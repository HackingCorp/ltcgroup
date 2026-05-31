"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF, fmtDate } from "@/lib/format";

/* ── Mock data ─────────────────────────────────── */
const MOCK_REFUNDS = [
  { id: "ref_1", reference: "RFD-20260528-001", paymentRef: "PAY-20260525-042", customer: "alice@example.com", amount: 15000, currency: "XAF", status: "completed", method: "orange", reason: "Produit défectueux", created: "2026-05-28T09:30:00Z" },
  { id: "ref_2", reference: "RFD-20260527-003", paymentRef: "PAY-20260520-018", customer: "+237 6 99 00 11 22", amount: 8500, currency: "XAF", status: "processing", method: "mtn", reason: "Erreur de montant", created: "2026-05-27T14:15:00Z" },
  { id: "ref_3", reference: "RFD-20260526-007", paymentRef: "PAY-20260522-091", customer: "bob@shop.cm", amount: 25000, currency: "XAF", status: "completed", method: "orange", reason: "Service non rendu", created: "2026-05-26T11:00:00Z" },
  { id: "ref_4", reference: "RFD-20260524-002", paymentRef: "PAY-20260519-055", customer: "+237 6 77 88 99 00", amount: 5000, currency: "XAF", status: "failed", method: "mtn", reason: "Numéro invalide", created: "2026-05-24T16:45:00Z" },
  { id: "ref_5", reference: "RFD-20260523-009", paymentRef: "PAY-20260518-033", customer: "claire@web.cm", amount: 12000, currency: "XAF", status: "completed", method: "wave", reason: "Annulation commande", created: "2026-05-23T08:20:00Z" },
];

const TOTAL_REFUNDED = MOCK_REFUNDS.filter((r) => r.status === "completed").reduce((a, r) => a + r.amount, 0);
const PROCESSING_COUNT = MOCK_REFUNDS.filter((r) => r.status === "processing").length;

function refundTone(s: string): "success" | "warn" | "fail" | "info" | "neutral" {
  if (s === "completed") return "success";
  if (s === "processing") return "info";
  if (s === "failed") return "fail";
  return "neutral";
}

function refundLabel(s: string, lang: string): string {
  if (s === "completed") return lang === "en" ? "Refunded" : "Remboursé";
  if (s === "processing") return lang === "en" ? "Processing" : "En cours";
  if (s === "failed") return lang === "en" ? "Failed" : "Échoué";
  return s;
}

export default function RefundsPage() {
  const { lang } = useLang();
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? MOCK_REFUNDS.filter((r) => r.status === filter)
    : MOCK_REFUNDS;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Remboursements" en="Refunds" />]}
      title={<T fr="Remboursements" en="Refunds" />}
      sub={<T fr="Suivez les remboursements de vos clients" en="Track your customer refunds" />}
    >
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="Remboursé ce mois" en="Refunded this month" />} value={fmtXAF(TOTAL_REFUNDED)} />
        <KpiCard label={<T fr="Taux de remboursement" en="Refund rate" />} value="2.4" unit="%" />
        <KpiCard label={<T fr="En traitement" en="Processing" />} value={String(PROCESSING_COUNT)} />
        <KpiCard label={<T fr="Délai moyen" en="Avg time" />} value="1.2" unit={lang === "en" ? "days" : "jours"} />
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          { key: "", fr: "Tous", en: "All" },
          { key: "completed", fr: "Remboursé", en: "Refunded" },
          { key: "processing", fr: "En cours", en: "Processing" },
          { key: "failed", fr: "Échoué", en: "Failed" },
        ].map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            style={{ fontSize: 12 }}
            onClick={() => setFilter(f.key)}
          >
            {lang === "en" ? f.en : f.fr}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12 }}>
        {/* Refund table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row head" style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 0.6fr 0.8fr 0.7fr" }}>
            <div><T fr="Référence" en="Reference" /></div>
            <div><T fr="Client" en="Customer" /></div>
            <div><T fr="Méthode" en="Method" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
            <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
          </div>
          <div className="tbl">
            {filtered.map((r) => (
              <div key={r.id} className="row" style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 0.6fr 0.8fr 0.7fr" }}>
                <div>
                  <div className="mono" style={{ fontSize: 12 }}>{r.reference}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{r.paymentRef}</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{r.customer}</div>
                <div><MethodChip kind={r.method} /></div>
                <div><Pill tone={refundTone(r.status)}>{refundLabel(r.status, lang)}</Pill></div>
                <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{fmtXAF(r.amount)}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{fmtDate(r.created)}</div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun remboursement trouvé." en="No refunds found." />
            </div>
          )}
        </div>

        {/* Refund policy info card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name="shield" size={18} color="var(--primary)" />
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16, margin: 0 }}>
                <T fr="Politique de remboursement" en="Refund policy" />
              </h3>
            </div>
            <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon name="check" size={14} color="var(--success, #22c55e)" />
                <span><T fr="Remboursement possible dans les 30 jours suivant le paiement" en="Refunds accepted within 30 days of payment" /></span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon name="check" size={14} color="var(--success, #22c55e)" />
                <span><T fr="Le client est notifié par SMS/email" en="Customer is notified by SMS/email" /></span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon name="check" size={14} color="var(--success, #22c55e)" />
                <span><T fr="Délai de traitement : 1-3 jours ouvrables" en="Processing time: 1-3 business days" /></span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon name="info" size={14} color="var(--muted)" />
                <span style={{ color: "var(--muted)" }}><T fr="Les frais de transaction ne sont pas remboursés" en="Transaction fees are not refunded" /></span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name="alert" size={18} color="var(--warn, #f59e0b)" />
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16, margin: 0 }}>
                <T fr="Besoin d'aide ?" en="Need help?" />
              </h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
              <T
                fr="Pour les litiges ou remboursements exceptionnels, contactez notre équipe support via le chat ou par email."
                en="For disputes or exceptional refunds, contact our support team via chat or email."
              />
            </p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
              <Icon name="message" size={13} /> <T fr="Contacter le support" en="Contact support" />
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
