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

function refundTone(s: string): "success" | "warn" | "fail" | "info" | "neutral" {
  if (s === "completed") return "success";
  if (s === "processing") return "info";
  if (s === "failed") return "fail";
  return "neutral";
}

function refundLabel(s: string, lang: string): string {
  if (s === "completed") return lang === "en" ? "Refunded" : "Rembourse";
  if (s === "processing") return lang === "en" ? "Processing" : "En cours";
  if (s === "failed") return lang === "en" ? "Failed" : "Echoue";
  return s;
}

export default function RefundsPage() {
  const { lang } = useLang();
  const [filter, setFilter] = useState("");
  const [refunds, setRefunds] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [refundsRes, statsRes] = await Promise.all([
          merchantDashboardService.getRefunds({ page: 1, page_size: 50 }),
          merchantDashboardService.getRefundStats(),
        ]);
        setRefunds(refundsRes.items || []);
        setStats(statsRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Remboursements" en="Refunds" />]} title={<T fr="Remboursements" en="Refunds" />} sub={<T fr="Suivez les remboursements de vos clients" en="Track your customer refunds" />}><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  const filtered = filter
    ? refunds.filter((r) => r.status?.toLowerCase() === filter)
    : refunds;

  const totalRefunded = stats?.total_refunded ?? 0;
  const refundRate = stats?.refund_rate ?? 0;
  const processingCount = stats?.processing_count ?? 0;
  const avgHours = stats?.avg_processing_hours ?? 0;
  const avgDays = (avgHours / 24).toFixed(1);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Finance" en="Finance" />, <T key="c2" fr="Remboursements" en="Refunds" />]}
      title={<T fr="Remboursements" en="Refunds" />}
      sub={<T fr="Suivez les remboursements de vos clients" en="Track your customer refunds" />}
    >
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="Rembourse ce mois" en="Refunded this month" />} value={fmtXAF(totalRefunded)} />
        <KpiCard label={<T fr="Taux de remboursement" en="Refund rate" />} value={String(refundRate)} unit="%" />
        <KpiCard label={<T fr="En traitement" en="Processing" />} value={String(processingCount)} />
        <KpiCard label={<T fr="Delai moyen" en="Avg time" />} value={avgDays} unit={lang === "en" ? "days" : "jours"} />
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          { key: "", fr: "Tous", en: "All" },
          { key: "completed", fr: "Rembourse", en: "Refunded" },
          { key: "processing", fr: "En cours", en: "Processing" },
          { key: "failed", fr: "Echoue", en: "Failed" },
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
        <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row head" style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 0.6fr 0.8fr 0.7fr" }}>
            <div><T fr="Reference" en="Reference" /></div>
            <div><T fr="Client" en="Customer" /></div>
            <div><T fr="Methode" en="Method" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
            <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
          </div>
          <div className="tbl">
            {filtered.map((r) => (
              <div key={r.id} className="row" style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 0.6fr 0.8fr 0.7fr" }}>
                <div>
                  <div className="mono" style={{ fontSize: 12 }}>{r.reference}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{r.payment_id || ""}</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{r.customer_contact || ""}</div>
                <div><MethodChip kind={r.operator || ""} /></div>
                <div><Pill tone={refundTone(r.status?.toLowerCase())}>{refundLabel(r.status?.toLowerCase(), lang)}</Pill></div>
                <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{fmtXAF(r.amount)}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{fmtDate(r.created_at)}</div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun remboursement trouve." en="No refunds found." />
            </div>
          )}
        </div>

        {/* Refund policy info card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="nk-card" style={{ padding: 20 }}>
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
                <span><T fr="Le client est notifie par SMS/email" en="Customer is notified by SMS/email" /></span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon name="check" size={14} color="var(--success, #22c55e)" />
                <span><T fr="Delai de traitement : 1-3 jours ouvrables" en="Processing time: 1-3 business days" /></span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon name="info" size={14} color="var(--muted)" />
                <span style={{ color: "var(--muted)" }}><T fr="Les frais de transaction ne sont pas rembourses" en="Transaction fees are not refunded" /></span>
              </div>
            </div>
          </div>

          <div className="nk-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name="alert" size={18} color="var(--warn, #f59e0b)" />
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16, margin: 0 }}>
                <T fr="Besoin d'aide ?" en="Need help?" />
              </h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
              <T
                fr="Pour les litiges ou remboursements exceptionnels, contactez notre equipe support via le chat ou par email."
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
