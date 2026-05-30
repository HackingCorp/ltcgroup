"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

const MEMBERS = [
  { name: "Jean-Marc Nguema", email: "jm.nguema@ltcgroup.cm", role: "owner" as const, lastSeen: "En ligne", status: "active" as const },
  { name: "Aline Fotso", email: "a.fotso@ltcgroup.cm", role: "admin" as const, lastSeen: "Il y a 2h", status: "active" as const },
  { name: "Paul Biya Jr", email: "p.biya@ltcgroup.cm", role: "developer" as const, lastSeen: "Il y a 1j", status: "active" as const },
  { name: "Marie Eko", email: "m.eko@ltcgroup.cm", role: "viewer" as const, lastSeen: "Il y a 5j", status: "active" as const },
  { name: "Samuel Ndongo", email: "s.ndongo@ltcgroup.cm", role: "developer" as const, lastSeen: "Jamais", status: "invited" as const },
];

const ROLES = [
  {
    key: "owner",
    fr: "Propri\u00e9taire",
    en: "Owner",
    descFr: "Acc\u00e8s total, gestion de l\u0027\u00e9quipe et facturation",
    descEn: "Full access, team management and billing",
    perms: { dashboard: true, payments: true, apiKeys: true, team: true, billing: true, settings: true },
  },
  {
    key: "admin",
    fr: "Administrateur",
    en: "Admin",
    descFr: "Tout sauf suppression du compte et gestion propri\u00e9taire",
    descEn: "Everything except account deletion and owner management",
    perms: { dashboard: true, payments: true, apiKeys: true, team: true, billing: true, settings: false },
  },
  {
    key: "developer",
    fr: "D\u00e9veloppeur",
    en: "Developer",
    descFr: "Cl\u00e9s API, webhooks, documentation, logs",
    descEn: "API keys, webhooks, documentation, logs",
    perms: { dashboard: true, payments: true, apiKeys: true, team: false, billing: false, settings: false },
  },
  {
    key: "viewer",
    fr: "Lecteur",
    en: "Viewer",
    descFr: "Consultation uniquement, aucune action",
    descEn: "Read-only access, no actions",
    perms: { dashboard: true, payments: true, apiKeys: false, team: false, billing: false, settings: false },
  },
];

const PERM_LABELS: { key: keyof typeof ROLES[0]["perms"]; fr: string; en: string }[] = [
  { key: "dashboard", fr: "Tableau de bord", en: "Dashboard" },
  { key: "payments", fr: "Transactions", en: "Transactions" },
  { key: "apiKeys", fr: "Cl\u00e9s API", en: "API keys" },
  { key: "team", fr: "Gestion \u00e9quipe", en: "Team management" },
  { key: "billing", fr: "Facturation", en: "Billing" },
  { key: "settings", fr: "Param\u00e8tres", en: "Settings" },
];

const roleTone = {
  owner: "info" as const,
  admin: "warn" as const,
  developer: "neutral" as const,
  viewer: "neutral" as const,
};

const roleLabel = {
  owner: { fr: "Propri\u00e9taire", en: "Owner" },
  admin: { fr: "Admin", en: "Admin" },
  developer: { fr: "Dev", en: "Dev" },
  viewer: { fr: "Lecteur", en: "Viewer" },
};

export default function MerchantTeamPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="\u00c9quipe" en="Team" />]}
      title={<T fr="Gestion de l\u0027\u00e9quipe" en="Team management" />}
      sub={<T fr="G\u00e9rez les membres et les r\u00f4les de votre organisation" en="Manage members and roles for your organization" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} /> <T fr="Inviter un membre" en="Invite member" />
        </button>
      }
    >
      {/* Members table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Membres" en="Members" />
            </h3>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {MEMBERS.length} <T fr="membres" en="members" /> {"\u00b7"} {MEMBERS.filter(m => m.status === "invited").length} <T fr="en attente" en="pending" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm"><Icon name="search" size={13} /></button>
            <button className="btn btn-ghost btn-sm"><Icon name="filter" size={13} /></button>
          </div>
        </div>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 60px" }}>
            <span><T fr="Membre" en="Member" /></span>
            <span>Email</span>
            <span><T fr="R\u00f4le" en="Role" /></span>
            <span><T fr="Derni\u00e8re activit\u00e9" en="Last seen" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span />
          </div>
          {MEMBERS.map(m => (
            <div className="row" key={m.email} style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 60px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={m.name} size={30} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{m.email}</div>
              <div>
                <Pill tone={roleTone[m.role]}>
                  <T fr={roleLabel[m.role].fr} en={roleLabel[m.role].en} />
                </Pill>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.lastSeen}</div>
              <div>
                <Pill tone={m.status === "active" ? "success" : "warn"}>
                  {m.status === "active" ? <T fr="actif" en="active" /> : <T fr="invit\u00e9" en="invited" />}
                </Pill>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost btn-sm"><Icon name="more" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles & permissions grid */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
            <T fr="R\u00f4les et permissions" en="Roles & permissions" />
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 500, color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <T fr="Permission" en="Permission" />
                </th>
                {ROLES.map(r => (
                  <th key={r.key} style={{ padding: "10px 16px", textAlign: "center", fontWeight: 500, fontSize: 12 }}>
                    <T fr={r.fr} en={r.en} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_LABELS.map(perm => (
                <tr key={perm.key} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 20px", fontSize: 13 }}>
                    <T fr={perm.fr} en={perm.en} />
                  </td>
                  {ROLES.map(r => (
                    <td key={r.key} style={{ padding: "10px 16px", textAlign: "center" }}>
                      {r.perms[perm.key] ? (
                        <Icon name="check" size={14} color="var(--accent-success)" />
                      ) : (
                        <Icon name="x" size={14} color="var(--line-2)" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
