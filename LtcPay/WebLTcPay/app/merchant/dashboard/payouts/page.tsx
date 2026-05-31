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
const MOCK_PAYOUTS = [
  { id: "po_1", reference: "PO-20260528-001", amount: 450000, fee: 2500, currency: "XAF", status: "completed", method: "orange", destination: "+237 6 99 00 11 22", created: "2026-05-28T06:00:00Z", arrivedAt: "2026-05-28T06:05:00Z" },
  { id: "po_2", reference: "PO-20260521-003", amount: 320000, fee: 2500, currency: "XAF", status: "completed", method: "mtn", destination: "+237 6 77 88 99 00", created: "2026-05-21T06:00:00Z", arrivedAt: "2026-05-21T06:04:00Z" },
  { id: "po_3", reference: "PO-20260514-002", amount: 180000, fee: 2500, currency: "XAF", status: "completed", method: "orange", destination: "+237 6 99 00 11 22", created: "2026-05-14T06:00:00Z", arrivedAt: "2026-05-14T06:03:00Z" },
  { id: "po_4", reference: "PO-20260507-001", amount: 560000, fee: 2500, currency: "XAF", status: "completed", method: "mtn", destination: "+237 6 77 88 99 00", created: "2026-05-07T06:00:00Z", arrivedAt: "2026-05-07T06:06:00Z" },
  { id: "po_5", reference: "PO-20260430-004", amount: 275000, fee: 2500, currency: "XAF", status: "completed", method: "orange", destination: "+237 6 99 00 11 22", created: "2026-04-30T06:00:00Z", arrivedAt: "2026-04-30T06:02:00Z" },
];

const NEXT_PAYOUT = {
  amount: 387500,
  currency: "XAF",
  scheduledDate: "2026-06-04",
  destination: "+237 6 99 00 11 22",
  method: "orange",
};

const TOTAL_THIS_MONTH = MOCK_PAYOUTS.filter((p) => p.created.startsWith("2026-05")).reduce((a, p) => a + p.amount, 0);

export default function PayoutsPage() {
  const { lang } = useLang();

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Règlements" en="Payouts" />]}
      title={<T fr="Règlements" en="Payouts" />}
      sub={<T fr="Vos virements hebdomadaires automatiques" en="Your automatic weekly payouts" />}
    >
      {/* Dark hero card: next payout */}
      <div
        className="card hero"
        style={{
          background: "var(--ink)",
          color: "white",
          padding: "28px 24px",
          borderRadius: 14,
          marginBottom: 12,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative orb */}
        <div style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "var(--lime, #a3e635)",
          opacity: 0.12,
          filter: "blur(40px)",
        }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Icon name="bolt" size={16} color="var(--lime, #a3e635)" />
            <span style={{ fontSize: 13, opacity: 0.7 }}><T fr="Prochain règlement" en="Next payout" /></span>
            <Pill tone="live"><T fr="Programmé" en="Scheduled" /></Pill>
          </div>

          <div className="display" style={{ fontSize: 42, fontWeight: 600, letterSpacing: -1, marginBottom: 6 }}>
            {fmtXAF(NEXT_PAYOUT.amount)}
          </div>

          <div style={{ display: "flex", gap: 20, fontSize: 13, opacity: 0.6, flexWrap: "wrap" }}>
            <span><Icon name="clock" size={12} color="currentColor" /> {NEXT_PAYOUT.scheduledDate}</span>
            <span><Icon name="phone" size={12} color="currentColor" /> {NEXT_PAYOUT.destination}</span>
            <span><MethodChip kind={NEXT_PAYOUT.method} /></span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="Réglé ce mois" en="Paid out this month" />} value={fmtXAF(TOTAL_THIS_MONTH)} />
        <KpiCard label={<T fr="Fréquence" en="Frequency" />} value={lang === "en" ? "Weekly" : "Hebdo"} />
        <KpiCard label={<T fr="Frais par virement" en="Fee per payout" />} value={fmtXAF(2500)} />
      </div>

      {/* Payout history */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Historique des règlements" en="Payout history" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Les 5 derniers virements" en="Last 5 payouts" />
            </p>
          </div>
          <button className="btn btn-ghost btn-sm">
            <Icon name="download" size={13} /> <T fr="Export" en="Export" />
          </button>
        </div>

        <div className="row head" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.6fr 0.6fr 0.8fr 0.8fr" }}>
          <div><T fr="Référence" en="Reference" /></div>
          <div><T fr="Destination" en="Destination" /></div>
          <div><T fr="Méthode" en="Method" /></div>
          <div><T fr="Statut" en="Status" /></div>
          <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
          <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
        </div>
        <div className="tbl">
          {MOCK_PAYOUTS.map((po) => (
            <div key={po.id} className="row" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.6fr 0.6fr 0.8fr 0.8fr" }}>
              <div>
                <div className="mono" style={{ fontSize: 12 }}>{po.reference}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{po.destination}</div>
              <div><MethodChip kind={po.method} /></div>
              <div>
                <Pill tone={po.status === "completed" ? "success" : po.status === "processing" ? "info" : "warn"}>
                  {po.status === "completed"
                    ? (lang === "en" ? "Sent" : "Envoyé")
                    : po.status === "processing"
                    ? (lang === "en" ? "Processing" : "En cours")
                    : (lang === "en" ? "Pending" : "En attente")
                  }
                </Pill>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="display" style={{ fontWeight: 500, fontSize: 14 }}>{fmtXAF(po.amount)}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{lang === "en" ? "Fee" : "Frais"}: {fmtXAF(po.fee)}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                {fmtDate(po.created)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info note */}
      <div className="card" style={{ marginTop: 12, padding: 18, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon name="info" size={18} color="var(--primary)" />
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
          <T
            fr="Les règlements sont effectués automatiquement chaque mercredi. Le montant minimum est de 10 000 F CFA. Pour modifier votre compte de réception, rendez-vous dans Paramètres."
            en="Payouts are processed automatically every Wednesday. The minimum amount is 10,000 XAF. To change your payout account, go to Settings."
          />
        </div>
      </div>
    </PageWrapper>
  );
}
