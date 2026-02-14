"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/vcard/AuthGuard";
import {
  adminAPI,
  usersAPI,
  type UserResponse,
  type AdminStatsResponse,
  type TransactionResponse,
  type KYCStatus,
} from "@/lib/vcard-api";

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Transaction filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadUsers();
      loadTransactions();
    }
  }, [isAdmin, usersPage]);

  const checkAdminAccess = async () => {
    try {
      const user = await usersAPI.getMe();
      if (!user.is_admin) {
        router.push("/services/solutions-financieres/vcard/dashboard");
        return;
      }
      setIsAdmin(true);
    } catch (err) {
      router.push("/services/solutions-financieres/vcard/auth");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await adminAPI.getStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const { users: usersList, total } = await adminAPI.listUsers(usersPage, 20);
      setUsers(usersList);
      setTotalUsers(total);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const loadTransactions = async () => {
    try {
      const filters = {
        start_date: dateFrom || undefined,
        end_date: dateTo || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchQuery || undefined,
        page: 1,
        limit: 50,
      };

      const { transactions: txList } = await adminAPI.listTransactions(filters);
      setTransactions(txList);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
  };

  const handleApproveKYC = async (userId: string) => {
    try {
      await adminAPI.approveKYC(userId);
      await loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectKYC = async () => {
    if (!selectedUser || !rejectReason) {
      return;
    }

    try {
      await adminAPI.rejectKYC(selectedUser.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openRejectModal = (user: UserResponse) => {
    setSelectedUser(user);
    setShowRejectModal(true);
  };

  const getKYCBadge = (status: KYCStatus) => {
    const config = {
      PENDING: {
        label: "En attente",
        color: "bg-yellow-100 text-yellow-700",
      },
      VERIFIED: {
        label: "Approuvé",
        color: "bg-green-100 text-green-700",
      },
      REJECTED: {
        label: "Rejeté",
        color: "bg-red-100 text-red-700",
      },
    };

    const cfg = config[status];
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
        {cfg.label}
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
          <p className="text-slate-600 mt-4">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const usersPerPage = 20;
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  return (
    <div className="px-6 lg:px-20 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Administration
          </h1>
          <p className="text-lg text-slate-600">
            Gérez les utilisateurs, KYC et transactions
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-blue-500">
                  people
                </span>
                <span className="text-sm font-bold text-slate-600 uppercase">
                  Utilisateurs
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {new Intl.NumberFormat("fr-FR").format(stats.total_users)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-green-500">
                  credit_card
                </span>
                <span className="text-sm font-bold text-slate-600 uppercase">
                  Cartes actives
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {new Intl.NumberFormat("fr-FR").format(stats.total_cards)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#cea427]">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-[#cea427]">
                  trending_up
                </span>
                <span className="text-sm font-bold text-slate-600 uppercase">
                  Volume total
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {new Intl.NumberFormat("fr-FR").format(stats.total_volume)} FCFA
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-purple-500">
                  monetization_on
                </span>
                <span className="text-sm font-bold text-slate-600 uppercase">
                  Revenus
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {new Intl.NumberFormat("fr-FR").format(stats.revenue)} FCFA
              </p>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-black text-slate-900 mb-6">
            Gestion des utilisateurs
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Téléphone
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">
                    KYC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {user.phone}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getKYCBadge(user.kyc_status)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {user.kyc_status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApproveKYC(user.id)}
                              className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold rounded transition-all"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => openRejectModal(user)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded transition-all"
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                        {user.kyc_status === "VERIFIED" && (
                          <span className="text-xs text-green-600 font-medium">
                            Vérifié
                          </span>
                        )}
                        {user.kyc_status === "REJECTED" && (
                          <span className="text-xs text-red-600 font-medium">
                            Rejeté
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                disabled={usersPage === 1}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              <span className="text-sm text-slate-600 px-4">
                Page {usersPage} sur {totalPages}
              </span>

              <button
                onClick={() => setUsersPage((p) => Math.min(totalPages, p + 1))}
                disabled={usersPage === totalPages}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-black text-slate-900 mb-6">
            Transactions
          </h2>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
            >
              <option value="">Tous les types</option>
              <option value="TOPUP">Recharge</option>
              <option value="WITHDRAW">Retrait</option>
              <option value="PURCHASE">Achat</option>
              <option value="REFUND">Remboursement</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="COMPLETED">Complétée</option>
              <option value="PENDING">En cours</option>
              <option value="FAILED">Échouée</option>
            </select>
            <button
              onClick={loadTransactions}
              className="h-10 px-4 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all text-sm"
            >
              Filtrer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">
                    Montant
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-mono text-slate-600">
                      {tx.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">
                      {tx.transaction_type}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-right text-slate-900">
                      {new Intl.NumberFormat("fr-FR").format(tx.amount)} {tx.currency}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          tx.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : tx.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-black text-slate-900 mb-4">
                Rejeter la demande KYC
              </h3>

              <p className="text-sm text-slate-600 mb-4">
                Utilisateur: {selectedUser?.first_name} {selectedUser?.last_name}
              </p>

              <label className="block text-sm font-bold text-slate-700 mb-2">
                Raison du rejet
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-24 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent resize-none"
                placeholder="Expliquez pourquoi la demande est rejetée..."
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRejectKYC}
                  disabled={!rejectReason}
                  className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                    setSelectedUser(null);
                  }}
                  className="flex-1 h-10 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
