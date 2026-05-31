"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T, useLang } from "@/lib/i18n";
import { fmtXAF, fmtDate } from "@/lib/format";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";

export default function PaymentLinksPage() {
  const { lang } = useLang();
  const [links, setLinks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await merchantDashboardService.getLinks({ page: 1, page_size: 50 });
        const items = res.items || [];
        setLinks(items);
        if (items.length > 0) setSelected(items[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Encaissement" en="Collect" />, <T key="c2" fr="Liens de paiement" en="Payment links" />]} title={<T fr="Liens de paiement" en="Payment links" />} sub={<T fr="Creez des liens partageables pour encaisser sans code" en="Create shareable links to collect payments without code" />}><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  const activeCount = links.filter((l) => l.active).length;
  const totalCollected = links.reduce((a, l) => a + (l.amount ?? 0) * (l.uses ?? 0), 0);
  const totalUses = links.reduce((a, l) => a + (l.uses ?? 0), 0);

  const linkUrl = selected ? `https://pay.nkap.io/${selected.slug}` : "";

  function handleCopy() {
    navigator.clipboard.writeText(linkUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Encaissement" en="Collect" />, <T key="c2" fr="Liens de paiement" en="Payment links" />]}
      title={<T fr="Liens de paiement" en="Payment links" />}
      sub={<T fr="Creez des liens partageables pour encaisser sans code" en="Create shareable links to collect payments without code" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Nouveau lien" en="New link" />
        </button>
      }
    >
      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 12 }}>
        <KpiCard label={<T fr="Liens actifs" en="Active links" />} value={String(activeCount)} />
        <KpiCard label={<T fr="Total encaisse" en="Total collected" />} value={fmtXAF(totalCollected)} />
        <KpiCard label={<T fr="Utilisations" en="Total uses" />} value={String(totalUses)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
        {/* Links table */}
        <div className="nk-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row head" style={{ gridTemplateColumns: "1.5fr 0.8fr 0.6fr 0.5fr 0.7fr" }}>
            <div><T fr="Nom" en="Name" /></div>
            <div><T fr="Montant" en="Amount" /></div>
            <div><T fr="Usages" en="Uses" /></div>
            <div><T fr="Statut" en="Status" /></div>
            <div style={{ textAlign: "right" }}><T fr="Cree" en="Created" /></div>
          </div>
          <div className="tbl">
            {links.map((link) => (
              <div
                key={link.id}
                className="row clickable"
                style={{
                  gridTemplateColumns: "1.5fr 0.8fr 0.6fr 0.5fr 0.7fr",
                  background: selected?.id === link.id ? "var(--bg-2)" : undefined,
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
                  {link.uses ?? 0}{link.max_uses ? ` / ${link.max_uses}` : ""}
                </div>
                <div>
                  <Pill tone={link.active ? "success" : "neutral"}>
                    {link.active ? (lang === "en" ? "Active" : "Actif") : (lang === "en" ? "Closed" : "Ferme")}
                  </Pill>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                  {fmtDate(link.created_at)}
                </div>
              </div>
            ))}
          </div>
          {links.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun lien de paiement." en="No payment links." />
            </div>
          )}
        </div>

        {/* QR / preview panel */}
        {selected && (
          <div className="nk-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 24 }}>
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
                <span>{selected.uses ?? 0}{selected.max_uses ? ` / ${selected.max_uses}` : ""}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}><T fr="Statut" en="Status" /></span>
                <Pill tone={selected.active ? "success" : "neutral"}>
                  {selected.active ? (lang === "en" ? "Active" : "Actif") : (lang === "en" ? "Closed" : "Ferme")}
                </Pill>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                <Icon name="eye" size={13} /> <T fr="Apercu" en="Preview" />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                <Icon name="download" size={13} /> <T fr="QR" en="QR" />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
