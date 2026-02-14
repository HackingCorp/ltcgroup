"use client";

import { useState } from "react";
import BalanceWidget from "@/components/vcard/BalanceWidget";
import TransactionList from "@/components/vcard/TransactionList";
import CardPreview from "@/components/vcard/CardPreview";

// MOCK DATA - Phase 1
// TODO Phase 2: Replace with real API calls
const MOCK_USER_CARDS = [
  {
    id: "vc_001",
    type: "visa_segment2",
    last4: "1234",
    balance: 45000,
    reserved: 5000,
    status: "active",
    expiryDate: "12/28",
    holderName: "JEAN DUPONT",
  },
];

const MOCK_TRANSACTIONS = [
  {
    id: "tx_001",
    date: "2026-02-14",
    description: "Recharge Mobile Money",
    amount: 25000,
    status: "completed" as const,
    type: "topup" as const,
  },
  {
    id: "tx_002",
    date: "2026-02-13",
    description: "Netflix Subscription",
    amount: -4500,
    status: "completed" as const,
    type: "payment" as const,
  },
  {
    id: "tx_003",
    date: "2026-02-12",
    description: "Amazon Purchase",
    amount: -12000,
    status: "completed" as const,
    type: "payment" as const,
  },
  {
    id: "tx_004",
    date: "2026-02-10",
    description: "Spotify Premium",
    amount: -2500,
    status: "completed" as const,
    type: "payment" as const,
  },
  {
    id: "tx_005",
    date: "2026-02-09",
    description: "Recharge E-nkap",
    amount: 50000,
    status: "completed" as const,
    type: "topup" as const,
  },
  {
    id: "tx_006",
    date: "2026-02-08",
    description: "Udemy Course",
    amount: -8500,
    status: "completed" as const,
    type: "payment" as const,
  },
  {
    id: "tx_007",
    date: "2026-02-07",
    description: "Google Cloud",
    amount: -15000,
    status: "completed" as const,
    type: "payment" as const,
  },
  {
    id: "tx_008",
    date: "2026-02-05",
    description: "PayPal Transfer",
    amount: -7500,
    status: "completed" as const,
    type: "payment" as const,
  },
  {
    id: "tx_009",
    date: "2026-02-04",
    description: "Apple iTunes",
    amount: -3000,
    status: "completed" as const,
    type: "payment" as const,
  },
  {
    id: "tx_010",
    date: "2026-02-01",
    description: "Recharge initiale",
    amount: 50000,
    status: "completed" as const,
    type: "topup" as const,
  },
];

export default function VCardDashboardPage() {
  // TODO Phase 2: Replace with real data fetching
  // const [isLoading, setIsLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState(
    MOCK_USER_CARDS[0]?.id || ""
  );

  const selectedCard = MOCK_USER_CARDS.find(
    (card) => card.id === selectedCardId
  );

  // Card status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        label: "Active",
        color: "bg-green-100 text-green-700",
        icon: "check_circle",
      },
      blocked: {
        label: "Bloquée",
        color: "bg-red-100 text-red-700",
        icon: "block",
      },
      expired: {
        label: "Expirée",
        color: "bg-slate-100 text-slate-700",
        icon: "schedule",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}
      >
        <span className="material-symbols-outlined text-sm">{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  if (!selectedCard) {
    return (
      <div className="px-6 lg:px-20 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <span className="material-symbols-outlined text-6xl text-slate-300">
              credit_card_off
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-6 mb-3">
              Aucune carte trouvée
            </h2>
            <p className="text-slate-600 mb-6">
              Vous n'avez pas encore de carte virtuelle. Commencez par en
              commander une.
            </p>
            <a
              href="/services/solutions-financieres/vcard/achat"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-[#cea427] hover:bg-[#cea427]-dark text-white font-bold rounded-lg transition-all shadow-lg"
            >
              <span className="material-symbols-outlined">add_card</span>
              <span>Commander une carte</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-20 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Mon Dashboard
          </h1>
          <p className="text-lg text-slate-600">
            Gérez vos cartes virtuelles et suivez vos transactions
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#cea427]">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[#cea427]">
                account_balance_wallet
              </span>
              <span className="text-sm font-bold text-slate-600 uppercase">
                Solde total
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {new Intl.NumberFormat("fr-FR").format(selectedCard.balance)} FCFA
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-green-500">
                trending_up
              </span>
              <span className="text-sm font-bold text-slate-600 uppercase">
                Recharges
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {MOCK_TRANSACTIONS.filter((t) => t.type === "topup").length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-blue-500">
                receipt
              </span>
              <span className="text-sm font-bold text-slate-600 uppercase">
                Transactions
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {MOCK_TRANSACTIONS.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            {/* Card details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">Ma carte</h2>
                {getStatusBadge(selectedCard.status)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                {/* Card preview */}
                <div>
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
                    showCVV={true}
                  />
                </div>

                {/* Card info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">
                      Numéro de carte
                    </p>
                    <p className="text-lg font-mono font-bold text-slate-900">
                      •••• •••• •••• {selectedCard.last4}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Date d'expiration
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedCard.expiryDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Type
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedCard.type
                          .replace("_", " ")
                          .toUpperCase()
                          .replace("VISA ", "Visa ")
                          .replace("MASTERCARD", "Mastercard")}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <button className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-all text-sm">
                      <span className="material-symbols-outlined text-base">
                        block
                      </span>
                      <span>Bloquer</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all text-sm">
                      <span className="material-symbols-outlined text-base">
                        download
                      </span>
                      <span>Export</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <TransactionList transactions={MOCK_TRANSACTIONS} />
            </div>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
              {/* Balance widget */}
              <BalanceWidget
                balance={selectedCard.balance}
                reserved={selectedCard.reserved}
                cardType={selectedCard.type}
                last4={selectedCard.last4}
              />

              {/* Quick actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">
                  Actions rapides
                </h3>
                <div className="space-y-3">
                  <a
                    href="/services/solutions-financieres/vcard/recharge"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#cea427]/10 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#cea427]">
                        add_circle
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Recharger</p>
                      <p className="text-xs text-slate-500">
                        Ajouter des fonds
                      </p>
                    </div>
                  </a>

                  <a
                    href="/services/solutions-financieres/vcard/achat"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600">
                        add_card
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Nouvelle carte
                      </p>
                      <p className="text-xs text-slate-500">
                        Commander une autre carte
                      </p>
                    </div>
                  </a>

                  <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors w-full text-left">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-600">
                        help
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Support</p>
                      <p className="text-xs text-slate-500">
                        Besoin d'aide ?
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Info banner */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                <div className="flex gap-3 mb-3">
                  <span className="material-symbols-outlined text-blue-600">
                    lightbulb
                  </span>
                  <h3 className="font-bold text-blue-900">Astuce</h3>
                </div>
                <p className="text-sm text-blue-800">
                  Rechargez votre carte avant vos achats importants pour éviter
                  les rejets de transaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
