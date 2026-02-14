"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/vcard/AuthGuard";
import { usersAPI, type UserResponse, type KYCStatus } from "@/lib/vcard-api";

export default function KYCPage() {
  return (
    <AuthGuard>
      <KYCContent />
    </AuthGuard>
  );
}

function KYCContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState<"PASSPORT" | "ID_CARD" | "DRIVER_LICENSE">("ID_CARD");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const userData = await usersAPI.getMe();
      setUser(userData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentFile) {
      setError("Veuillez sélectionner un document");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // In real implementation, upload file to storage first
      // For now, using a placeholder URL
      const documentUrl = `https://storage.example.com/kyc/${Date.now()}_${documentFile.name}`;

      await usersAPI.submitKYC({
        document_url: documentUrl,
        document_type: documentType,
      });

      setSuccess("Votre demande KYC a été soumise avec succès");

      // Reload user data
      await loadUser();

      // Reset form
      setDocumentFile(null);
      setDocumentPreview("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getKYCBadge = (status: KYCStatus) => {
    const config = {
      PENDING: {
        label: "En attente",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
        icon: "schedule",
      },
      VERIFIED: {
        label: "Approuvé",
        color: "bg-green-100 text-green-700 border-green-300",
        icon: "verified",
      },
      REJECTED: {
        label: "Rejeté",
        color: "bg-red-100 text-red-700 border-red-300",
        icon: "cancel",
      },
    };

    const cfg = config[status];
    return (
      <span
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border ${cfg.color}`}
      >
        <span className="material-symbols-outlined text-lg">{cfg.icon}</span>
        <span>{cfg.label}</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="px-6 lg:px-20 py-12 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-[#cea427] animate-spin">
            progress_activity
          </span>
          <p className="text-slate-600 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-20 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Vérification KYC
          </h1>
          <p className="text-lg text-slate-600">
            Soumettez vos documents d'identité pour vérifier votre compte
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-900">Statut actuel</h2>
            {user && getKYCBadge(user.kyc_status)}
          </div>

          {user?.kyc_status === "REJECTED" && user.kyc_rejected_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-red-600">
                  error
                </span>
                <div>
                  <p className="font-bold text-red-900 mb-1">
                    Raison du rejet
                  </p>
                  <p className="text-sm text-red-800">
                    {user.kyc_rejected_reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {user?.kyc_status === "VERIFIED" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-green-600">
                  check_circle
                </span>
                <div>
                  <p className="font-bold text-green-900 mb-1">
                    Compte vérifié
                  </p>
                  <p className="text-sm text-green-800">
                    Votre identité a été vérifiée avec succès. Vous pouvez maintenant utiliser toutes les fonctionnalités.
                  </p>
                </div>
              </div>
            </div>
          )}

          {user?.kyc_status === "PENDING" && user.kyc_submitted_at && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-yellow-600">
                  hourglass_top
                </span>
                <div>
                  <p className="font-bold text-yellow-900 mb-1">
                    Votre demande est en cours de vérification
                  </p>
                  <p className="text-sm text-yellow-800">
                    Notre équipe examine votre dossier. Vous recevrez une notification une fois la vérification terminée.
                  </p>
                  <p className="text-xs text-yellow-700 mt-2">
                    Soumis le {new Date(user.kyc_submitted_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Form - Only show if not submitted or rejected */}
        {user && (user.kyc_status === "REJECTED" || !user.kyc_submitted_at) && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-black text-slate-900 mb-6">
              Soumettre vos documents
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Document Type */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Type de document
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
                >
                  <option value="ID_CARD">Carte d'identité</option>
                  <option value="PASSPORT">Passeport</option>
                  <option value="DRIVER_LICENSE">Permis de conduire</option>
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Document d'identité
                </label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#cea427] transition-colors"
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  {documentPreview ? (
                    <div className="space-y-4">
                      <img
                        src={documentPreview}
                        alt="Document preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocumentFile(null);
                          setDocumentPreview("");
                        }}
                        className="text-sm text-red-600 hover:text-red-700 font-bold"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-6xl text-slate-300 mb-3 block">
                        cloud_upload
                      </span>
                      <p className="text-slate-600 font-medium">
                        Cliquez pour télécharger un document
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        PNG, JPG, PDF jusqu'à 10MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-blue-600">
                    info
                  </span>
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Conseils pour une vérification rapide</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Assurez-vous que le document est lisible</li>
                      <li>Toutes les informations doivent être visibles</li>
                      <li>Évitez les reflets et les ombres</li>
                      <li>Le document doit être valide</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !documentFile}
                className="w-full h-12 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    <span>Soumission en cours...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    <span>Soumettre ma demande</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
