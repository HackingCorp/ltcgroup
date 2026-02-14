"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/vcard/AuthGuard";
import { cardsAPI, transactionsAPI, type CardResponse } from "@/lib/vcard-api";

export default function WithdrawalPage() {
  return (
    <AuthGuard>
      <WithdrawalContent />
    </AuthGuard>
  );
}

function WithdrawalContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cards, setCards] = useState<CardResponse[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const FEE_PERCENTAGE = 1.5; // 1.5% fee

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const { cards: userCards } = await cardsAPI.list();
      // Filter only ACTIVE cards with balance > 0
      const activeCards = userCards.filter(
        (card) => card.status === "ACTIVE" && card.balance > 0
      );
      setCards(activeCards);

      if (activeCards.length > 0) {
        setSelectedCardId(activeCards[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCard = cards.find((card) => card.id === selectedCardId);

  const calculateFee = (amt: number): number => {
    return (amt * FEE_PERCENTAGE) / 100;
  };

  const amountNum = parseFloat(amount) || 0;
  const fee = calculateFee(amountNum);
  const amountReceived = amountNum - fee;

  const handleMaxClick = () => {
    if (selectedCard) {
      setAmount(selectedCard.balance.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCardId) {
      setError("Veuillez sélectionner une carte");
      return;
    }

    if (!amount || amountNum <= 0) {
      setError("Veuillez entrer un montant valide");
      return;
    }

    if (!selectedCard) {
      setError("Carte sélectionnée invalide");
      return;
    }

    if (amountNum > selectedCard.balance) {
      setError("Solde insuffisant");
      return;
    }

    if (!phoneNumber) {
      setError("Veuillez entrer un numéro de téléphone");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await transactionsAPI.withdraw({
        card_id: selectedCardId,
        amount: amountNum,
        currency: "XOF",
        withdrawal_method: "MOBILE_MONEY",
        phone_number: phoneNumber,
      });

      setSuccess("Retrait effectué avec succès");

      // Reset form
      setAmount("");
      setPhoneNumber("");

      // Reload cards
      await loadCards();

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/services/solutions-financieres/vcard/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
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

  if (cards.length === 0) {
    return (
      <div className="px-6 lg:px-20 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300">
              account_balance
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-6 mb-3">
              Aucune carte disponible
            </h2>
            <p className="text-slate-600 mb-6">
              Vous n'avez pas de carte active avec un solde disponible pour effectuer un retrait.
            </p>
            <a
              href="/services/solutions-financieres/vcard/dashboard"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Retour au dashboard</span>
            </a>
          </div>
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
            Retrait de fonds
          </h1>
          <p className="text-lg text-slate-600">
            Transférez vos fonds vers Mobile Money
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Selector */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Sélectionner une carte
              </label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.card_type} - {card.card_number_masked} - {new Intl.NumberFormat("fr-FR").format(card.balance)} FCFA
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Card Balance */}
            {selectedCard && (
              <div className="bg-gradient-to-br from-[#cea427]/10 to-[#cea427]/5 rounded-lg p-4 border border-[#cea427]/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-bold">Solde disponible</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {new Intl.NumberFormat("fr-FR").format(selectedCard.balance)} FCFA
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-4xl text-[#cea427]">
                    account_balance_wallet
                  </span>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Montant à retirer
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={selectedCard?.balance}
                  step="1"
                  className="w-full h-12 px-4 pr-24 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#cea427] hover:bg-[#b38d1f] text-white text-sm font-bold rounded transition-all"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Fee Display */}
            {amountNum > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Montant demandé</span>
                  <span className="font-bold text-slate-900">
                    {new Intl.NumberFormat("fr-FR").format(amountNum)} FCFA
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Frais ({FEE_PERCENTAGE}%)</span>
                  <span className="font-bold text-red-600">
                    - {new Intl.NumberFormat("fr-FR").format(fee)} FCFA
                  </span>
                </div>
                <div className="border-t border-blue-300 pt-2 flex justify-between">
                  <span className="font-bold text-slate-900">Montant reçu</span>
                  <span className="font-black text-lg text-[#cea427]">
                    {new Intl.NumberFormat("fr-FR").format(amountReceived)} FCFA
                  </span>
                </div>
              </div>
            )}

            {/* Withdrawal Method */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Méthode de retrait
              </label>
              <div className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-slate-700 font-medium">
                <span className="material-symbols-outlined text-[#cea427] mr-2">
                  smartphone
                </span>
                Mobile Money
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Numéro de téléphone Mobile Money
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+225 XX XX XX XX XX"
                className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Le numéro doit être associé à un compte Mobile Money actif
              </p>
            </div>

            {/* Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-yellow-600">
                  info
                </span>
                <div className="text-sm text-yellow-800">
                  <p className="font-bold mb-1">Informations importantes</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Le retrait est traité dans un délai de 5 à 15 minutes</li>
                    <li>Des frais de {FEE_PERCENTAGE}% sont appliqués sur le montant retiré</li>
                    <li>Assurez-vous que votre compte Mobile Money est actif</li>
                    <li>Le montant minimum de retrait est de 500 FCFA</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !amount || !phoneNumber || amountNum <= 0}
              className="w-full h-12 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <span className="material-symbols-outlined">send</span>
                  <span>Confirmer le retrait</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
