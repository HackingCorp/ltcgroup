"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";

const STEPS = [
  { key: "company", fr: "Entreprise", en: "Company", status: "completed" as const },
  { key: "documents", fr: "Documents", en: "Documents", status: "current" as const },
  { key: "beneficiary", fr: "Bénéficiaire effectif", en: "Beneficial owner", status: "pending" as const },
  { key: "validation", fr: "Validation", en: "Validation", status: "pending" as const },
];

const DOCUMENTS = [
  { name: "RCCM", fr: "Registre du Commerce", en: "Business Registration", status: "uploaded" as const, file: "rccm_ltcgroup.pdf", date: "12 mars 2026" },
  { name: "Tax ID", fr: "Numéro d'Identifiant Unique", en: "Tax Identification Number", status: "uploaded" as const, file: "niu_ltcgroup.pdf", date: "12 mars 2026" },
  { name: "Statuts", fr: "Statuts de la société", en: "Company bylaws", status: "todo" as const, file: null, date: null },
  { name: "ID", fr: "Pièce d'identité du dirigeant", en: "Manager ID document", status: "todo" as const, file: null, date: null },
  { name: "Address", fr: "Justificatif de domicile", en: "Proof of address", status: "todo" as const, file: null, date: null },
];

const stepColors = {
  completed: "var(--accent-success)",
  current: "var(--ink)",
  pending: "var(--line-2)",
};

export default function MerchantKycPage() {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="KYC" en="KYC" />]}
      title={<T fr="Vérification KYC" en="KYC verification" />}
      sub={<T fr="Complétez la vérification pour activer le mode production" en="Complete verification to enable live mode" />}
    >
      {/* Progress stepper */}
      <div className="card" style={{ padding: "24px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {STEPS.map((step, i) => (
            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: stepColors[step.status],
                  color: step.status === "pending" ? "var(--muted)" : "white",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--mono)",
                }}>
                  {step.status === "completed" ? <Icon name="check" size={14} color="white" /> : i + 1}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 6, color: step.status === "pending" ? "var(--muted)" : "var(--ink)", textAlign: "center", whiteSpace: "nowrap" }}>
                  <T fr={step.fr} en={step.en} />
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 2,
                  background: step.status === "completed" ? "var(--accent-success)" : "var(--line-2)",
                  margin: "0 8px",
                  marginBottom: 20,
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Documents list */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, margin: 0 }}>
              <T fr="Documents requis" en="Required documents" />
            </h3>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              <T fr="2 sur 5 documents soumis" en="2 of 5 documents submitted" />
            </div>
          </div>
          {DOCUMENTS.map(doc => (
            <div
              key={doc.name}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
              }}
              onClick={() => setExpandedDoc(expandedDoc === doc.name ? null : doc.name)}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: doc.status === "uploaded" ? "oklch(0.93 0.05 145)" : "var(--bg-2)",
                    display: "grid",
                    placeItems: "center",
                  }}>
                    <Icon
                      name={doc.status === "uploaded" ? "check" : "upload"}
                      size={13}
                      color={doc.status === "uploaded" ? "var(--accent-success)" : "var(--muted)"}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}><T fr={doc.fr} en={doc.en} /></div>
                    {doc.file && <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{doc.file}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Pill tone={doc.status === "uploaded" ? "success" : "neutral"}>
                    {doc.status === "uploaded" ? <T fr="soumis" en="submitted" /> : <T fr="requis" en="required" />}
                  </Pill>
                  <Icon name="chevR" size={12} color="var(--muted)" />
                </div>
              </div>
              {expandedDoc === doc.name && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  {doc.status === "uploaded" ? (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      <T fr="Soumis le" en="Submitted on" /> {doc.date}
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-ghost btn-sm"><Icon name="eye" size={12} /> <T fr="Voir" en="View" /></button>
                        <button className="btn btn-ghost btn-sm"><Icon name="refresh" size={12} /> <T fr="Remplacer" en="Replace" /></button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                        <T fr="Formats acceptés: PDF, JPG, PNG (max 5 Mo)" en="Accepted formats: PDF, JPG, PNG (max 5 MB)" />
                      </div>
                      <button className="btn btn-primary btn-sm"><Icon name="upload" size={12} /> <T fr="Téléverser" en="Upload" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20, borderLeft: "3px solid var(--ink)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icon name="info" size={16} color="var(--ink)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  <T fr="Délai de validation" en="Validation timeline" />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  <T
                    fr="Une fois tous les documents soumis, notre équipe de conformité vérifie votre dossier sous 24 heures ouvrées. Vous recevrez un email de confirmation."
                    en="Once all documents are submitted, our compliance team reviews your file within 24 business hours. You will receive a confirmation email."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              <T fr="Progression" en="Progress" />
            </div>
            <div style={{
              width: "100%",
              height: 8,
              background: "var(--bg-2)",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 8,
            }}>
              <div style={{
                width: "40%",
                height: "100%",
                background: "var(--ink)",
                borderRadius: 4,
                transition: "width 0.3s",
              }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              2/5 {"·"} <T fr="40% complété" en="40% complete" />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="shield" size={14} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                <T fr="Pourquoi le KYC ?" en="Why KYC?" />
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              <T
                fr="La vérification KYC est requise par la réglementation COBAC/CEMAC pour les services de paiement. Elle protège vos clients et votre entreprise."
                en="KYC verification is required by COBAC/CEMAC regulations for payment services. It protects your customers and your business."
              />
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
