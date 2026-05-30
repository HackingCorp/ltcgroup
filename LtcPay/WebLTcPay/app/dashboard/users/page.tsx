"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { Toggle } from "@/components/ui/toggle";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

/* ── mock data ─────────────────────────────────────────────── */

type Role = "super_admin" | "admin" | "support" | "viewer";

interface InternalUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  lastLogin: string;
  twoFa: boolean;
}

const USERS: InternalUser[] = [
  { id: "1", name: "Jean-Pierre Kamga",  email: "jp@nkap.cm",      role: "super_admin", status: "active",   lastLogin: "Il y a 2 min",  twoFa: true },
  { id: "2", name: "Marie Ngono",        email: "marie@nkap.cm",   role: "admin",       status: "active",   lastLogin: "Il y a 1h",     twoFa: true },
  { id: "3", name: "Paul Essomba",       email: "paul@nkap.cm",    role: "admin",       status: "active",   lastLogin: "Il y a 3h",     twoFa: true },
  { id: "4", name: "Fatou Diallo",       email: "fatou@nkap.cm",   role: "support",     status: "active",   lastLogin: "Hier, 18:42",   twoFa: false },
  { id: "5", name: "Samuel Mbarga",      email: "samuel@nkap.cm",  role: "support",     status: "active",   lastLogin: "25 mai 2026",   twoFa: true },
  { id: "6", name: "Claire Atangana",    email: "claire@nkap.cm",  role: "viewer",      status: "inactive", lastLogin: "12 mai 2026",   twoFa: false },
];

const PERMISSIONS: { perm: string; fr: string; en: string; super_admin: boolean; admin: boolean; support: boolean; viewer: boolean }[] = [
  { perm: "dashboard_view",      fr: "Voir le dashboard",          en: "View dashboard",          super_admin: true,  admin: true,  support: true,  viewer: true },
  { perm: "merchants_manage",    fr: "G\u00e9rer les marchands",        en: "Manage merchants",        super_admin: true,  admin: true,  support: false, viewer: false },
  { perm: "payments_view",       fr: "Voir les paiements",         en: "View payments",           super_admin: true,  admin: true,  support: true,  viewer: true },
  { perm: "withdrawals_approve", fr: "Approuver les retraits",     en: "Approve withdrawals",     super_admin: true,  admin: true,  support: false, viewer: false },
  { perm: "disputes_manage",     fr: "G\u00e9rer les litiges",         en: "Manage disputes",         super_admin: true,  admin: true,  support: true,  viewer: false },
  { perm: "fees_configure",      fr: "Configurer les frais",       en: "Configure fees",          super_admin: true,  admin: false, support: false, viewer: false },
  { perm: "users_manage",        fr: "G\u00e9rer les utilisateurs",    en: "Manage users",            super_admin: true,  admin: false, support: false, viewer: false },
  { perm: "audit_view",          fr: "Voir le journal d\u2019audit",   en: "View audit log",          super_admin: true,  admin: true,  support: false, viewer: false },
  { perm: "system_health",       fr: "Sant\u00e9 syst\u00e8me",             en: "System health",           super_admin: true,  admin: true,  support: true,  viewer: false },
  { perm: "api_keys_rotate",     fr: "Rotation des cl\u00e9s API",     en: "Rotate API keys",         super_admin: true,  admin: true,  support: false, viewer: false },
];

function roleTone(r: Role): "fail" | "warn" | "info" | "neutral" {
  if (r === "super_admin") return "fail";
  if (r === "admin") return "warn";
  if (r === "support") return "info";
  return "neutral";
}

function roleLabel(r: Role): string {
  const map: Record<Role, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    support: "Support",
    viewer: "Viewer",
  };
  return map[r];
}

/* ── page ──────────────────────────────────────────────────── */

export default function UsersPage() {
  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="Utilisateurs internes" en="Internal Users" />]}
      title={<T fr="Utilisateurs internes (RBAC)" en="Internal Users (RBAC)" />}
      sub={<T fr="Gestion des acc\u00e8s et des r\u00f4les" en="Access and role management" />}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} color="white" /> <T fr="Inviter" en="Invite" />
        </button>
      }
    >
      {/* Users table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
            <T fr="Utilisateurs" en="Users" />
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
            <T fr={`${USERS.length} utilisateurs enregistr\u00e9s`} en={`${USERS.length} registered users`} />
          </p>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "1.6fr 1.2fr 0.8fr 0.7fr 1fr 0.6fr" }}>
          <div><T fr="Utilisateur" en="User" /></div>
          <div><T fr="Email" en="Email" /></div>
          <div><T fr="R\u00f4le" en="Role" /></div>
          <div><T fr="Statut" en="Status" /></div>
          <div><T fr="Derni\u00e8re connexion" en="Last login" /></div>
          <div style={{ textAlign: "center" }}>2FA</div>
        </div>
        <div className="tbl">
          {USERS.map((u) => (
            <div key={u.id} className="row clickable" style={{ gridTemplateColumns: "1.6fr 1.2fr 0.8fr 0.7fr 1fr 0.6fr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={u.name} size={28} />
                <span style={{ fontWeight: 500 }}>{u.name}</span>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{u.email}</div>
              <div><Pill tone={roleTone(u.role)}>{roleLabel(u.role)}</Pill></div>
              <div>
                <Pill tone={u.status === "active" ? "success" : "neutral"}>
                  {u.status === "active" ? <T fr="Actif" en="Active" /> : <T fr="Inactif" en="Inactive" />}
                </Pill>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{u.lastLogin}</div>
              <div style={{ textAlign: "center" }}>
                {u.twoFa
                  ? <Icon name="shield" size={16} color="var(--success)" />
                  : <Icon name="alert" size={16} color="var(--warn)" />
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions matrix */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
            <T fr="Matrice des permissions" en="Permissions matrix" />
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
            <T fr="Permissions par r\u00f4le" en="Permissions by role" />
          </p>
        </div>
        <div className="row head" style={{ gridTemplateColumns: "1.8fr 0.7fr 0.7fr 0.7fr 0.7fr" }}>
          <div><T fr="Permission" en="Permission" /></div>
          <div style={{ textAlign: "center" }}>Super Admin</div>
          <div style={{ textAlign: "center" }}>Admin</div>
          <div style={{ textAlign: "center" }}>Support</div>
          <div style={{ textAlign: "center" }}>Viewer</div>
        </div>
        <div className="tbl">
          {PERMISSIONS.map((p) => (
            <div key={p.perm} className="row" style={{ gridTemplateColumns: "1.8fr 0.7fr 0.7fr 0.7fr 0.7fr" }}>
              <div style={{ fontSize: 13 }}><T fr={p.fr} en={p.en} /></div>
              <div style={{ textAlign: "center" }}>
                {p.super_admin ? <Icon name="check" size={15} color="var(--success)" /> : <Icon name="x" size={15} color="var(--line-2)" />}
              </div>
              <div style={{ textAlign: "center" }}>
                {p.admin ? <Icon name="check" size={15} color="var(--success)" /> : <Icon name="x" size={15} color="var(--line-2)" />}
              </div>
              <div style={{ textAlign: "center" }}>
                {p.support ? <Icon name="check" size={15} color="var(--success)" /> : <Icon name="x" size={15} color="var(--line-2)" />}
              </div>
              <div style={{ textAlign: "center" }}>
                {p.viewer ? <Icon name="check" size={15} color="var(--success)" /> : <Icon name="x" size={15} color="var(--line-2)" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
