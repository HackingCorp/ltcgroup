"use client";

import { useState } from "react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  type: "topup" | "payment";
}

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({
  transactions,
}: TransactionListProps) {
  const [filter, setFilter] = useState<"all" | "topup" | "payment">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatAmount = (amount: number) => {
    const formatted = new Intl.NumberFormat("fr-FR").format(Math.abs(amount));
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Filter transactions
  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.type === filter);

  // Paginate
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const statusColors = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
  };

  const statusLabels = {
    completed: "Terminé",
    pending: "En cours",
    failed: "Échoué",
  };

  return (
    <div className="w-full">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold text-slate-900">Historique</h3>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "all"
                ? "bg-[#cea427] text-[#10151e]"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilter("topup")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "topup"
                ? "bg-[#cea427] text-[#10151e]"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Recharges
          </button>
          <button
            onClick={() => setFilter("payment")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "payment"
                ? "bg-[#cea427] text-[#10151e]"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Paiements
          </button>
        </div>
      </div>

      {/* Transactions list */}
      {paginatedTransactions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <span className="material-symbols-outlined text-5xl text-slate-300">
            receipt_long
          </span>
          <p className="mt-4 text-slate-500">Aucune transaction trouvée</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">
                    Montant
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">
                      {transaction.description}
                    </td>
                    <td
                      className={`px-4 py-4 text-sm font-bold text-right ${
                        transaction.amount >= 0
                          ? "text-green-600"
                          : "text-slate-900"
                      }`}
                    >
                      {formatAmount(transaction.amount)} FCFA
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          statusColors[transaction.status]
                        }`}
                      >
                        {statusLabels[transaction.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paginatedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white border border-slate-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      statusColors[transaction.status]
                    }`}
                  >
                    {statusLabels[transaction.status]}
                  </span>
                </div>
                <p
                  className={`text-lg font-bold ${
                    transaction.amount >= 0 ? "text-green-600" : "text-slate-900"
                  }`}
                >
                  {formatAmount(transaction.amount)} FCFA
                </p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined">
                  chevron_left
                </span>
              </button>

              <span className="text-sm text-slate-600 px-4">
                Page {currentPage} sur {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
