"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";

const roleTone: Record<string, "info" | "warn" | "neutral"> = {
  Owner: "info",
  Admin: "warn",
  Finance: "neutral",
  Developer: "neutral",
  Support: "neutral",
  Viewer: "neutral",
};

export default function MerchantTeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [membersRes, rolesRes] = await Promise.all([
          merchantDashboardService.getTeamMembers(),
          merchantDashboardService.getTeamRoles(),
        ]);
        setMembers(membersRes.items || []);
        setRoles(rolesRes.roles || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Equipe" en="Team" />]} title={<T fr="Equipe" en="Team" />} sub=""><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "pending").length;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Equipe" en="Team" />]}
      title={<T fr="Equipe" en="Team" />}
      sub={<T fr={`${members.length} membres \u00b7 ${activeCount} actifs \u00b7 ${pendingCount} invitation${pendingCount > 1 ? "s" : ""} en attente`} en={`${members.length} members \u00b7 ${activeCount} active \u00b7 ${pendingCount} pending invite${pendingCount > 1 ? "s" : ""}`} />}
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
            <span><T fr="Role" en="Role" /></span>
            <span><T fr="Derniere connexion" en="Last seen" /></span>
            <span><T fr="Statut" en="Status" /></span>
            <span />
          </div>
          {members.map((m, i) => (
            <div className="row clickable" key={m.id || i} style={{ gridTemplateColumns: "auto 1.4fr 1fr 0.8fr 0.8fr 24px" }}>
              <Avatar name={m.name} size={32} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.email}</div>
              </div>
              <div>
                <Pill tone={roleTone[m.role] || "neutral"}>{m.role}</Pill>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{m.last_seen_at || "\u2014"}</div>
              <div>
                <Pill tone={m.status === "active" ? "success" : "warn"}>{m.status}</Pill>
              </div>
              <Icon name="more" size={14} color="var(--muted)" />
            </div>
          ))}
        </div>
        {members.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <T fr="Aucun membre." en="No members." />
          </div>
        )}
      </div>

      {/* Roles as card grid */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: "0 0 4px" }}>
          <T fr="Roles disponibles" en="Available roles" />
        </h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}>
          <T fr="Granularite fine sur les permissions" en="Fine-grained permissions" />
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {roles.map((r, i) => (
            <div key={i} style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontWeight: 500 }}>{r.role}</strong>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(r.permissions || []).map((p: string) => (
                  <Pill key={p} tone="neutral">{p}</Pill>
                ))}
              </div>
            </div>
          ))}
        </div>
        {roles.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            <T fr="Aucun role configure." en="No roles configured." />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
