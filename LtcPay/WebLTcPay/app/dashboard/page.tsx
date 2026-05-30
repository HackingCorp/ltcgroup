"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmt, fmtDate } from "@/lib/format";
import { dashboardService } from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart, StatusDistributionChart } from "@/components/dashboard";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

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
        <T key="c2" fr="Vue d'ensemble" en="Overview" />,
      ]}
      title={<T fr="Tableau de bord" en="Dashboard" />}
      sub={<T fr="Vue globale de l'activite de la plateforme" en="Platform-wide activity overview" />}
      actions={
        <button className="btn btn-ghost btn-sm">
          <Icon name="download" size={13} />
          <T fr="Exporter" en="Export" />
        </button>
      }
    >
      {/* KPI row */}
      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", marginBottom: 12 }}
      >
        <KpiCard
          hero
          label={<><T fr="Volume total (GMV)" en="Total volume (GMV)" /> {"\u00b7"} XAF</>}
          value={fmtXAF(stats?.total_revenue ?? 0)}
        />
        <KpiCard
          label={<T fr="Marchands actifs" en="Active merchants" />}
          value={fmt(stats?.total_payments ?? 0)}
        />
        <KpiCard
          label={<T fr="TX / 24h" en="TX / 24h" />}
          value={fmt(stats?.total_transactions ?? 0)}
        />
        <KpiCard
          label={<T fr="Taux de succes" en="Success rate" />}
          value={`${(stats?.success_rate ?? 0).toFixed(1)}`}
          unit="%"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 12, marginBottom: 12 }}>
        <div className="nk-card">
          <div className="card-head">
            <h3><T fr="Revenus" en="Revenue" /></h3>
          </div>
          <RevenueChart data={stats?.revenue_chart ?? []} />
        </div>
        <div className="nk-card">
          <div className="card-head">
            <h3><T fr="Statuts" en="Status distribution" /></h3>
          </div>
          <StatusDistributionChart data={stats?.status_distribution ?? []} />
        </div>
      </div>

      {/* Recent payments table */}
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Activite recente" en="Recent activity" />
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              <T fr="Derniers paiements traites sur la plateforme" en="Latest payments processed on the platform" />
            </p>
          </div>
        </div>

        {stats?.recent_payments && stats.recent_payments.length > 0 ? (
          <div className="tbl">
            <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 1fr" }}>
              <div><T fr="Reference" en="Reference" /></div>
              <div><T fr="Montant" en="Amount" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
            </div>
            {stats.recent_payments.map((payment) => (
              <div
                key={payment.id}
                className="row"
                style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 1fr" }}
              >
                <div className="mono" style={{ fontSize: 12 }}>{payment.reference}</div>
                <div className="display" style={{ fontWeight: 500, fontSize: 14 }}>
                  {formatCurrency(payment.amount, payment.currency)}
                </div>
                <div>
                  <Pill tone={
                    payment.status === "completed" ? "success"
                    : payment.status === "failed" ? "fail"
                    : payment.status === "pending" ? "warn"
                    : "neutral"
                  }>
                    {payment.status}
                  </Pill>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                  {fmtDate(payment.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="receipt" size={32} color="var(--muted-2)" />
            <p style={{ marginTop: 8 }}>
              <T fr="Aucun paiement pour le moment" en="No payments yet" />
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
