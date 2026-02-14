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
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
  let filteredTransactions = transactions;

  // Filter by type
  if (filter !== "all") {
    filteredTransactions = filteredTransactions.filter((t) => t.type === filter);
  }

  // Filter by status
  if (statusFilter !== "all") {
    filteredTransactions = filteredTransactions.filter((t) => t.status === statusFilter);
  }

  // Filter by date range
  if (dateFrom) {
    filteredTransactions = filteredTransactions.filter(
      (t) => new Date(t.date) >= new Date(dateFrom)
    );
  }

  if (dateTo) {
    filteredTransactions = filteredTransactions.filter(
      (t) => new Date(t.date) <= new Date(dateTo)
    );
  }

  // Calculate total amount
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

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

  const exportToCSV = () => {
    const headers = ["Date", "Description", "Montant", "Statut"];
    const rows = filteredTransactions.map((t) => [
      formatDate(t.date),
      t.description,
      `${formatAmount(t.amount)} FCFA`,
      statusLabels[t.status],
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Historique</h3>
        <button
          onClick={exportToCSV}
          disabled={filteredTransactions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <span className="material-symbols-outlined text-base">download</span>
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "all"
                ? "bg-[#cea427] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilter("topup")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "topup"
                ? "bg-[#cea427] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Recharges
          </button>
          <button
            onClick={() => setFilter("payment")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "payment"
                ? "bg-[#cea427] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Paiements
          </button>
        </div>

        {/* Status and Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="completed">Complétée</option>
            <option value="pending">En cours</option>
            <option value="failed">Échouée</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
            placeholder="Date début"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
            placeholder="Date fin"
          />
        </div>

        {/* Total Amount */}
        {filteredTransactions.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">
              Total ({filteredTransactions.length} transactions)
            </span>
            <span
              className={`text-lg font-black ${
                totalAmount >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatAmount(totalAmount)} FCFA
            </span>
          </div>
        )}
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
