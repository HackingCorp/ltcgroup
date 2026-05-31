"use client";

import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

const MEMBERS = [
  { name: "Marie Kamga", email: "marie@mamishop.cm", role: "Owner" as const, status: "active" as const, lastSeen: "il y a 3 min" },
  { name: "S\u00e9bastien Eyene", email: "sebastien@mamishop.cm", role: "Admin" as const, status: "active" as const, lastSeen: "il y a 2 h" },
  { name: "A\u00efcha Bello", email: "aicha@mamishop.cm", role: "Finance" as const, status: "active" as const, lastSeen: "hier" },
  { name: "Patrick Onana", email: "patrick@mamishop.cm", role: "Developer" as const, status: "active" as const, lastSeen: "il y a 4 jours" },
  { name: "Olive Mvondo", email: "olive@mamishop.cm", role: "Support" as const, status: "pending" as const, lastSeen: "\u2014" },
];

const ROLES = [
  { name: "Owner", count: 1, perms: ["read", "write", "billing", "users", "delete"] },
  { name: "Admin", count: 1, perms: ["read", "write", "users", "api"] },
  { name: "Finance", count: 1, perms: ["read", "payouts", "billing"] },
  { name: "Developer", count: 1, perms: ["read", "api"] },
  { name: "Support", count: 1, perms: ["read", "refunds"] },
  { name: "Viewer", count: 0, perms: ["read"] },
];

const roleTone: Record<string, "info" | "warn" | "neutral"> = {
  Owner: "info",
  Admin: "warn",
  Finance: "neutral",
  Developer: "neutral",
  Support: "neutral",
  Viewer: "neutral",
};

export default function MerchantTeamPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="\u00c9quipe" en="Team" />]}
      title={<T fr="\u00c9quipe" en="Team" />}
      sub={<T fr="5 membres \u00b7 4 actifs \u00b7 1 invitation en attente" en="5 members \u00b7 4 active \u00b7 1 pending invite" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Inviter" en="Invite" />
        </button>
      }
    >
      {/* Members table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "auto 1.4fr 1fr 0.8fr 0.8fr 24px" }}>
            <span style={{ width: 32 }} />
            <span><T fr="Personne" en="Person" /></span>
            <span><T fr="R\u00f4le" en="Role" /></span>
            <span><T fr="Derni\u00e8re connexion" en="Last seen" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span />
          </div>
          {MEMBERS.map((m, i) => (
            <div className="row clickable" key={i} style={{ gridTemplateColumns: "auto 1.4fr 1fr 0.8fr 0.8fr 24px" }}>
              <Avatar name={m.name} size={32} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.email}</div>
              </div>
              <div>
                <Pill tone={roleTone[m.role] || "neutral"}>{m.role}</Pill>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{m.lastSeen}</div>
              <div>
                <Pill tone={m.status === "active" ? "success" : "warn"}>{m.status}</Pill>
              </div>
              <Icon name="more" size={14} color="var(--muted)" />
            </div>
          ))}
        </div>
      </div>

      {/* Roles as card grid */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 4px" }}>
          <T fr="R\u00f4les disponibles" en="Available roles" />
        </h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}>
          <T fr="Granularit\u00e9 fine sur les permissions" en="Fine-grained permissions" />
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {ROLES.map((r, i) => (
            <div key={i} style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontWeight: 500 }}>{r.name}</strong>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{r.count}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {r.perms.map(p => (
                  <Pill key={p} tone="neutral">{p}</Pill>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
