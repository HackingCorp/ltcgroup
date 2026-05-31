"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

const STEPS = [
  { id: 1, fr: "Entreprise", en: "Business", status: "completed" as const },
  { id: 2, fr: "Documents", en: "Documents", status: "current" as const },
  { id: 3, fr: "Bénéficiaire effectif", en: "Beneficial owner", status: "pending" as const },
  { id: 4, fr: "Validation", en: "Validation", status: "pending" as const },
];

const DOCUMENTS = [
  { name: "RCCM", fr: "Registre de commerce (RCCM)", en: "Trade register (RCCM)", status: "uploaded" as const, file: "RCCM_BOUTIQUE_MAMI.pdf" },
  { name: "NIU", fr: "Numéro d'identification fiscale", en: "Tax ID certificate", status: "uploaded" as const, file: "NIU_M0824100021T.pdf" },
  { name: "Statuts", fr: "Statuts de société", en: "Articles of incorporation", status: "todo" as const, file: null },
  { name: "ID", fr: "Pièce d'identité du représentant légal", en: "Legal rep ID document", status: "todo" as const, file: null },
  { name: "Address", fr: "Justificatif d'adresse (< 3 mois)", en: "Proof of address (< 3 months)", status: "todo" as const, file: null },
];

const stepColors = {
  completed: "var(--accent-success)",
  current: "var(--ink)",
  pending: "var(--line-2)",
};

export default function MerchantKycPage() {
  const [step, setStep] = useState(2);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="KYC" en="KYC" />]}
      title={<T fr="Vérification KYC" en="KYC verification" />}
      sub={<T fr="Activez le mode production en moins de 24h en complétant ces 4 étapes" en="Activate live mode in under 24h by completing these 4 steps" />}
    >
      {/* Progress stepper */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i === 3 ? "0" : "1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: stepColors[s.status],
                  color: s.status === "pending" ? "var(--muted)" : "white",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {s.status === "completed" ? <Icon name="check" size={14} color="white" /> : s.id}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    <T fr={s.fr} en={s.en} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {s.status === "completed" ? <T fr="Validé" en="Done" /> : s.status === "current" ? <T fr="En cours" en="In progress" /> : <T fr="Ã faire" en="To do" />}
                  </div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ height: 2, flex: 1, background: s.status === "completed" ? "var(--accent-success)" : "var(--line)", marginLeft: 8, marginRight: 8 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Main content */}
        <div className="card">
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            <T fr="Ãtape 2 sur 4" en="Step 2 of 4" />
          </div>
          <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            <T fr="Documents légaux" en="Legal documents" />
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px" }}>
            <T fr="PDF, JPG, PNG. 10 MB max par fichier. Vos documents sont chiffrés et accessibles uniquement à notre équipe KYC." en="PDF, JPG, PNG. 10 MB max per file. Files are encrypted and only accessible to our KYC team." />
          </p>

          {DOCUMENTS.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: d.status === "uploaded" ? "oklch(0.93 0.05 145)" : "var(--bg-2)", display: "grid", placeItems: "center" }}>
                <Icon name={d.status === "uploaded" ? "check" : "upload"} size={16} color={d.status === "uploaded" ? "var(--accent-success)" : "var(--muted)"} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  <T fr={d.fr} en={d.en} />
                </div>
                {d.file && <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{d.file}</div>}
              </div>
              {d.status === "uploaded" ? (
                <Pill tone="success">uploaded</Pill>
              ) : (
                <button className="btn btn-ghost btn-sm">
                  <Icon name="upload" size={12} /> Upload
                </button>
              )}
            </div>
          ))}

          {/* Back / Continue navigation buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => setStep(Math.max(1, step - 1))}>
              <Icon name="arrowL" size={14} /> <T fr="Retour" en="Back" />
            </button>
            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setStep(Math.min(4, step + 1))}>
              <T fr="Continuer" en="Continue" /> <Icon name="arrow" size={14} color="white" />
            </button>
          </div>
        </div>

        {/* Info sidebar */}
        <div className="card" style={{ background: "oklch(0.97 0.01 260)", borderColor: "oklch(0.85 0.05 260)" }}>
          <Icon name="info" size={20} color="var(--ink)" />
          <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "12px 0 8px" }}>
            <T fr="Validation sous 24h ouvrées" en="Reviewed within 24 business hours" />
          </h4>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            <T fr="Notre équipe KYC vérifie vos documents et active votre compte production. Vous recevez un email à chaque étape." en="Our KYC team reviews your documents and activates your live account. You get an email at each step." />
          </p>
          <hr style={{ border: 0, borderTop: "1px solid oklch(0.85 0.05 260)", margin: "16px 0" }} />
          <div style={{ fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}><T fr="Conformité" en="Compliance" /></span>
              <span>COBAC · BEAC · CEMAC</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}><T fr="Standard" en="Standard" /></span>
              <span>AML / CFT 2021</span>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
