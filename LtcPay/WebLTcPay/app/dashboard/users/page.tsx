"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { Toggle } from "@/components/ui/toggle";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { adminDashboardService } from "@/services/admin-dashboard.service";

/* ── helpers ──────────────────────────────────────────────── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "---";
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

function roleTone(role: string): "fail" | "neutral" | "info" {
  if (role.includes("Root") || role.includes("root") || role.includes("admin")) return "fail";
  if (role.includes("read") || role.includes("audit")) return "neutral";
  return "info";
}

/* ── page ──────────────────────────────────────────────────── */

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState([true, true, true, true, false, true]);

  const policyItems = [
    { t: <T fr="MFA obligatoire pour tous" en="MFA required for all" /> },
    { t: <T fr="Session 8h max" en="Max 8h session" /> },
    { t: <T fr="IP allow-list (LTC office)" en="IP allow-list (LTC office)" /> },
    { t: <T fr="Rotation cles API tous les 90j" en="API key rotation every 90d" /> },
    { t: <T fr="Confirmation 4-eyes pour payouts > 5M F" en="4-eyes confirmation for payouts > 5M F" /> },
    { t: <T fr="SSO Google Workspace" en="Google Workspace SSO" /> },
  ];

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          adminDashboardService.getUsers({ page: 1, page_size: 50 }),
          adminDashboardService.getUserRoles(),
        ]);
        setUsers(usersRes.items || []);
        setRoles(rolesRes.roles || []);
      } catch (err) {
        console.error("Failed to load users data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="Utilisateurs internes" en="Internal users" />]}
        title={<T fr="Utilisateurs internes LTC" en="LTC internal users" />}
        sub=""
      >
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
      </PageWrapper>
    );
  }

  const activeCount = users.filter((u) => u.is_active || u.status === "active").length;
  const invitedCount = users.filter((u) => u.status === "invited").length;

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="Utilisateurs internes" en="Internal users" />]}
      title={<T fr="Utilisateurs internes LTC" en="LTC internal users" />}
      sub={<T fr={`${activeCount} actifs · ${invitedCount} invite en attente · RBAC fine-grained`} en={`${activeCount} active · ${invitedCount} pending invite · fine-grained RBAC`} />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Inviter" en="Invite" />
        </button>
      }
    >
      {/* Users table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div className="tbl">
          <div className="row head" style={{ gridTemplateColumns: "auto 1.4fr 1fr 1fr 0.5fr 0.7fr 0.8fr 24px" }}>
            <span></span>
            <span><T fr="Personne" en="Person" /></span>
            <span><T fr="Role" en="Role" /></span>
            <span><T fr="Equipe" en="Team" /></span>
            <span>MFA</span>
            <span><T fr="Statut" en="Status" /></span>
            <span><T fr="Derniere connexion" en="Last seen" /></span>
            <span></span>
          </div>
          {users.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun utilisateur" en="No users" />
            </div>
          )}
          {users.map((u: any, i: number) => {
            const userName = u.full_name || u.email || "---";
            const userStatus = u.status || (u.is_active ? "active" : "invited");
            const mfaEnabled = u.mfa_enabled ?? false;
            return (
              <div className="row clickable" key={u.id || i} style={{ gridTemplateColumns: "auto 1.4fr 1fr 1fr 0.5fr 0.7fr 0.8fr 24px" }}>
                <Avatar name={userName} size={32} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{userName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.email}</div>
                </div>
                <div><Pill tone={roleTone(u.role || "")} plain>{u.role || "---"}</Pill></div>
                <div style={{ fontSize: 13 }}>{u.team || "---"}</div>
                <div>
                  {mfaEnabled
                    ? <Icon name="shield" size={14} color="var(--success)" />
                    : <Icon name="alert" size={14} color="var(--warn)" />
                  }
                </div>
                <Pill tone={userStatus === "active" ? "success" : "warn"}>{userStatus}</Pill>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{timeAgo(u.last_seen_at)}</div>
                <Icon name="more" size={14} color="var(--muted)" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Roles & permissions + Security policy - 2fr 1fr layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* Roles & permissions (from API) */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Roles & permissions" en="Roles & permissions" />
          </h3>
          <div className="tbl">
            <div className="row head" style={{ gridTemplateColumns: "1.4fr 0.5fr 1fr" }}>
              <span><T fr="Role" en="Role" /></span>
              <span><T fr="Label" en="Label" /></span>
              <span><T fr="Permissions" en="Permissions" /></span>
            </div>
            {roles.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                <T fr="Aucun role defini" en="No roles defined" />
              </div>
            )}
            {roles.map((r: any, i: number) => (
              <div key={i} className="row" style={{ gridTemplateColumns: "1.4fr 0.5fr 1fr" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.role}</div>
                <div className="mono" style={{ fontSize: 11 }}>{r.label || "---"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {Array.isArray(r.permissions) ? r.permissions.join(", ") : "---"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security policy (static UI config) */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Politique de securite" en="Security policy" />
          </h3>
          {policyItems.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 13 }}>
              <span>{p.t}</span>
              <Toggle
                on={policies[i]}
                onChange={(val) => {
                  const next = [...policies];
                  next[i] = val;
                  setPolicies(next);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
