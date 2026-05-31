"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF } from "@/lib/format";
import { adminDashboardService } from "@/services/admin-dashboard.service";

/* ── helpers ──────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "il y a 1 min";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  const diffW = Math.floor(diffD / 7);
  return `il y a ${diffW} sem`;
}

function deadlineLabel(deadlineAt: string | null, status: string): string {
  if (status === "won" || status === "lost") return "---";
  if (!deadlineAt) return "---";
  const now = new Date();
  const dl = new Date(deadlineAt);
  const diffMs = dl.getTime() - now.getTime();
  if (diffMs <= 0) return "expiree";
  const diffD = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${diffD} j`;
}

/* ── page ──────────────────────────────────────────────────── */

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [disputesRes, statsRes] = await Promise.all([
          adminDashboardService.getDisputes({ page: 1, page_size: 20 }),
          adminDashboardService.getDisputeStats(),
        ]);
        setDisputes(disputesRes.items || []);
        setStats(statsRes);
      } catch (err) {
        console.error("Failed to load disputes data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Litiges" en="Disputes" />]}
        title={<T fr="Litiges & remboursements" en="Disputes & refunds" />}
        sub=""
      >
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
      </PageWrapper>
    );
  }

  const activeCount = stats?.active_count ?? 0;
  const winRate = stats?.win_rate ?? 0;
  const avgDays = stats?.avg_resolution_days ?? 0;
  const exposure = stats?.total_exposure ?? 0;

  // Count priority / near-deadline disputes
  const priorityCount = disputes.filter((d) => d.priority).length;
  const nearDeadlineCount = disputes.filter((d) => {
    if (!d.deadline_at || d.status === "won" || d.status === "lost") return false;
    const diffMs = new Date(d.deadline_at).getTime() - Date.now();
    return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Litiges" en="Disputes" />]}
      title={<T fr="Litiges & remboursements" en="Disputes & refunds" />}
      sub={<T fr={`${activeCount} actifs · ${priorityCount} prioritaire · ${nearDeadlineCount} delais < 24h`} en={`${activeCount} active · ${priorityCount} priority · ${nearDeadlineCount} deadlines < 24h`} />}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard label={<T fr="Litiges actifs" en="Active disputes" />} value={String(activeCount)} after={<Pill tone="warn">deadline</Pill>} />
        <KpiCard label={<T fr="Taux de gain" en="Win rate" />} value={String(Math.round(winRate))} unit="%" />
        <KpiCard label={<T fr="Delai moyen" en="Avg resolution" />} value={avgDays.toFixed(1).replace(".", ",")} unit="j" />
        <KpiCard label={<T fr="Exposition" en="Exposure" />} value={exposure >= 1000000 ? (exposure / 1000000).toFixed(1).replace(".", ",") : String(Math.round(exposure))} unit={exposure >= 1000000 ? "M F" : "F"} />
      </div>

      {/* Disputes table */}
      <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1.4fr 1fr 0.9fr 1.4fr 0.8fr 0.6fr 24px" }}>
            <span>ID</span>
            <span><T fr="Marchand" en="Merchant" /></span>
            <span><T fr="Client" en="Customer" /></span>
            <span style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></span>
            <span><T fr="Motif" en="Reason" /></span>
            <span><T fr="Delai" en="Deadline" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span></span>
          </div>
          {disputes.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun litige trouve" en="No disputes found" />
            </div>
          )}
          {disputes.map((d: any) => {
            const dl = deadlineLabel(d.deadline_at, d.status);
            return (
              <div
                className="row clickable"
                key={d.id}
                style={{
                  gridTemplateColumns: "1fr 1.4fr 1fr 0.9fr 1.4fr 0.8fr 0.6fr 24px",
                  background: d.priority === "high" || d.priority === true ? "var(--rose-soft)" : undefined,
                }}
              >
                <div>
                  <div className="mono" style={{ fontSize: 12 }}>{d.reference || d.id}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{d.payment_id || "---"}</div>
                </div>
                <div style={{ fontSize: 13 }}>{d.merchant_id}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.customer_name || d.customer_contact || "---"}</div>
                <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{fmtXAF(d.amount)}</div>
                <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{d.reason}</div>
                <div className="mono" style={{
                  fontSize: 11,
                  color: dl === "expiree" ? "var(--rose)"
                    : dl.includes("1 j") || dl.includes("2 j") ? "var(--warn)"
                    : "var(--muted)",
                }}>{dl}</div>
                <Pill tone={d.status === "won" ? "success" : d.status === "lost" ? "fail" : d.status === "escalated" ? "fail" : "warn"}>{d.status}</Pill>
                <Icon name="chevR" size={14} color="var(--muted)" />
              </div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
