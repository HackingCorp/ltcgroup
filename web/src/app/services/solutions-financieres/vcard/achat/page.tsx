"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CardSelector from "@/components/vcard/CardSelector";
import CardPreview from "@/components/vcard/CardPreview";
import { cardsAPI, isAuthenticated, type CardType } from "@/lib/vcard-api";

export default function VCardAchatPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    cardType: "",
    initialBalance: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error" | "payment_pending"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/services/solutions-financieres/vcard/auth");
    }
  }, [router]);

  const CARD_PRICES: Record<string, number> = {
    visa_segment1: 5000,
    visa_segment2: 10000,
    visa_segment3: 20000,
    mastercard: 15000,
  };

  const getCardPrice = () => CARD_PRICES[formData.cardType] || 0;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Validation
      if (!formData.cardType) {
        throw new Error("Veuillez sélectionner un type de carte");
      }
      if (!formData.initialBalance || parseFloat(formData.initialBalance) <= 0) {
        throw new Error("Veuillez entrer un montant initial valide");
      }

      // Map UI card type to API card type
      const cardTypeMap: Record<string, CardType> = {
        visa_segment1: "VISA",
        visa_segment2: "VISA",
        visa_segment3: "VISA",
        mastercard: "MASTERCARD",
      };

      const apiCardType = cardTypeMap[formData.cardType];
      if (!apiCardType) {
        throw new Error("Type de carte invalide");
      }

      // Call API to purchase card
      const card = await cardsAPI.purchase({
        card_type: apiCardType,
        initial_balance: parseFloat(formData.initialBalance),
      });

      console.log("Card purchased successfully:", card);
      setSubmitStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue"
      );
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  return (
    <div className="px-6 lg:px-20 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Acheter une carte virtuelle
          </h1>
          <p className="text-lg text-slate-600">
            Remplissez le formulaire ci-dessous pour obtenir votre carte
            virtuelle en quelques minutes
          </p>
        </div>

        {submitStatus === "success" ? (
          // Success message
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-5xl text-green-600">
                check_circle
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">
              Commande confirmée !
            </h2>
            <p className="text-slate-600 mb-6">
              Votre carte virtuelle a été créée avec succès. Vous recevrez les
              détails de votre carte par email et SMS dans quelques instants.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/services/solutions-financieres/vcard/dashboard"
                className="flex items-center justify-center gap-2 h-12 px-6 bg-[#cea427] hover:bg-[#cea427]-dark text-white font-bold rounded-lg transition-all"
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>Voir mon dashboard</span>
              </a>
              <a
                href="/services/solutions-financieres/vcard/achat"
                className="flex items-center justify-center gap-2 h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg transition-all"
              >
                <span>Acheter une autre carte</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form - 2/3 width */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Card selection */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <CardSelector
                    selectedCard={formData.cardType}
                    onSelectCard={(cardId) =>
                      setFormData((prev) => ({ ...prev, cardType: cardId }))
                    }
                  />
                </div>

                {/* Initial balance */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-black text-slate-900 mb-6">
                    Solde initial
                  </h2>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Montant à créditer sur la carte (FCFA) *
                    </label>
                    <input
                      type="number"
                      name="initialBalance"
                      value={formData.initialBalance}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="100"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                      placeholder="10000"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Ce montant sera chargé sur votre carte après validation du
                      paiement
                    </p>
                  </div>
                </div>

                {/* Error message */}
                {submitStatus === "error" && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-red-600">
                        error
                      </span>
                      <div>
                        <p className="font-bold text-red-900 mb-1">Erreur</p>
                        <p className="text-sm text-red-700">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.cardType}
                  className="w-full h-14 bg-[#cea427] hover:bg-[#cea427]-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">
                        progress_activity
                      </span>
                      <span>Traitement en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">payment</span>
                      <span>Procéder au paiement</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sidebar - 1/3 width */}
            <div className="lg:col-span-1">
              <div className="sticky top-32 space-y-6">
                {/* Card preview */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">
                    Aperçu
                  </h3>
                  <CardPreview
                    cardType={
                      formData.cardType as
                        | "visa_segment1"
                        | "visa_segment2"
                        | "visa_segment3"
                        | "mastercard"
                        | ""
                    }
                    holderName="VOTRE NOM"
                  />
                </div>

                {/* Price summary */}
                {formData.cardType && formData.initialBalance && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white">
                    <h3 className="text-sm font-bold uppercase mb-4 text-white/80">
                      Résumé
                    </h3>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Type de carte</span>
                        <span className="font-medium">
                          {formData.cardType
                            .replace("_", " ")
                            .toUpperCase()
                            .replace("VISA ", "Visa ")
                            .replace("MASTERCARD", "Mastercard")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Solde initial</span>
                        <span className="font-medium">
                          {formatAmount(parseFloat(formData.initialBalance))} FCFA
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/20">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total à payer</span>
                        <span className="text-2xl font-black">
                          {formatAmount(parseFloat(formData.initialBalance))} FCFA
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                      <div className="flex gap-2 text-xs">
                        <span className="material-symbols-outlined text-sm">
                          info
                        </span>
                        <p className="text-white/90">
                          Votre carte sera activée immédiatement après
                          confirmation du paiement
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
