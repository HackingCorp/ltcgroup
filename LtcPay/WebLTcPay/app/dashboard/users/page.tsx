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

interface InternalUser {
  name: string;
  email: string;
  role: string;
  team: string;
  mfa: boolean;
  status: "active" | "invited";
  lastSeen: string;
}

const USERS: InternalUser[] = [
  { name: "Sarah Mendomo", email: "sarah@ltc.cm", role: "Root admin", team: "Direction", mfa: true, status: "active", lastSeen: "il y a 12 min" },
  { name: "Jean Kameni", email: "jean@ltc.cm", role: "Operations lead", team: "Ops", mfa: true, status: "active", lastSeen: "il y a 1 h" },
  { name: "Nad\u00e8ge Tchana", email: "nadege@ltc.cm", role: "KYC analyst", team: "Compliance", mfa: true, status: "active", lastSeen: "il y a 22 min" },
  { name: "A\u00efcha Bello", email: "aicha@ltc.cm", role: "Finance manager", team: "Finance", mfa: true, status: "active", lastSeen: "il y a 6 h" },
  { name: "Patrick Onana", email: "patrick@ltc.cm", role: "Engineer", team: "Tech", mfa: true, status: "active", lastSeen: "il y a 4 jours" },
  { name: "Olive Mvondo", email: "olive@ltc.cm", role: "Support", team: "Customer success", mfa: false, status: "active", lastSeen: "il y a 3 jours" },
  { name: "Marc Belinga", email: "marc@ltc.cm", role: "Analyst (invit\u00e9)", team: "Data", mfa: false, status: "invited", lastSeen: "\u2014" },
  { name: "Camille Eto\u2019o", email: "camille.ext@audit.cm", role: "Auditor (read-only)", team: "External", mfa: true, status: "active", lastSeen: "il y a 1 sem" },
];

const ROLES_PERMISSIONS = [
  { r: "Root admin", n: 1, p: ["\u2713", "\u2713", "\u2713", "\u2713", "\u2713", "\u2713"] },
  { r: "Operations lead", n: 1, p: ["\u2713", "\u2713", "\u2713", "\u2713", "\u2014", "\u2014"] },
  { r: "Compliance / KYC", n: 1, p: ["\u2713", "\u2713", "\u2713", "\u2014", "\u2014", "\u2014"] },
  { r: "Finance manager", n: 1, p: ["\u2713", "\u2713", "\u2014", "\u2713", "\u2014", "\u2014"] },
  { r: "Engineer", n: 1, p: ["\u2713", "\u2713", "\u2014", "\u2014", "\u2014", "\u2014"] },
  { r: "Support", n: 1, p: ["\u2713", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"] },
  { r: "Analyst", n: 1, p: ["\u2713", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"] },
  { r: "Auditor (read-only)", n: 1, p: ["\u2713", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"] },
];

function roleTone(role: string): "fail" | "neutral" | "info" {
  if (role.includes("Root")) return "fail";
  if (role.includes("read")) return "neutral";
  return "info";
}

/* ── page ──────────────────────────────────────────────────── */

export default function UsersPage() {
  const [policies, setPolicies] = useState([true, true, true, true, false, true]);

  const policyItems = [
    { t: <T fr="MFA obligatoire pour tous" en="MFA required for all" /> },
    { t: <T fr="Session 8h max" en="Max 8h session" /> },
    { t: <T fr="IP allow-list (LTC office)" en="IP allow-list (LTC office)" /> },
    { t: <T fr="Rotation cl\u00e9s API tous les 90j" en="API key rotation every 90d" /> },
    { t: <T fr="Confirmation 4-eyes pour payouts > 5M F" en="4-eyes confirmation for payouts > 5M F" /> },
    { t: <T fr="SSO Google Workspace" en="Google Workspace SSO" /> },
  ];

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Gouvernance" en="Governance" />, <T key="c2" fr="Utilisateurs internes" en="Internal users" />]}
      title={<T fr="Utilisateurs internes LTC" en="LTC internal users" />}
      sub={<T fr="8 actifs \u00b7 1 invit\u00e9 en attente \u00b7 RBAC fine-grained" en="8 active \u00b7 1 pending invite \u00b7 fine-grained RBAC" />}
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
            <span><T fr="R\u00f4le" en="Role" /></span>
            <span><T fr="\u00c9quipe" en="Team" /></span>
            <span>MFA</span>
            <span><T fr="Statut" en="Status" /></span>
            <span><T fr="Derni\u00e8re connexion" en="Last seen" /></span>
            <span></span>
          </div>
          {USERS.map((u, i) => (
            <div className="row clickable" key={i} style={{ gridTemplateColumns: "auto 1.4fr 1fr 1fr 0.5fr 0.7fr 0.8fr 24px" }}>
              <Avatar name={u.name} size={32} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.email}</div>
              </div>
              <div><Pill tone={roleTone(u.role)} plain>{u.role}</Pill></div>
              <div style={{ fontSize: 13 }}>{u.team}</div>
              <div>
                {u.mfa
                  ? <Icon name="shield" size={14} color="var(--success)" />
                  : <Icon name="alert" size={14} color="var(--warn)" />
                }
              </div>
              <Pill tone={u.status === "active" ? "success" : "warn"}>{u.status}</Pill>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{u.lastSeen}</div>
              <Icon name="more" size={14} color="var(--muted)" />
            </div>
          ))}
        </div>
      </div>

      {/* Roles & permissions + Security policy - 2fr 1fr layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* Roles & permissions (role-centric) */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="R\u00f4les & permissions" en="Roles & permissions" />
          </h3>
          <div className="tbl">
            <div className="row head" style={{ gridTemplateColumns: "1.4fr 0.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.6fr" }}>
              <span><T fr="R\u00f4le" en="Role" /></span>
              <span><T fr="Membres" en="Members" /></span>
              <span>read</span>
              <span>write</span>
              <span>kyc</span>
              <span>fees</span>
              <span>users</span>
              <span>danger</span>
            </div>
            {ROLES_PERMISSIONS.map((r, i) => (
              <div key={i} className="row" style={{ gridTemplateColumns: "1.4fr 0.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.6fr" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.r}</div>
                <div className="mono" style={{ fontSize: 11 }}>{r.n}</div>
                {r.p.map((p, j) => (
                  <div key={j} className="mono" style={{ fontSize: 12, color: p === "\u2713" ? "var(--success)" : "var(--muted-2)" }}>{p}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Security policy */}
        <div className="card">
          <h3 style={{ fontWeight: 500, fontSize: 18, margin: "0 0 14px" }}>
            <T fr="Politique de s\u00e9curit\u00e9" en="Security policy" />
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
