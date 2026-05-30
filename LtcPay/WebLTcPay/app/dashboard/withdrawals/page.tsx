"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { fmtXAF, fmtDate } from "@/lib/format";
import { withdrawalsService } from "@/services/withdrawals.service";
import type { Withdrawal, WithdrawalListResponse } from "@/types";

/* ── helpers ───────────────────────────────────────────────── */

function statusTone(s: string): "success" | "warn" | "fail" | "info" | "neutral" {
  if (s === "COMPLETED") return "success";
  if (s === "PENDING") return "warn";
  if (s === "APPROVED" || s === "PROCESSING") return "info";
  if (s === "REJECTED" || s === "FAILED") return "fail";
  return "neutral";
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED"];

const STATUS_FILTERS: { key: string; fr: string; en: string }[] = [
  { key: "",           fr: "Tous",        en: "All" },
  { key: "PENDING",    fr: "En attente",  en: "Pending" },
  { key: "APPROVED",   fr: "Approuv\u00e9",   en: "Approved" },
  { key: "REJECTED",   fr: "Rejet\u00e9",     en: "Rejected" },
  { key: "PROCESSING", fr: "En cours",    en: "Processing" },
  { key: "COMPLETED",  fr: "Termin\u00e9",    en: "Completed" },
  { key: "FAILED",     fr: "\u00c9chou\u00e9",     en: "Failed" },
];

/* ── page ──────────────────────────────────────────────────── */

export default function AdminWithdrawalsPage() {
  const [data, setData] = useState<WithdrawalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await withdrawalsService.listAll({
        status: statusFilter || undefined,
        page,
        page_size: 20,
      });
      setData(result);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [page, statusFilter]);

  const handleAction = async (id: string, action: "approve" | "reject" | "complete") => {
    const note = action === "reject" ? prompt("Rejection reason (optional):") || undefined : undefined;
    setActionLoading(id);
    try {
      if (action === "approve") await withdrawalsService.approve(id, note);
      else if (action === "reject") await withdrawalsService.reject(id, note);
      else await withdrawalsService.complete(id, note);
      toast.success(`Withdrawal ${action}d successfully`);
      loadData();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || `${action} failed`
          : `${action} failed`;
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Plateforme" en="Platform" />, <T key="c2" fr="Retraits" en="Withdrawals" />]}
      title={<T fr="Demandes de retrait" en="Withdrawal Requests" />}
      sub={<T fr={`${totalCount} demande(s) de retrait`} en={`${totalCount} withdrawal request(s)`} />}
      actions={
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <Icon name="refresh" size={13} /> <T fr="Actualiser" en="Refresh" />
        </button>
      }
    >
      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => { setStatusFilter(sf.key); setPage(1); }}
            className={statusFilter === sf.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            style={{ fontSize: 12 }}
          >
            <T fr={sf.fr} en={sf.en} />
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
            <div style={{ width: 28, height: 28, border: "2px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : data && data.withdrawals.length > 0 ? (
          <>
            <div className="row head" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.2fr 0.7fr 0.8fr 1fr" }}>
              <div><T fr="R\u00e9f\u00e9rence" en="Reference" /></div>
              <div style={{ textAlign: "right" }}><T fr="Montant" en="Amount" /></div>
              <div><T fr="M\u00e9thode" en="Method" /></div>
              <div><T fr="Destination" en="Destination" /></div>
              <div><T fr="Statut" en="Status" /></div>
              <div style={{ textAlign: "right" }}><T fr="Date" en="Date" /></div>
              <div style={{ textAlign: "right" }}><T fr="Actions" en="Actions" /></div>
            </div>
            <div className="tbl">
              {data.withdrawals.map((w) => (
                <div key={w.id} className="row" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.2fr 0.7fr 0.8fr 1fr" }}>
                  <div className="mono" style={{ fontSize: 12 }}>{w.reference}</div>
                  <div style={{ textAlign: "right", fontWeight: 500 }}>{fmtXAF(w.amount)}</div>
                  <div style={{ fontSize: 13 }}>
                    {w.method === "MOBILE_MONEY"
                      ? <T fr="Mobile Money" en="Mobile Money" />
                      : <T fr="Virement bancaire" en="Bank Transfer" />
                    }
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {w.method === "MOBILE_MONEY"
                      ? `${w.mobile_money_operator} ${w.mobile_money_number}`
                      : `${w.bank_name} - ${w.bank_account_number}`
                    }
                  </div>
                  <div><Pill tone={statusTone(w.status)}>{w.status}</Pill></div>
                  <div style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>
                    {fmtDate(w.created_at)}
                  </div>
                  <div style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {w.status === "PENDING" && (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: "var(--success)" }}
                          onClick={() => handleAction(w.id, "approve")}
                          disabled={actionLoading === w.id}
                        >
                          <Icon name="check" size={12} color="var(--success)" />
                          <T fr="Approuver" en="Approve" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: "var(--rose)" }}
                          onClick={() => handleAction(w.id, "reject")}
                          disabled={actionLoading === w.id}
                        >
                          <Icon name="x" size={12} color="var(--rose)" />
                          <T fr="Rejeter" en="Reject" />
                        </button>
                      </>
                    )}
                    {w.status === "APPROVED" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, color: "var(--primary)" }}
                        onClick={() => handleAction(w.id, "complete")}
                        disabled={actionLoading === w.id}
                      >
                        <Icon name="check" size={12} />
                        <T fr="Compl\u00e9ter" en="Complete" />
                      </button>
                    )}
                    {!["PENDING", "APPROVED"].includes(w.status) && (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>{"\u2014"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                <T
                  fr={`Page ${page} sur ${totalPages} (${totalCount} r\u00e9sultats)`}
                  en={`Page ${page} of ${totalPages} (${totalCount} results)`}
                />
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <Icon name="chevL" size={13} /> <T fr="Pr\u00e9c\u00e9dent" en="Previous" />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <T fr="Suivant" en="Next" /> <Icon name="chevR" size={13} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="wallet" size={32} color="var(--muted)" />
            <p style={{ marginTop: 12 }}><T fr="Aucune demande de retrait trouv\u00e9e." en="No withdrawal requests found." /></p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
