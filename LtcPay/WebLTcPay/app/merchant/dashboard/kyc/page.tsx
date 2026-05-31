"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";

const stepColors: Record<string, string> = {
  completed: "var(--accent-success)",
  current: "var(--ink)",
  pending: "var(--line-2)",
};

const STEP_LABELS = [
  { id: 1, fr: "Entreprise", en: "Business" },
  { id: 2, fr: "Documents", en: "Documents" },
  { id: 3, fr: "Beneficiaire effectif", en: "Beneficial owner" },
  { id: 4, fr: "Validation", en: "Validation" },
];

function getStepStatus(stepId: number, currentStep: number): string {
  if (stepId < currentStep) return "completed";
  if (stepId === currentStep) return "current";
  return "pending";
}

export default function MerchantKycPage() {
  const [kyc, setKyc] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const [kycRes, docsRes] = await Promise.all([
          merchantDashboardService.getKyc(),
          merchantDashboardService.getKycDocuments(),
        ]);
        setKyc(kycRes);
        setDocuments(docsRes.items || []);
        setStep(kycRes.current_step || 1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="KYC" en="KYC" />]} title={<T fr="Verification KYC" en="KYC verification" />} sub={<T fr="Activez le mode production en moins de 24h en completant ces 4 etapes" en="Activate live mode in under 24h by completing these 4 steps" />}><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  const currentStep = kyc?.current_step || step;
  const steps = STEP_LABELS.map((s) => ({
    ...s,
    status: getStepStatus(s.id, currentStep),
  }));

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="KYC" en="KYC" />]}
      title={<T fr="Verification KYC" en="KYC verification" />}
      sub={<T fr="Activez le mode production en moins de 24h en completant ces 4 etapes" en="Activate live mode in under 24h by completing these 4 steps" />}
    >
      {/* Progress stepper */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i === 3 ? "0" : "1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: stepColors[s.status] || "var(--line-2)",
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
                    {s.status === "completed" ? <T fr="Valide" en="Done" /> : s.status === "current" ? <T fr="En cours" en="In progress" /> : <T fr="A faire" en="To do" />}
                  </div>
                </div>
              </div>
              {i < steps.length - 1 && (
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
            <T fr={`Etape ${currentStep} sur 4`} en={`Step ${currentStep} of 4`} />
          </div>
          <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            <T fr="Documents legaux" en="Legal documents" />
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px" }}>
            <T fr="PDF, JPG, PNG. 10 MB max par fichier. Vos documents sont chiffres et accessibles uniquement a notre equipe KYC." en="PDF, JPG, PNG. 10 MB max per file. Files are encrypted and only accessible to our KYC team." />
          </p>

          {documents.map((d, i) => {
            const isUploaded = d.status?.toLowerCase() === "uploaded" || d.status?.toLowerCase() === "approved";
            return (
              <div key={d.id || i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isUploaded ? "oklch(0.93 0.05 145)" : "var(--bg-2)", display: "grid", placeItems: "center" }}>
                  <Icon name={isUploaded ? "check" : "upload"} size={16} color={isUploaded ? "var(--accent-success)" : "var(--muted)"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {d.document_name || d.document_type || ""}
                  </div>
                  {d.file_name && <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{d.file_name}</div>}
                </div>
                {isUploaded ? (
                  <Pill tone="success">uploaded</Pill>
                ) : (
                  <button className="btn btn-ghost btn-sm">
                    <Icon name="upload" size={12} /> Upload
                  </button>
                )}
              </div>
            );
          })}
          {documents.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucun document requis." en="No documents required." />
            </div>
          )}

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
            <T fr="Validation sous 24h ouvrees" en="Reviewed within 24 business hours" />
          </h4>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            <T fr="Notre equipe KYC verifie vos documents et active votre compte production. Vous recevez un email a chaque etape." en="Our KYC team reviews your documents and activates your live account. You get an email at each step." />
          </p>
          <hr style={{ border: 0, borderTop: "1px solid oklch(0.85 0.05 260)", margin: "16px 0" }} />
          <div style={{ fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}><T fr="Conformite" en="Compliance" /></span>
              <span>COBAC {"\u00b7"} BEAC {"\u00b7"} CEMAC</span>
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
