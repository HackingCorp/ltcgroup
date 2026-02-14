"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BalanceWidget from "@/components/vcard/BalanceWidget";
import TransactionList from "@/components/vcard/TransactionList";
import CardPreview from "@/components/vcard/CardPreview";
import {
  cardsAPI,
  transactionsAPI,
  authAPI,
  isAuthenticated,
  type CardResponse,
  type TransactionResponse
} from "@/lib/vcard-api";

export default function VCardDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userCards, setUserCards] = useState<CardResponse[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/services/solutions-financieres/vcard/auth");
    } else {
      loadData();
    }
  }, [router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { cards } = await cardsAPI.list();
      setUserCards(cards);

      if (cards.length > 0) {
        const firstCard = cards[0];
        setSelectedCardId(firstCard.id);
        await loadTransactions(firstCard.id);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (cardId: string) => {
    try {
      const { transactions: txs } = await transactionsAPI.list(cardId, 50, 0);
      setTransactions(txs);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const selectedCard = userCards.find((card) => card.id === selectedCardId);

  // Map API transactions to component format
  const mappedTransactions = transactions.map(tx => ({
    id: tx.id,
    date: tx.created_at.split('T')[0], // Extract date from ISO string
    description: tx.description || `${tx.transaction_type} - ${tx.amount} ${tx.currency}`,
    amount: tx.transaction_type === 'TOPUP' ? tx.amount : -tx.amount,
    status: "completed" as const,
    type: tx.transaction_type === 'TOPUP' ? "topup" as const : "payment" as const,
  }));

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
              {transactions.filter((t) => t.transaction_type === "TOPUP").length}
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
              {transactions.length}
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
                      selectedCard.card_type === "VISA"
                        ? "visa_segment2"
                        : "mastercard"
                    }
                    holderName="VOTRE NOM"
                    last4={selectedCard.card_number_masked.slice(-4)}
                    expiryDate={selectedCard.expiry_date}
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
                      {selectedCard.card_number_masked}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Date d'expiration
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedCard.expiry_date}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        Type
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedCard.card_type}
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
              <TransactionList transactions={mappedTransactions} />
            </div>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
              {/* Balance widget */}
              <BalanceWidget
                balance={selectedCard.balance}
                reserved={0}
                cardType={selectedCard.card_type === "VISA" ? "visa_segment2" : "mastercard"}
                last4={selectedCard.card_number_masked.slice(-4)}
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

                  <button
                    onClick={() => authAPI.logout()}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors w-full text-left"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-600">
                        logout
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Déconnexion</p>
                      <p className="text-xs text-slate-500">
                        Se déconnecter
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
