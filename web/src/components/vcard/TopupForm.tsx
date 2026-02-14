"use client";

import { useState } from "react";

interface TopupFormProps {
  cardId: string;
  onSubmit: (amount: number, paymentMethod: string) => void;
  isLoading?: boolean;
}

const SUGGESTED_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export default function TopupForm({
  cardId,
  onSubmit,
  isLoading = false,
}: TopupFormProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "enkap">(
    "mobile_money"
  );
  const [customAmount, setCustomAmount] = useState(false);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat("fr-FR").format(value);
  };

  const handleSuggestedAmount = (value: number) => {
    setAmount(value.toString());
    setCustomAmount(false);
  };

  const handleCustomAmount = (value: string) => {
    // Remove non-digits
    const numericValue = value.replace(/\D/g, "");
    setAmount(numericValue);
    setCustomAmount(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount, 10);
    if (numAmount >= 500) {
      onSubmit(numAmount, paymentMethod);
    }
  };

  const amountNumber = parseInt(amount, 10) || 0;
  const fees = amountNumber > 0 ? Math.ceil(amountNumber * 0.015) : 0; // 1.5% fees
  const total = amountNumber + fees;

  const isValidAmount = amountNumber >= 500 && amountNumber <= 1000000;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {/* Amount selection */}
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-3">
          Montant de la recharge
        </label>

        {/* Suggested amounts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {SUGGESTED_AMOUNTS.map((suggestedAmount) => (
            <button
              key={suggestedAmount}
              type="button"
              onClick={() => handleSuggestedAmount(suggestedAmount)}
              className={`p-4 rounded-lg border-2 font-bold transition-all ${
                amount === suggestedAmount.toString() && !customAmount
                  ? "border-[#cea427] bg-[#cea427]/5 text-[#cea427]"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              {formatAmount(suggestedAmount)} FCFA
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => handleCustomAmount(e.target.value)}
            placeholder="Ou entrez un montant personnalisé"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
          />
          {amount && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
              FCFA
            </span>
          )}
        </div>

        {/* Amount validation message */}
        {amount && !isValidAmount && (
          <p className="mt-2 text-sm text-red-600">
            Le montant doit être entre 500 et 1,000,000 FCFA
          </p>
        )}
      </div>

      {/* Payment method */}
      <div>
        <label className="block text-sm font-bold text-slate-900 mb-3">
          Méthode de paiement
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <p className="font-bold text-slate-900">Mobile Money</p>
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
                <p className="text-xs text-slate-500">Paiement par carte</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Summary */}
      {amountNumber > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Montant</span>
            <span className="font-medium text-slate-900">
              {formatAmount(amountNumber)} FCFA
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Frais de transaction (1.5%)</span>
            <span className="font-medium text-slate-900">
              {formatAmount(fees)} FCFA
            </span>
          </div>
          <div className="pt-2 border-t border-slate-300 flex justify-between">
            <span className="font-bold text-slate-900">Total à payer</span>
            <span className="font-black text-xl text-[#cea427]">
              {formatAmount(total)} FCFA
            </span>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!isValidAmount || isLoading}
        className="w-full h-12 bg-[#cea427] hover:bg-[#cea427]-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
            <span>Traitement en cours...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">payment</span>
            <span>Recharger maintenant</span>
          </>
        )}
      </button>

      {/* Info */}
      <div className="flex gap-2 text-xs text-slate-500">
        <span className="material-symbols-outlined text-base">info</span>
        <p>
          Le rechargement sera effectif immédiatement après confirmation du
          paiement
        </p>
      </div>
    </form>
  );
}
