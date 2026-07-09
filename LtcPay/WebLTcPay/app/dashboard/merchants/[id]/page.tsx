"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { MethodChip } from "@/components/ui/method-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmtDate, fmtCompact } from "@/lib/format";
import { merchantsService } from "@/services/merchants.service";
import { countriesService, type Country, type MerchantCountryInfo } from "@/services/countries.service";
import type {
  MerchantBalanceInfo,
  MerchantPaymentItem,
  MerchantWithdrawalItem,
  PaginatedItems,
} from "@/services/merchants.service";
import type { Merchant, CountryBalanceInfo } from "@/types";
import { formatCurrency } from "@/lib/utils";

/* ── helpers ───────────────────────────────────────────────── */

type Tab = "payments" | "withdrawals";
type AdminAction = null | "take-rate" | "payout" | "kyc" | "regen-keys" | "suspend";

function paymentStatusTone(s: string): "success" | "warn" | "fail" | "neutral" {
  const upper = s.toUpperCase();
  if (upper === "COMPLETED") return "success";
  if (upper === "PENDING" || upper === "PROCESSING") return "warn";
  if (upper === "FAILED") return "fail";
  return "neutral";
}

function withdrawalStatusTone(s: string): "success" | "warn" | "fail" | "info" | "neutral" {
  if (s === "COMPLETED") return "success";
  if (s === "PENDING") return "warn";
  if (s === "APPROVED" || s === "PROCESSING") return "info";
  if (s === "REJECTED" || s === "FAILED") return "fail";
  return "neutral";
}

const PAYMENT_STATUSES = ["", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "EXPIRED", "CANCELLED"];
const WITHDRAWAL_STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED"];

/* ── page ──────────────────────────────────────────────────── */

export default function MerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [balance, setBalance] = useState<MerchantBalanceInfo | null>(null);
  const [countryBalances, setCountryBalances] = useState<CountryBalanceInfo[]>([]);
  const [tab, setTab] = useState<Tab>("payments");
  const [payments, setPayments] = useState<PaginatedItems<MerchantPaymentItem> | null>(null);
  const [withdrawals, setWithdrawals] = useState<PaginatedItems<MerchantWithdrawalItem> | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsStatus, setPaymentsStatus] = useState("");
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [withdrawalsStatus, setWithdrawalsStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [merchantCountries, setMerchantCountries] = useState<MerchantCountryInfo[]>([]);
  const [adminAction, setAdminAction] = useState<AdminAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newFeeRate, setNewFeeRate] = useState("");
  const [newFeeBearer, setNewFeeBearer] = useState("MERCHANT");
  const [regenResult, setRegenResult] = useState<{ api_key_live?: string; api_secret?: string; webhook_secret?: string } | null>(null);

  const loadMerchantCountries = () => {
    if (!merchantId) return;
    Promise.all([
      countriesService.list().catch(() => []),
      countriesService.listMerchantCountries(merchantId).catch(() => []),
    ]).then(([all, mc]) => {
      setAllCountries(all.filter((c) => c.is_active));
      setMerchantCountries(mc);
    });
  };

  useEffect(() => {
    if (!merchantId) return;
    setLoading(true);
    Promise.all([
      merchantsService.get(merchantId),
      merchantsService.getBalance(merchantId),
      merchantsService.getBalanceByCountry(merchantId).catch(() => null),
    ])
      .then(([m, b, bc]) => {
        setMerchant(m);
        setBalance(b);
        if (bc) setCountryBalances(bc.by_country);
      })
      .catch(() => setError("Failed to load merchant details"))
      .finally(() => setLoading(false));
    loadMerchantCountries();
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId) return;
    merchantsService
      .getPayments(merchantId, paymentsPage, 20, paymentsStatus || undefined)
      .then(setPayments)
      .catch(() => {});
  }, [merchantId, paymentsPage, paymentsStatus]);

  useEffect(() => {
    if (!merchantId) return;
    merchantsService
      .getWithdrawals(merchantId, withdrawalsPage, 20, withdrawalsStatus || undefined)
      .then(setWithdrawals)
      .catch(() => {});
  }, [merchantId, withdrawalsPage, withdrawalsStatus]);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 256 }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div style={{ padding: 80, textAlign: "center", color: "var(--rose)" }}>
        {error || "Merchant not found"}
      </div>
    );
  }

  const handleUpdateFeeConfig = async () => {
    const rate = parseFloat(newFeeRate);
    if (isNaN(rate) || rate < 1.75 || rate > 20) return;
    setActionLoading(true);
    try {
      const updated = await merchantsService.update(merchantId, {
        fee_rate: rate,
        fee_bearer: newFeeBearer as "MERCHANT" | "CLIENT",
      });
      setMerchant(updated);
      setAdminAction(null);
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleRegenKeys = async () => {
    setActionLoading(true);
    try {
      const creds = await merchantsService.regenerateApiSecret(merchantId);
      setRegenResult({ api_key_live: creds.api_key_live, api_secret: creds.api_secret, webhook_secret: creds.webhook_secret });
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleToggleSuspend = async () => {
    setActionLoading(true);
    try {
      const updated = await merchantsService.update(merchantId, { is_active: !merchant.is_active });
      setMerchant(updated);
      setAdminAction(null);
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const feeRate = merchant.fee_rate ?? 1.75;
  const gmv30 = balance?.total_earned ?? 5240000;
  const txCount = balance?.total_payments ?? 1247;
  const feeStr = `${feeRate}%`;
  const ltcRevenue = gmv30 * (feeRate / 100);

  return (
    <PageWrapper
      crumb={[
        <Link key="c1" href="/dashboard/merchants" style={{ cursor: "pointer", color: "var(--primary)", textDecoration: "none" }}><T fr="Marchands" en="Merchants" /></Link>,
        <span key="c2">{merchant.id}</span>,
      ]}
      title={merchant.name}
      sub={<>
        <Pill tone={merchant.is_active ? "success" : "fail"}>{merchant.is_active ? "live" : "suspended"}</Pill>
        <span style={{ marginLeft: 8 }}>{merchant.id} · CM · {feeStr}</span>
      </>}
      actions={<>
        <button className="btn btn-ghost btn-sm"><Icon name="external" size={13} /> <T fr="Voir comme marchand" en="View as merchant" /></button>
        <button className="btn btn-ghost btn-sm"><Icon name="message" size={13} /> <T fr="Contacter" en="Contact" /></button>
        <button className="btn btn-ghost btn-sm" style={{ color: merchant.is_active ? "var(--rose)" : "var(--success)", borderColor: merchant.is_active ? "var(--rose)" : "var(--success)" }} onClick={() => setAdminAction("suspend")}><T fr={merchant.is_active ? "Suspendre" : "Reactiver"} en={merchant.is_active ? "Suspend" : "Reactivate"} /></button>
      </>}
    >
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="GMV 30 jours" en="30d GMV" />} value={fmtCompact(gmv30)} unit="F" delta="+18%" />
        <KpiCard label="Transactions" value={String(txCount)} delta="+12%" />
        <KpiCard label={<T fr="Take rate effectif" en="Effective take rate" />} value={feeStr} />
        <KpiCard label={<T fr="Revenu LTC" en="LTC revenue" />} value={fmtCompact(ltcRevenue)} unit="F" />
      </div>

      {/* Per-country balance breakdown */}
      {countryBalances.length > 1 && (
        <div className="nk-card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h3><T fr="Soldes par pays" en="Balance by country" /></h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(countryBalances.length, 4)}, 1fr)`, gap: 12 }}>
            {countryBalances.map((cb) => (
              <div key={cb.country_code} style={{ padding: 12, background: "var(--bg-2)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{cb.country_name}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{cb.country_code} · {cb.currency}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase" }}><T fr="Revenus" en="Earned" /></div>
                    <div style={{ fontWeight: 500 }}>{formatCurrency(cb.total_earned, cb.currency)}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase" }}><T fr="Frais" en="Fees" /></div>
                    <div style={{ fontWeight: 500 }}>{formatCurrency(cb.total_fees, cb.currency)}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase" }}><T fr="Retire" en="Withdrawn" /></div>
                    <div style={{ fontWeight: 500 }}>{formatCurrency(cb.total_withdrawn, cb.currency)}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase" }}><T fr="Disponible" en="Available" /></div>
                    <div style={{ fontWeight: 600, color: "var(--success)" }}>{formatCurrency(cb.available_balance, cb.currency)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout: left (legal info + activity) / right (risk + admin) */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          {/* Legal info card */}
          <div className="nk-card" style={{ marginBottom: 12 }}>
            <div className="card-head">
              <h3><T fr="Informations legales" en="Legal information" /></h3>
              <Pill tone="success"><T fr="KYC valide" en="KYC verified" /></Pill>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13 }}>
              {[
                ["Raison sociale", merchant.name],
                ["RCCM", "RC/YDE/2024/B/0421"],
                ["NIU", "M0824100021T"],
                ["Pays", "\u{1F1E8}\u{1F1F2} Cameroun"],
                ["Representant legal", "Marie Kamga"],
                ["Adresse", "Yaounde, BP 1234"],
                ["Email", merchant.email],
                ["Telephone", merchant.phone || "+237 222 22 11 00"],
              ].map((r, i) => (
                <div key={i}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{r[0]}</div>
                  <div style={{ marginTop: 4 }}>{r[1]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity card */}
          <div className="nk-card" style={{ marginBottom: 12 }}>
            <div className="card-head">
              <h3><T fr="Activite recente" en="Recent activity" /></h3>
              <button className="btn btn-link"><T fr="Voir tout" en="View all" /> {"→"}</button>
            </div>
            <div className="tbl">
              {(payments?.items ?? []).slice(0, 5).map((tx) => (
                <div className="row" key={tx.reference} style={{ gridTemplateColumns: "1fr 1.4fr 0.7fr 0.8fr 1fr 24px", paddingTop: 10, paddingBottom: 10 }}>
                  <div className="mono" style={{ fontSize: 12 }}>{tx.reference}</div>
                  <div style={{ fontSize: 13 }}>{tx.customer_name || tx.customer_phone || "—"}</div>
                  <div><MethodChip kind={(tx.operator || tx.payment_method || "").toLowerCase()} /></div>
                  <Pill tone={paymentStatusTone(tx.status)}>{tx.status === "COMPLETED" ? "paid" : tx.status.toLowerCase()}</Pill>
                  <div className="display" style={{ fontWeight: 500, fontSize: 14, textAlign: "right" }}>{fmtXAF(tx.amount)}</div>
                  <Icon name="chevR" size={13} color="var(--muted)" />
                </div>
              ))}
              {(!payments || payments.items.length === 0) && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  <T fr="Aucune activite recente" en="No recent activity" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* Risk score card */}
          <div className="nk-card" style={{ marginBottom: 12 }}>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 14px" }}><T fr="Score de risque" en="Risk score" /></h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <span className="display" style={{ fontWeight: 500, fontSize: 48, letterSpacing: "-0.025em", lineHeight: 1, color: "var(--success)" }}>92</span>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>/ 100 · <T fr="Faible" en="Low" /></span>
            </div>
            <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: "92%", height: "100%", background: "linear-gradient(to right, var(--rose), var(--warn), var(--success))" }} />
            </div>
            {[
              { name: <T fr="Chargebacks" en="Chargebacks" />, v: "0,02%", tone: "success" },
              { name: <T fr="Taux echec" en="Failure rate" />, v: "5,2%", tone: "success" },
              { name: <T fr="Volume coherent" en="Volume coherence" />, v: "✓", tone: "success" },
              { name: <T fr="Pattern IP" en="IP pattern" />, v: <T fr="Normal" en="Normal" />, tone: "success" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <span style={{ color: "var(--muted)" }}>{s.name}</span>
                <span className="mono" style={{ color: "var(--success)" }}>{s.v}</span>
              </div>
            ))}
          </div>

          {/* Allowed countries card */}
          <MerchantCountriesCard
            merchantId={merchantId}
            allCountries={allCountries}
            merchantCountries={merchantCountries}
            onChanged={loadMerchantCountries}
          />

          {/* Admin actions card */}
          <div className="nk-card">
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 14px" }}><T fr="Actions admin" en="Admin actions" /></h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => { setNewFeeRate(String(feeRate)); setNewFeeBearer(merchant.fee_bearer ?? "MERCHANT"); setAdminAction("take-rate"); }}><Icon name="card" size={13} /> <T fr="Modifier le take rate" en="Edit take rate" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => setAdminAction("payout")}><Icon name="bank" size={13} /> <T fr="Compte de reglement" en="Payout account" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => setAdminAction("kyc")}><Icon name="shield" size={13} /> <T fr="Forcer re-KYC" en="Force re-KYC" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => { setRegenResult(null); setAdminAction("regen-keys"); }}><Icon name="refresh" size={13} /> <T fr="Regenerer les cles" en="Regenerate keys" /></button>
              <button className="btn btn-ghost" style={{ justifyContent: "flex-start", color: "var(--rose)", borderColor: "var(--rose-soft)" }} onClick={() => setAdminAction("suspend")}><Icon name="pause" size={13} color="var(--rose)" /> <T fr={merchant.is_active ? "Suspendre compte" : "Reactiver compte"} en={merchant.is_active ? "Suspend account" : "Reactivate account"} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab switches */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", borderRadius: 8, padding: 4, marginBottom: 16 }}>
        <button
          onClick={() => setTab("payments")}
          className={tab === "payments" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={{ flex: 1 }}
        >
          <Icon name="arrowDown" size={13} color={tab === "payments" ? "white" : "var(--success)"} />
          <T fr="Paiements (Entrees)" en="Payments (Inflows)" />
          {payments && <Pill tone="neutral">{payments.total}</Pill>}
        </button>
        <button
          onClick={() => setTab("withdrawals")}
          className={tab === "withdrawals" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={{ flex: 1 }}
        >
          <Icon name="arrowUp" size={13} color={tab === "withdrawals" ? "white" : "var(--rose)"} />
          <T fr="Retraits (Sorties)" en="Withdrawals (Outflows)" />
          {withdrawals && <Pill tone="neutral">{withdrawals.total}</Pill>}
        </button>
      </div>

      {/* Tab content */}
      {tab === "payments" ? (
        <PaymentsTable
          data={payments}
          page={paymentsPage}
          onPageChange={setPaymentsPage}
          statusFilter={paymentsStatus}
          onStatusFilter={(s) => { setPaymentsStatus(s); setPaymentsPage(1); }}
        />
      ) : (
        <WithdrawalsTable
          data={withdrawals}
          page={withdrawalsPage}
          onPageChange={setWithdrawalsPage}
          statusFilter={withdrawalsStatus}
          onStatusFilter={(s) => { setWithdrawalsStatus(s); setWithdrawalsPage(1); }}
        />
      )}
      {/* Admin action modals */}
      {adminAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "grid", placeItems: "center" }} onClick={() => { if (!actionLoading) { setAdminAction(null); setRegenResult(null); } }}>
          <div className="nk-card" style={{ width: 420, maxWidth: "90vw", padding: 24 }} onClick={(e) => e.stopPropagation()}>

            {adminAction === "take-rate" && (<>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 16px" }}><T fr="Frais de transaction" en="Transaction fees" /></h3>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}><T fr="Take rate (%)" en="Take rate (%)" /></label>
              <input
                type="number" step="0.25" min="1.75" max="20" value={newFeeRate}
                onChange={(e) => setNewFeeRate(e.target.value)}
                className="input" style={{ width: "100%", marginBottom: 6 }}
              />
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 16px" }}><T fr="Min: 1.75% — Max: 20%" en="Min: 1.75% — Max: 20%" /></p>

              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 8 }}><T fr="Porteur des frais" en="Fee bearer" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { v: "MERCHANT", labelFr: "Marchand", labelEn: "Merchant", subFr: "Frais deduits du solde marchand", subEn: "Fees deducted from merchant balance" },
                  { v: "CLIENT", labelFr: "Client", labelEn: "Customer", subFr: "Frais ajoutes au montant client", subEn: "Fees added to customer amount" },
                ].map(o => (
                  <div
                    key={o.v}
                    onClick={() => setNewFeeBearer(o.v)}
                    style={{
                      padding: 10,
                      border: "1px solid " + (newFeeBearer === o.v ? "var(--ink)" : "var(--line)"),
                      borderRadius: 8,
                      background: newFeeBearer === o.v ? "var(--bg-2)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 13 }}><T fr={o.labelFr} en={o.labelEn} /></div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}><T fr={o.subFr} en={o.subEn} /></div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setAdminAction(null)} disabled={actionLoading}><T fr="Annuler" en="Cancel" /></button>
                <button className="btn btn-primary" onClick={handleUpdateFeeConfig} disabled={actionLoading}>
                  {actionLoading ? "..." : <T fr="Enregistrer" en="Save" />}
                </button>
              </div>
            </>)}

            {adminAction === "payout" && (<>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 16px" }}><T fr="Compte de reglement" en="Payout account" /></h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
                <T fr="Cette fonctionnalite sera disponible prochainement. Les reglements sont actuellement geres manuellement." en="This feature will be available soon. Payouts are currently handled manually." />
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setAdminAction(null)}><T fr="Fermer" en="Close" /></button>
              </div>
            </>)}

            {adminAction === "kyc" && (<>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 16px" }}><T fr="Forcer re-KYC" en="Force re-KYC" /></h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
                <T fr="Cette fonctionnalite sera disponible prochainement. Le KYC est actuellement gere manuellement." en="This feature will be available soon. KYC is currently handled manually." />
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setAdminAction(null)}><T fr="Fermer" en="Close" /></button>
              </div>
            </>)}

            {adminAction === "regen-keys" && (<>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 16px" }}><T fr="Regenerer les cles" en="Regenerate keys" /></h3>
              {!regenResult ? (<>
                <p style={{ fontSize: 13, color: "var(--rose)", margin: "0 0 16px" }}>
                  <T fr="Attention : cette action va generer un nouveau secret API. L'ancien secret sera invalide immediatement." en="Warning: this will generate a new API secret. The old secret will be invalidated immediately." />
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setAdminAction(null)} disabled={actionLoading}><T fr="Annuler" en="Cancel" /></button>
                  <button className="btn btn-primary" style={{ background: "var(--rose)" }} onClick={handleRegenKeys} disabled={actionLoading}>
                    {actionLoading ? "..." : <T fr="Regenerer" en="Regenerate" />}
                  </button>
                </div>
              </>) : (<>
                <p style={{ fontSize: 13, color: "var(--success)", margin: "0 0 12px" }}>
                  <T fr="Nouvelles cles generees avec succes. Copiez-les maintenant, elles ne seront plus affichees." en="New keys generated. Copy them now — they won't be shown again." />
                </p>
                <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: 12, fontSize: 12, fontFamily: "var(--mono)", display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, wordBreak: "break-all" }}>
                  <div><span style={{ color: "var(--muted)" }}>API Key:</span> {regenResult.api_key_live}</div>
                  <div><span style={{ color: "var(--muted)" }}>API Secret:</span> {regenResult.api_secret}</div>
                  <div><span style={{ color: "var(--muted)" }}>Webhook Secret:</span> {regenResult.webhook_secret}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={() => { setAdminAction(null); setRegenResult(null); }}><T fr="Fermer" en="Close" /></button>
                </div>
              </>)}
            </>)}

            {adminAction === "suspend" && (<>
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 16px" }}>
                {merchant.is_active
                  ? <T fr="Suspendre ce marchand ?" en="Suspend this merchant?" />
                  : <T fr="Reactiver ce marchand ?" en="Reactivate this merchant?" />
                }
              </h3>
              <p style={{ fontSize: 13, color: merchant.is_active ? "var(--rose)" : "var(--muted)", margin: "0 0 16px" }}>
                {merchant.is_active
                  ? <T fr="Le marchand ne pourra plus accepter de paiements tant que son compte sera suspendu." en="The merchant will not be able to accept payments while suspended." />
                  : <T fr="Le marchand pourra a nouveau accepter des paiements." en="The merchant will be able to accept payments again." />
                }
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setAdminAction(null)} disabled={actionLoading}><T fr="Annuler" en="Cancel" /></button>
                <button
                  className="btn btn-primary"
                  style={merchant.is_active ? { background: "var(--rose)" } : {}}
                  onClick={handleToggleSuspend}
                  disabled={actionLoading}
                >
                  {actionLoading ? "..." : merchant.is_active ? <T fr="Suspendre" en="Suspend" /> : <T fr="Reactiver" en="Reactivate" />}
                </button>
              </div>
            </>)}

          </div>
        </div>
      )}
    </PageWrapper>
  );
}

/* ── Status filter pills ──────────────────────────────────── */

function StatusFilterRow({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
      {options.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={value === s ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={{ fontSize: 11 }}
        >
          {s || <T fr="Tous" en="All" />}
        </button>
      ))}
    </div>
  );
}

/* ── Payments table ───────────────────────────────────────── */

function PaymentsTable({
  data,
  page,
  onPageChange,
  statusFilter,
  onStatusFilter,
}: {
  data: PaginatedItems<MerchantPaymentItem> | null;
  page: number;
  onPageChange: (p: number) => void;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
}) {
  if (!data) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
        <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.per_page);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
        <StatusFilterRow value={statusFilter} onChange={onStatusFilter} options={PAYMENT_STATUSES} />
      </div>
      {data.items.length > 0 ? (
        <>
          <div className="tbl">
            <div className="row head" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 0.7fr 0.8fr 0.7fr 0.8fr" }}>
              <div><T fr="Reference" en="Reference" /></div>
              <div><T fr="Client" en="Customer" /></div>
              <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
              <div style={{ textAlign: "right" }}><T fr="Frais" en="Fees" /></div>
              <div><T fr="Operateur" en="Operator" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
            </div>
            {data.items.map((p) => (
              <div key={p.id} className="row" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 0.7fr 0.8fr 0.7fr 0.8fr" }}>
                <div>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{p.reference}</div>
                  {p.description && <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</div>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {p.customer_name && <div>{p.customer_name}</div>}
                  {p.customer_phone && <div>{p.customer_phone}</div>}
                </div>
                <div style={{ textAlign: "right", fontWeight: 500, color: "var(--success)" }}>+{formatCurrency(p.amount, p.currency)}</div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{p.fee > 0 ? formatCurrency(p.fee, p.currency) : "—"}</div>
                <div>
                  <Pill tone={
                    p.operator === "MTN" ? "warn" :
                    p.operator === "ORANGE" ? "info" :
                    "neutral"
                  }>
                    {p.operator || p.payment_method || "—"}
                  </Pill>
                </div>
                <div><Pill tone={paymentStatusTone(p.status)}>{p.status}</Pill></div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{fmtDate(p.created_at)}</div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationRow page={page} totalPages={totalPages} total={data.total} onPageChange={onPageChange} />
          )}
        </>
      ) : (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          <Icon name="receipt" size={28} color="var(--muted)" />
          <p style={{ marginTop: 8 }}><T fr="Aucun paiement" en="No payments" /></p>
        </div>
      )}
    </div>
  );
}

/* ── Withdrawals table ────────────────────────────────────── */

function WithdrawalsTable({
  data,
  page,
  onPageChange,
  statusFilter,
  onStatusFilter,
}: {
  data: PaginatedItems<MerchantWithdrawalItem> | null;
  page: number;
  onPageChange: (p: number) => void;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
}) {
  if (!data) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
        <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.per_page);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
        <StatusFilterRow value={statusFilter} onChange={onStatusFilter} options={WITHDRAWAL_STATUSES} />
      </div>
      {data.items.length > 0 ? (
        <>
          <div className="tbl">
            <div className="row head" style={{ gridTemplateColumns: "1.2fr 0.8fr 1.2fr 0.8fr 0.7fr 0.8fr" }}>
              <div><T fr="Reference" en="Reference" /></div>
              <div><T fr="Methode" en="Method" /></div>
              <div><T fr="Destination" en="Destination" /></div>
              <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
            </div>
            {data.items.map((w) => (
              <div key={w.id} className="row" style={{ gridTemplateColumns: "1.2fr 0.8fr 1.2fr 0.8fr 0.7fr 0.8fr" }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{w.reference}</div>
                <div style={{ fontSize: 12 }}>
                  {w.method === "MOBILE_MONEY" ? "Mobile Money" : <T fr="Virement" en="Transfer" />}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {w.method === "MOBILE_MONEY"
                    ? `${w.mobile_money_operator} ${w.mobile_money_number}`
                    : <><div>{w.bank_name}</div><div>{w.bank_account_number}</div></>
                  }
                </div>
                <div style={{ textAlign: "right", fontWeight: 500, color: "var(--rose)" }}>-{formatCurrency(w.amount, w.currency)}</div>
                <div><Pill tone={withdrawalStatusTone(w.status)}>{w.status}</Pill></div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{fmtDate(w.created_at)}</div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationRow page={page} totalPages={totalPages} total={data.total} onPageChange={onPageChange} />
          )}
        </>
      ) : (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          <Icon name="wallet" size={28} color="var(--muted)" />
          <p style={{ marginTop: 8 }}><T fr="Aucun retrait" en="No withdrawals" /></p>
        </div>
      )}
    </div>
  );
}

/* ── Merchant countries card ──────────────────────────────── */

function MerchantCountriesCard({
  merchantId,
  allCountries,
  merchantCountries,
  onChanged,
}: {
  merchantId: string;
  allCountries: Country[];
  merchantCountries: MerchantCountryInfo[];
  onChanged: () => void;
}) {
  const [toggling, setToggling] = useState<string | null>(null);

  // Build a map of restricted countries
  const restrictionMap = new Map(merchantCountries.map((mc) => [mc.country_code, mc.is_active]));
  const hasRestrictions = merchantCountries.length > 0;

  const handleToggle = async (countryCode: string, currentlyActive: boolean) => {
    setToggling(countryCode);
    try {
      if (currentlyActive && hasRestrictions) {
        // If it's the last active restriction, remove it (= allow all)
        const activeCount = merchantCountries.filter((mc) => mc.is_active).length;
        if (activeCount <= 1 && restrictionMap.get(countryCode)) {
          await countriesService.removeMerchantCountry(merchantId, countryCode);
        } else {
          await countriesService.setMerchantCountry(merchantId, countryCode, false);
        }
      } else {
        await countriesService.setMerchantCountry(merchantId, countryCode, !currentlyActive);
      }
      onChanged();
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="nk-card" style={{ marginBottom: 12 }}>
      <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 6px" }}>
        <T fr="Pays autorises" en="Allowed countries" />
      </h3>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 12px" }}>
        {hasRestrictions
          ? <T fr="Seuls les pays actives ci-dessous sont autorises." en="Only the enabled countries below are allowed." />
          : <T fr="Aucune restriction — tous les pays actifs sont autorises." en="No restrictions — all active countries allowed." />
        }
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {allCountries.map((c) => {
          const isRestricted = restrictionMap.has(c.code);
          const isActive = !hasRestrictions || (isRestricted && restrictionMap.get(c.code) === true);
          const isLoading = toggling === c.code;

          return (
            <div
              key={c.code}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: 6,
                background: isActive ? "var(--bg-2)" : "transparent",
                border: "1px solid var(--line)",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{c.flag_emoji || "🏳️"}</span>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{c.currency}</span>
              </div>
              <button
                onClick={() => handleToggle(c.code, isActive)}
                disabled={isLoading}
                className="btn btn-ghost btn-sm"
                style={{ padding: "2px 8px", fontSize: 11, color: isActive ? "var(--success)" : "var(--muted)" }}
              >
                {isActive ? "ON" : "OFF"}
              </button>
            </div>
          );
        })}
        {allCountries.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", padding: 8 }}>
            <T fr="Aucun pays configure" en="No countries configured" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pagination ───────────────────────────────────────────── */

function PaginationRow({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>
        <T fr={`${total} resultat(s)`} en={`${total} result(s)`} />
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-ghost btn-sm"
          style={{ opacity: page <= 1 ? 0.3 : 1 }}
        >
          <Icon name="chevL" size={13} />
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-ghost btn-sm"
          style={{ opacity: page >= totalPages ? 0.3 : 1 }}
        >
          <Icon name="chevR" size={13} />
        </button>
      </div>
    </div>
  );
}
