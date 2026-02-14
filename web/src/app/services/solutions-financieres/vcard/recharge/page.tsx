"use client";

import { useState } from "react";
import TopupForm from "@/components/vcard/TopupForm";
import CardPreview from "@/components/vcard/CardPreview";

// MOCK DATA - Phase 1
// TODO Phase 2: Replace with real API calls
const MOCK_USER_CARDS = [
  {
    id: "vc_001",
    type: "visa_segment2",
    last4: "1234",
    balance: 45000,
    status: "active",
    expiryDate: "12/28",
    holderName: "JEAN DUPONT",
    email: "jean.dupont@example.com",
  },
];

export default function VCardRechargePage() {
  const [searchMethod, setSearchMethod] = useState<"card" | "email">("card");
  const [searchValue, setSearchValue] = useState("");
  const [selectedCard, setSelectedCard] = useState<
    (typeof MOCK_USER_CARDS)[0] | null
  >(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setErrorMessage("");

    // TODO Phase 2: Replace with real API call
    // const response = await fetch(`/api/vcard/cards?${searchMethod}=${searchValue}`);

    // MOCK: Simulate search
    setTimeout(() => {
      if (searchMethod === "card" && searchValue.endsWith("1234")) {
        setSelectedCard(MOCK_USER_CARDS[0]);
      } else if (
        searchMethod === "email" &&
        searchValue === MOCK_USER_CARDS[0].email
      ) {
        setSelectedCard(MOCK_USER_CARDS[0]);
      } else {
        setErrorMessage("Aucune carte trouvée avec ces informations");
        setSelectedCard(null);
      }
      setIsSearching(false);
    }, 1000);
  };

  const handleTopup = async (amount: number, paymentMethod: string) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // TODO Phase 2: Replace with real API call
      // const response = await fetch("/api/vcard/topup", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     cardId: selectedCard?.id,
      //     amount,
      //     paymentMethod,
      //   }),
      // });

      // MOCK: Simulate topup
      console.log("Topup request:", {
        cardId: selectedCard?.id,
        amount,
        paymentMethod,
      });

      setTimeout(() => {
        setSubmitStatus("success");
        setIsSubmitting(false);
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur lors de la recharge"
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
            Recharger une carte
          </h1>
          <p className="text-lg text-slate-600">
            Ajoutez des fonds à votre carte virtuelle en quelques clics
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
              Recharge effectuée !
            </h2>
            <p className="text-slate-600 mb-6">
              Votre carte a été rechargée avec succès. Le nouveau solde sera
              visible dans quelques instants.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/services/solutions-financieres/vcard/dashboard"
                className="flex items-center justify-center gap-2 h-12 px-6 bg-[#cea427] hover:bg-[#cea427]-dark text-white font-bold rounded-lg transition-all"
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>Voir mon dashboard</span>
              </a>
              <button
                onClick={() => {
                  setSubmitStatus("idle");
                  setSelectedCard(null);
                  setSearchValue("");
                }}
                className="flex items-center justify-center gap-2 h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg transition-all"
              >
                <span>Nouvelle recharge</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content - 2/3 width */}
            <div className="lg:col-span-2 space-y-8">
              {/* Search card */}
              {!selectedCard && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-black text-slate-900 mb-6">
                    Identifier votre carte
                  </h2>

                  {/* Search method selector */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setSearchMethod("card")}
                      className={`flex-1 h-10 px-4 font-bold rounded-lg transition-all ${
                        searchMethod === "card"
                          ? "bg-[#cea427] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Par numéro de carte
                    </button>
                    <button
                      onClick={() => setSearchMethod("email")}
                      className={`flex-1 h-10 px-4 font-bold rounded-lg transition-all ${
                        searchMethod === "email"
                          ? "bg-[#cea427] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Par email
                    </button>
                  </div>

                  {/* Search form */}
                  <form onSubmit={handleSearch}>
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {searchMethod === "card"
                          ? "Derniers 4 chiffres de la carte"
                          : "Adresse email"}
                      </label>
                      <input
                        type={searchMethod === "card" ? "text" : "email"}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder={
                          searchMethod === "card"
                            ? "1234"
                            : "votre.email@example.com"
                        }
                        maxLength={searchMethod === "card" ? 4 : undefined}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                      />
                    </div>

                    {errorMessage && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSearching}
                      className="w-full h-12 bg-[#cea427] hover:bg-[#cea427]-dark disabled:bg-slate-300 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isSearching ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">
                            progress_activity
                          </span>
                          <span>Recherche...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">
                            search
                          </span>
                          <span>Rechercher ma carte</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Info */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-blue-600">
                        info
                      </span>
                      <div className="text-sm text-blue-900">
                        <p className="font-bold mb-1">Comment trouver ma carte ?</p>
                        <p className="text-blue-700">
                          Les 4 derniers chiffres se trouvent sur votre carte
                          virtuelle ou dans l'email de confirmation que vous avez
                          reçu lors de l'achat.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Topup form */}
              {selectedCard && (
                <>
                  {/* Card found */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-slate-900">
                        Carte identifiée
                      </h2>
                      <button
                        onClick={() => {
                          setSelectedCard(null);
                          setSearchValue("");
                          setErrorMessage("");
                        }}
                        className="text-sm text-[#cea427] hover:text-[#cea427]-dark font-bold"
                      >
                        Changer de carte
                      </button>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <span className="material-symbols-outlined text-3xl text-slate-600">
                        credit_card
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">
                          {selectedCard.type
                            .replace("_", " ")
                            .toUpperCase()
                            .replace("VISA ", "Visa ")
                            .replace("MASTERCARD", "Mastercard")}{" "}
                          •••• {selectedCard.last4}
                        </p>
                        <p className="text-sm text-slate-600">
                          Solde actuel:{" "}
                          <span className="font-bold text-[#cea427]">
                            {formatAmount(selectedCard.balance)} FCFA
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Topup form */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-black text-slate-900 mb-6">
                      Montant de la recharge
                    </h2>
                    <TopupForm
                      cardId={selectedCard.id}
                      onSubmit={handleTopup}
                      isLoading={isSubmitting}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Sidebar - 1/3 width */}
            <div className="lg:col-span-1">
              <div className="sticky top-32 space-y-6">
                {/* Card preview */}
                {selectedCard && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">
                      Aperçu
                    </h3>
                    <CardPreview
                      cardType={
                        selectedCard.type as
                          | "visa_segment1"
                          | "visa_segment2"
                          | "visa_segment3"
                          | "mastercard"
                      }
                      holderName={selectedCard.holderName}
                      last4={selectedCard.last4}
                      expiryDate={selectedCard.expiryDate}
                    />
                  </div>
                )}

                {/* Info card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">
                    Pourquoi recharger ?
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-green-600 text-base">
                          bolt
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          Instantané
                        </p>
                        <p className="text-xs text-slate-600">
                          Fonds disponibles immédiatement
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-600 text-base">
                          security
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          Sécurisé
                        </p>
                        <p className="text-xs text-slate-600">
                          Paiement crypté et protégé
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-purple-600 text-base">
                          sync
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          Illimité
                        </p>
                        <p className="text-xs text-slate-600">
                          Rechargez autant que nécessaire
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined">support_agent</span>
                    <h3 className="font-bold">Besoin d'aide ?</h3>
                  </div>
                  <p className="text-sm text-white/80 mb-4">
                    Notre équipe est disponible pour vous assister
                  </p>
                  <a
                    href="#contact"
                    className="flex items-center justify-center w-full h-10 bg-white text-slate-900 font-bold rounded-lg hover:bg-white/90 transition-all"
                  >
                    Contacter le support
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
