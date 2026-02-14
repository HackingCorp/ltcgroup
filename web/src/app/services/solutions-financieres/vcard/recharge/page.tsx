"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopupForm from "@/components/vcard/TopupForm";
import CardPreview from "@/components/vcard/CardPreview";
import { cardsAPI, transactionsAPI, isAuthenticated, type CardResponse } from "@/lib/vcard-api";

export default function VCardRechargePage() {
  const router = useRouter();
  const [searchMethod, setSearchMethod] = useState<"card" | "list">("list");
  const [searchValue, setSearchValue] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const [userCards, setUserCards] = useState<CardResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/services/solutions-financieres/vcard/auth");
    } else {
      loadUserCards();
    }
  }, [router]);

  const loadUserCards = async () => {
    try {
      const { cards } = await cardsAPI.list();
      setUserCards(cards);
    } catch (error) {
      console.error("Failed to load cards:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setErrorMessage("");

    try {
      if (searchMethod === "card") {
        // Search by last4 digits
        const card = userCards.find(c => c.card_number_masked.slice(-4) === searchValue);
        if (card) {
          setSelectedCard(card);
        } else {
          setErrorMessage("Aucune carte trouvée avec ces informations");
          setSelectedCard(null);
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur lors de la recherche"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleTopup = async (amount: number, paymentMethod: string) => {
    if (!selectedCard) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      await transactionsAPI.topup({
        card_id: selectedCard.id,
        amount,
        currency: selectedCard.currency,
      });

      setSubmitStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur lors de la recharge"
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
              {/* Search/Select card */}
              {!selectedCard && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-black text-slate-900 mb-6">
                    Sélectionner votre carte
                  </h2>

                  {/* Search method selector */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setSearchMethod("list")}
                      className={`flex-1 h-10 px-4 font-bold rounded-lg transition-all ${
                        searchMethod === "list"
                          ? "bg-[#cea427] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Mes cartes
                    </button>
                    <button
                      onClick={() => setSearchMethod("card")}
                      className={`flex-1 h-10 px-4 font-bold rounded-lg transition-all ${
                        searchMethod === "card"
                          ? "bg-[#cea427] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Rechercher
                    </button>
                  </div>

                  {searchMethod === "list" ? (
                    // Card list
                    <div className="space-y-3">
                      {userCards.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">
                          Aucune carte trouvée
                        </p>
                      ) : (
                        userCards.map((card) => (
                          <button
                            key={card.id}
                            onClick={() => setSelectedCard(card)}
                            className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all text-left"
                          >
                            <span className="material-symbols-outlined text-3xl text-slate-600">
                              credit_card
                            </span>
                            <div className="flex-1">
                              <p className="font-bold text-slate-900">
                                {card.card_type} {card.card_number_masked}
                              </p>
                              <p className="text-sm text-slate-600">
                                Solde: {formatAmount(card.balance)} {card.currency}
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400">
                              chevron_right
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    // Search form
                    <form onSubmit={handleSearch}>
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Derniers 4 chiffres de la carte
                        </label>
                        <input
                          type="text"
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          placeholder="1234"
                          maxLength={4}
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
                  )}
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
                          {selectedCard.card_type} {selectedCard.card_number_masked}
                        </p>
                        <p className="text-sm text-slate-600">
                          Solde actuel:{" "}
                          <span className="font-bold text-[#cea427]">
                            {formatAmount(selectedCard.balance)} {selectedCard.currency}
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
                        selectedCard.card_type === "VISA"
                          ? "visa_segment2"
                          : "mastercard"
                      }
                      holderName="VOTRE NOM"
                      last4={selectedCard.card_number_masked.slice(-4)}
                      expiryDate={selectedCard.expiry_date}
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
