"use client";

import Link from "next/link";

interface BalanceWidgetProps {
  balance: number;
  reserved?: number;
  cardType: string;
  last4: string;
}

export default function BalanceWidget({
  balance,
  reserved = 0,
  cardType,
  last4,
}: BalanceWidgetProps) {
  const available = balance - reserved;
  const usagePercent = balance > 0 ? Math.round((reserved / balance) * 100) : 0;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-[#10151e] to-slate-900 rounded-2xl p-6 text-white shadow-xl">
      {/* Card identifier */}
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-white/80">
          credit_card
        </span>
        <span className="text-sm font-medium text-white/80">
          {cardType.toUpperCase()} •••• {last4}
        </span>
      </div>

      {/* Main balance */}
      <div className="mb-6">
        <p className="text-sm text-white/80 mb-2">Solde disponible</p>
        <p className="text-4xl font-black">{formatAmount(available)} FCFA</p>
      </div>

      {/* Reserved amount */}
      {reserved > 0 && (
        <div className="mb-6 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/80">Montant réservé</span>
            <span className="font-bold">{formatAmount(reserved)} FCFA</span>
          </div>
        </div>
      )}

      {/* Usage indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-white/80 mb-2">
          <span>Utilisation</span>
          <span>{usagePercent}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
      </div>

      {/* Action button */}
      <Link
        href="/services/solutions-financieres/vcard/recharge"
        className="flex items-center justify-center gap-2 w-full h-12 bg-white text-[#cea427] rounded-lg font-bold hover:bg-white/90 transition-all shadow-lg"
      >
        <span className="material-symbols-outlined">add_circle</span>
        <span>Recharger la carte</span>
      </Link>

      {/* Total balance info */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/70">Solde total</span>
          <span className="font-bold">{formatAmount(balance)} FCFA</span>
        </div>
      </div>
    </div>
  );
}
