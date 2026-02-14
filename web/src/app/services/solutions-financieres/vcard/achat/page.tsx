"use client";

import { useState } from "react";
import CardSelector from "@/components/vcard/CardSelector";
import CardPreview from "@/components/vcard/CardPreview";

export default function VCardAchatPage() {
  const [formData, setFormData] = useState({
    cardType: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error" | "payment_pending"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "mobile_money" | "enkap"
  >("mobile_money");

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
      if (!formData.firstName || !formData.lastName) {
        throw new Error("Veuillez renseigner votre nom complet");
      }
      if (!formData.email || !formData.phone) {
        throw new Error("Veuillez renseigner vos coordonnées");
      }

      const total = getCardPrice();
      const orderRef = `VCARD-${Date.now().toString(36).toUpperCase()}`;

      // TODO Phase 2: Connect to backend API
      // const response = await fetch("/api/vcard/purchase", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     ...formData,
      //     orderRef,
      //     amount: total,
      //     paymentMethod,
      //   }),
      // });

      // MOCK: Simulate payment initiation
      console.log("Creating vCard order:", {
        ...formData,
        orderRef,
        total,
        paymentMethod,
      });

      setSubmitStatus("payment_pending");

      // Simulate payment flow
      setTimeout(() => {
        setSubmitStatus("success");
        setIsSubmitting(false);
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue"
      );
      setSubmitStatus("error");
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

                {/* Personal information */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-black text-slate-900 mb-6">
                    Informations personnelles
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Prénom(s) *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                        placeholder="Jean"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Nom de famille *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                        placeholder="Dupont"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                        placeholder="jean.dupont@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                        placeholder="6XXXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Date de naissance *
                      </label>
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-black text-slate-900 mb-6">
                    Méthode de paiement
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("mobile_money")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        paymentMethod === "mobile_money"
                          ? "border-[#cea427] bg-[#cea427]/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === "mobile_money"
                              ? "border-[#cea427]"
                              : "border-slate-300"
                          }`}
                        >
                          {paymentMethod === "mobile_money" && (
                            <div className="w-3 h-3 rounded-full bg-[#cea427]"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            Mobile Money
                          </p>
                          <p className="text-xs text-slate-500">
                            MTN, Orange, Express Union
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("enkap")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        paymentMethod === "enkap"
                          ? "border-[#cea427] bg-[#cea427]/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === "enkap"
                              ? "border-[#cea427]"
                              : "border-slate-300"
                          }`}
                        >
                          {paymentMethod === "enkap" && (
                            <div className="w-3 h-3 rounded-full bg-[#cea427]"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">E-nkap</p>
                          <p className="text-xs text-slate-500">
                            Paiement par carte
                          </p>
                        </div>
                      </div>
                    </button>
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
                    holderName={
                      formData.firstName && formData.lastName
                        ? `${formData.firstName} ${formData.lastName}`.toUpperCase()
                        : "VOTRE NOM"
                    }
                  />
                </div>

                {/* Price summary */}
                {formData.cardType && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white">
                    <h3 className="text-sm font-bold uppercase mb-4 text-white/80">
                      Résumé
                    </h3>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Prix de la carte</span>
                        <span className="font-medium">
                          {formatAmount(getCardPrice())} FCFA
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/20">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total</span>
                        <span className="text-2xl font-black">
                          {formatAmount(getCardPrice())} FCFA
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
