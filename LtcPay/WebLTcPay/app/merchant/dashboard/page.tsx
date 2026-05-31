"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sparkline } from "@/components/ui/sparkline";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { RevenueChart, StatusDistributionChart } from "@/components/dashboard";
import type { MerchantDashboardStats, BalanceInfo } from "@/types";

export default function MerchantDashboardPage() {
  const [stats, setStats] = useState<MerchantDashboardStats | null>(null);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, b] = await Promise.all([
          merchantDashboardService.getStats(),
          merchantDashboardService.getBalance(),
        ]);
        setStats(s);
        setBalance(b);
      } catch {
        // handled by 401 interceptor
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 256 }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Encaissement" en="Collect" />, <T key="c2" fr="Vue d'ensemble" en="Overview" />]}
      title={<T fr={`Aujourd'hui, vous avez encaissé ${fmtXAF(stats?.total_revenue ?? 0)}`} en={`Today, you collected ${fmtXAF(stats?.total_revenue ?? 0)}`} />}
      sub={<T fr="Solde temps réel" en="Live balance" />}
      actions={<>
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> <T fr="Export" en="Export" /></button>
        <Link href="/merchant/dashboard/payments" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}><Icon name="plus" size={13} color="white" /> <T fr="Voir les paiements" en="View payments" /></Link>
      </>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", marginBottom: 12 }}>
        <KpiCard hero label={<><T fr="Solde disponible" en="Available balance" /> {"·"} XAF</>} value={fmtXAF(balance?.available_balance ?? 0)} />
        <KpiCard label={<T fr="Revenu total" en="Total revenue" />} value={fmtXAF(stats?.total_revenue ?? 0)} />
        <KpiCard label={<T fr="Transactions" en="Transactions" />} value={String(stats?.total_payments ?? 0)} />
        <KpiCard label={<T fr="Taux de réussite" en="Success rate" />} value={`${stats?.success_rate ?? 0}`} unit="%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
        <div className="card">
          <div className="card-head">
            <h3><T fr="Revenus" en="Revenue" /></h3>
          </div>
          <RevenueChart data={stats?.revenue_chart ?? []} />
        </div>
        <div className="card">
          <div className="card-head">
            <h3><T fr="Statuts" en="Status distribution" /></h3>
          </div>
          <StatusDistributionChart data={stats?.status_distribution ?? []} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Transactions récentes" en="Recent transactions" /></h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}><T fr="Mise à jour en temps réel" en="Live updates" /></p>
          </div>
          <Link href="/merchant/dashboard/payments" className="btn btn-link" style={{ textDecoration: "none" }}><T fr="Voir tout" en="View all" /> {"→"}</Link>
        </div>
        {stats?.recent_payments && stats.recent_payments.length > 0 ? (
          <div className="tbl">
            {stats.recent_payments.map((p) => (
              <Link href={`/merchant/dashboard/payments/${p.reference}`} key={p.id} className="row clickable" style={{ gridTemplateColumns: "1.2fr 1fr 0.8fr 1fr", textDecoration: "none", color: "inherit" }}>
                <div>
                  <div className="mono" style={{ fontSize: 12 }}>{p.reference}</div>
                </div>
                <div>
                  <Pill tone={p.status === "completed" ? "success" : p.status === "failed" ? "fail" : p.status === "pending" ? "warn" : "neutral"}>
                    {p.status}
                  </Pill>
                </div>
                <div className="display" style={{ fontWeight: 500, fontSize: 15, textAlign: "right" }}>{formatCurrency(p.amount, p.currency)}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{new Date(p.created_at).toLocaleDateString()}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <T fr="Aucun paiement. Intégrez l'API pour commencer." en="No payments yet. Integrate the API to start accepting payments." />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
