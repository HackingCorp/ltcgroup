"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF, fmtDate } from "@/lib/format";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";

export default function PayoutsPage() {
  const { lang } = useLang();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [withdrawalsRes, balanceRes] = await Promise.all([
          merchantDashboardService.getWithdrawals({ page: 1, page_size: 5 }),
          merchantDashboardService.getBalance(),
        ]);
        setPayouts(withdrawalsRes.items || []);
        setBalance(balanceRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Reglements" en="Payouts" />]} title={<T fr="Reglements" en="Payouts" />} sub={<T fr="Vos virements hebdomadaires automatiques" en="Your automatic weekly payouts" />}><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  const nextPayoutAmount = balance?.next_payout_amount ?? 0;
  const nextPayoutDate = balance?.next_payout_date ?? "";
  const totalThisMonth = payouts.reduce((a, p) => a + (p.amount ?? 0), 0);
  const avgFee = payouts.length > 0 ? payouts.reduce((a, p) => a + (p.fee ?? 0), 0) / payouts.length : 0;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Reglements" en="Payouts" />]}
      title={<T fr="Reglements" en="Payouts" />}
      sub={<T fr="Vos virements hebdomadaires automatiques" en="Your automatic weekly payouts" />}
    >
      {/* Dark hero card: next payout */}
      <div
        className="nk-card hero"
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
            <span style={{ fontSize: 13, opacity: 0.7 }}><T fr="Prochain reglement" en="Next payout" /></span>
            <Pill tone="live"><T fr="Programme" en="Scheduled" /></Pill>
          </div>

          <div className="display" style={{ fontSize: 42, fontWeight: 600, letterSpacing: -1, marginBottom: 6 }}>
            {fmtXAF(nextPayoutAmount)}
          </div>

          <div style={{ display: "flex", gap: 20, fontSize: 13, opacity: 0.6, flexWrap: "wrap" }}>
            <span><Icon name="clock" size={12} color="currentColor" /> {nextPayoutDate}</span>
            {payouts.length > 0 && payouts[0].destination && (
              <span><Icon name="phone" size={12} color="currentColor" /> {payouts[0].destination}</span>
            )}
            {payouts.length > 0 && payouts[0].payment_mode && (
              <span><MethodChip kind={payouts[0].payment_mode} /></span>
            )}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="Regle ce mois" en="Paid out this month" />} value={fmtXAF(totalThisMonth)} />
        <KpiCard label={<T fr="Frequence" en="Frequency" />} value={lang === "en" ? "Weekly" : "Hebdo"} />
        <KpiCard label={<T fr="Frais par virement" en="Fee per payout" />} value={fmtXAF(Math.round(avgFee))} />
      </div>

      {/* Payout history */}
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Historique des reglements" en="Payout history" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr={`Les ${payouts.length} derniers virements`} en={`Last ${payouts.length} payouts`} />
            </p>
          </div>
          <button className="btn btn-ghost btn-sm">
            <Icon name="download" size={13} /> <T fr="Export" en="Export" />
          </button>
        </div>

        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.6fr 0.6fr 0.8fr 0.8fr" }}>
            <div><T fr="Reference" en="Reference" /></div>
            <div><T fr="Destination" en="Destination" /></div>
            <div><T fr="Methode" en="Method" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
            <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
          </div>
          {payouts.map((po) => (
            <div key={po.id} className="row" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.6fr 0.6fr 0.8fr 0.8fr" }}>
              <div>
                <div className="mono" style={{ fontSize: 12 }}>{po.reference}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{po.destination || ""}</div>
              <div><MethodChip kind={po.payment_mode || ""} /></div>
              <div>
                <Pill tone={po.status?.toLowerCase() === "completed" ? "success" : po.status?.toLowerCase() === "processing" ? "info" : "warn"}>
                  {(po.status || "").toLowerCase()}
                </Pill>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="display" style={{ fontWeight: 500, fontSize: 14 }}>{fmtXAF(po.amount)}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{lang === "en" ? "Fee" : "Frais"}: {fmtXAF(po.fee ?? 0)}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                {fmtDate(po.created_at)}
              </div>
            </div>
          ))}
          {payouts.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun reglement." en="No payouts." />
            </div>
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="nk-card" style={{ marginTop: 12, padding: 18, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon name="info" size={18} color="var(--primary)" />
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
          <T
            fr="Les reglements sont effectues automatiquement chaque mercredi. Le montant minimum est de 10 000 F CFA. Pour modifier votre compte de reception, rendez-vous dans Parametres."
            en="Payouts are processed automatically every Wednesday. The minimum amount is 10,000 XAF. To change your payout account, go to Settings."
          />
        </div>
      </div>
    </PageWrapper>
  );
}
