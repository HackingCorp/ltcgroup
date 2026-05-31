"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { MethodChip } from "@/components/ui/method-chip";
import { T } from "@/lib/i18n";
import { adminDashboardService } from "@/services/admin-dashboard.service";

/* ── page ──────────────────────────────────────────────────── */

export default function FeesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rulesRes, overridesRes, statsRes] = await Promise.all([
          adminDashboardService.getFeeRules(),
          adminDashboardService.getFeeOverrides(),
          adminDashboardService.getFeeStats(),
        ]);
        setRules(rulesRes.items || []);
        setOverrides(overridesRes.items || []);
        setStats(statsRes);
      } catch (err) {
        console.error("Failed to load fees data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Pricing & frais" en="Pricing & fees" />]}
        title={<T fr="Modulation tarifaire" en="Fee modulation" />}
        sub=""
      >
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
      </PageWrapper>
    );
  }

  // Group rules by payment method to show rates per plan
  const methodMap: Record<string, any> = {};
  for (const rule of rules) {
    const key = rule.payment_method || "unknown";
    if (!methodMap[key]) {
      methodMap[key] = { method: key, name: key, s: "---", g: "---", sc: "---", t: rule.settle_delay || "T+1" };
    }
    const rateStr = rule.rate != null ? `${rule.rate}%` : "---";
    const plan = (rule.plan || "").toLowerCase();
    if (plan === "starter") methodMap[key].s = rateStr;
    else if (plan === "growth") methodMap[key].g = rateStr;
    else if (plan === "scale") methodMap[key].sc = rateStr;
    if (rule.settle_delay) methodMap[key].t = rule.settle_delay;
  }
  const standardRules = Object.values(methodMap);

  const starterCount = stats?.starter_count ?? 0;
  const growthCount = stats?.growth_count ?? 0;
  const scaleCount = stats?.scale_count ?? 0;
  const customCount = stats?.custom_count ?? 0;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Operations" en="Operations" />, <T key="c2" fr="Pricing & frais" en="Pricing & fees" />]}
      title={<T fr="Modulation tarifaire" en="Fee modulation" />}
      sub={<T fr="Tarifs par marchand, par methode, par pays. Modifications appliquees au prochain cycle." en="Fees per merchant, per method, per country. Edits applied next cycle." />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Nouvelle regle" en="New rule" />
        </button>
      }
    >
      {/* KPIs per plan tier */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <KpiCard label="Starter" value="2,5" unit="%" after={<Pill tone="neutral" plain>{starterCount}</Pill>} />
        <KpiCard label="Growth" value="1,5" unit="%" after={<Pill tone="info" plain>{growthCount}</Pill>} />
        <KpiCard label="Scale" value="0,9" unit="%" after={<Pill tone="success" plain>{scaleCount}</Pill>} />
        <KpiCard label={<T fr="Tarifs custom" en="Custom rates" />} value={String(customCount)} after={<Pill tone="warn" plain>actif</Pill>} />
      </div>

      {/* Standard rules per plan */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Regles standard par plan" en="Standard rules per plan" /></h3>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.8fr" }}>
            <span><T fr="Methode" en="Method" /></span>
            <span style={{ textAlign: "right" }}>Starter</span>
            <span style={{ textAlign: "right" }}>Growth</span>
            <span style={{ textAlign: "right" }}>Scale</span>
            <span><T fr="Delai reglement" en="Settle delay" /></span>
            <span style={{ textAlign: "right" }}><T fr="Action" en="Action" /></span>
          </div>
          {standardRules.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucune regle configuree" en="No rules configured" />
            </div>
          )}
          {standardRules.map((r: any, i: number) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.8fr" }}>
              <div><MethodChip kind={r.method} label={r.name} /></div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>{r.s}</div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>{r.g}</div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>{r.sc}</div>
              <div className="mono" style={{ fontSize: 12 }}>{r.t}</div>
              <div style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm"><T fr="Modifier" en="Edit" /></button></div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom rates (per-merchant override) */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}><T fr="Tarifs custom (override par marchand)" en="Custom rates (per-merchant override)" /></h3>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 0.8fr" }}>
            <span><T fr="Marchand" en="Merchant" /></span>
            <span><T fr="Methode" en="Method" /></span>
            <span style={{ textAlign: "right" }}><T fr="Tarif standard" en="Standard fee" /></span>
            <span style={{ textAlign: "right" }}><T fr="Tarif negocie" en="Negotiated fee" /></span>
            <span><T fr="Valide jusqu'au" en="Expires" /></span>
            <span style={{ textAlign: "right" }}><T fr="Action" en="Action" /></span>
          </div>
          {overrides.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun tarif negocie" en="No custom rates" />
            </div>
          )}
          {overrides.map((r: any, i: number) => (
            <div key={i} className="row" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 0.8fr" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.merchant_id}</div>
              <div><MethodChip kind={r.payment_method} /></div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>{r.standard_rate != null ? `${r.standard_rate}%` : "---"}</div>
              <div className="mono" style={{ fontSize: 12, textAlign: "right", color: "var(--success)", fontWeight: 600 }}>{r.custom_rate != null ? `${r.custom_rate}%` : "---"}</div>
              <div className="mono" style={{ fontSize: 11 }}>{r.expires_at ? new Date(r.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "---"}</div>
              <div style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm"><T fr="Modifier" en="Edit" /></button></div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
