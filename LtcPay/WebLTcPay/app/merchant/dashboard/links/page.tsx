"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF, fmtDate } from "@/lib/format";

/* ── Mock data ─────────────────────────────────── */
const MOCK_LINKS = [
  { id: "lnk_1", name: "Abonnement Premium", slug: "premium-abo", amount: 15000, currency: "XAF", uses: 47, maxUses: null, active: true, created: "2026-05-12T10:30:00Z" },
  { id: "lnk_2", name: "Don libre", slug: "don-libre", amount: null, currency: "XAF", uses: 123, maxUses: null, active: true, created: "2026-04-28T08:00:00Z" },
  { id: "lnk_3", name: "Formation en ligne", slug: "formation-online", amount: 25000, currency: "XAF", uses: 8, maxUses: 50, active: true, created: "2026-05-20T14:00:00Z" },
  { id: "lnk_4", name: "Ticket \u00e9v\u00e9nement", slug: "ticket-event-2026", amount: 5000, currency: "XAF", uses: 200, maxUses: 200, active: false, created: "2026-03-01T09:15:00Z" },
  { id: "lnk_5", name: "Consultation 30min", slug: "consult-30", amount: 10000, currency: "XAF", uses: 34, maxUses: null, active: true, created: "2026-05-25T11:45:00Z" },
];

const TOTAL_COLLECTED = MOCK_LINKS.reduce((a, l) => a + (l.amount ?? 0) * l.uses, 0);

export default function PaymentLinksPage() {
  const { lang } = useLang();
  const [selected, setSelected] = useState(MOCK_LINKS[0]);
  const [copied, setCopied] = useState(false);

  const linkUrl = `https://pay.nkap.io/${selected.slug}`;

  function handleCopy() {
    navigator.clipboard.writeText(linkUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Encaissement" en="Collect" />, <T key="c2" fr="Liens de paiement" en="Payment links" />]}
      title={<T fr="Liens de paiement" en="Payment links" />}
      sub={<T fr="Cr\u00e9ez des liens partageables pour encaisser sans code" en="Create shareable links to collect payments without code" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Nouveau lien" en="New link" />
        </button>
      }
    >
      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="Liens actifs" en="Active links" />} value={String(MOCK_LINKS.filter((l) => l.active).length)} />
        <KpiCard label={<T fr="Total encaiss\u00e9" en="Total collected" />} value={fmtXAF(TOTAL_COLLECTED)} />
        <KpiCard label={<T fr="Utilisations" en="Total uses" />} value={String(MOCK_LINKS.reduce((a, l) => a + l.uses, 0))} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
        {/* Links table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row head" style={{ gridTemplateColumns: "1.5fr 0.8fr 0.6fr 0.5fr 0.7fr" }}>
            <div><T fr="Nom" en="Name" /></div>
            <div><T fr="Montant" en="Amount" /></div>
            <div><T fr="Usages" en="Uses" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Cr\u00e9\u00e9" en="Created" /></div>
          </div>
          <div className="tbl">
            {MOCK_LINKS.map((link) => (
              <div
                key={link.id}
                className="row clickable"
                style={{
                  gridTemplateColumns: "1.5fr 0.8fr 0.6fr 0.5fr 0.7fr",
                  background: selected.id === link.id ? "var(--bg-2)" : undefined,
                  cursor: "pointer",
                }}
                onClick={() => setSelected(link)}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{link.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>/{link.slug}</div>
                </div>
                <div className="display" style={{ fontSize: 14, fontWeight: 500 }}>
                  {link.amount ? fmtXAF(link.amount) : <span style={{ color: "var(--muted)" }}><T fr="Libre" en="Open" /></span>}
                </div>
                <div style={{ fontSize: 13 }}>
                  {link.uses}{link.maxUses ? ` / ${link.maxUses}` : ""}
                </div>
                <div>
                  <Pill tone={link.active ? "success" : "neutral"}>
                    {link.active ? (lang === "en" ? "Active" : "Actif") : (lang === "en" ? "Closed" : "Ferm\u00e9")}
                  </Pill>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                  {fmtDate(link.created)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR / preview panel */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{selected.name}</div>

          {/* QR code placeholder */}
          <div style={{
            width: 180,
            height: 180,
            background: "var(--bg-2)",
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--line)",
          }}>
            <Icon name="qr" size={64} color="var(--muted)" />
          </div>

          <div style={{ width: "100%", display: "flex", gap: 6 }}>
            <input
              readOnly
              value={linkUrl}
              style={{
                flex: 1,
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "var(--mono)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
              <Icon name={copied ? "check" : "copy"} size={13} />
            </button>
          </div>

          <div style={{ width: "100%", borderTop: "1px solid var(--line)", paddingTop: 16, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}><T fr="Montant" en="Amount" /></span>
              <span style={{ fontWeight: 500 }}>{selected.amount ? fmtXAF(selected.amount) : (lang === "en" ? "Open amount" : "Montant libre")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}><T fr="Utilisations" en="Uses" /></span>
              <span>{selected.uses}{selected.maxUses ? ` / ${selected.maxUses}` : ""}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}><T fr="Statut" en="Status" /></span>
              <Pill tone={selected.active ? "success" : "neutral"}>
                {selected.active ? (lang === "en" ? "Active" : "Actif") : (lang === "en" ? "Closed" : "Ferm\u00e9")}
              </Pill>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
              <Icon name="eye" size={13} /> <T fr="Aper\u00e7u" en="Preview" />
            </button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
              <Icon name="download" size={13} /> <T fr="QR" en="QR" />
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
