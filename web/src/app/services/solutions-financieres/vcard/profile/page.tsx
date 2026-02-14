"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/vcard/AuthGuard";
import { usersAPI, authAPI, type UserResponse } from "@/lib/vcard-api";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Edit form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const userData = await usersAPI.getMe();
      setUser(userData);
      setFirstName(userData.first_name);
      setLastName(userData.last_name);
      setPhone(userData.phone);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await usersAPI.updateMe({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      });
      setUser(updated);
      setIsEditing(false);
      setSuccess("Profil mis à jour avec succès");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setIsChangingPassword(true);
    setError("");
    setSuccess("");

    try {
      await usersAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess("Mot de passe modifié avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
  };

  const getKYCBadge = (status: string) => {
    const config = {
      PENDING: {
        label: "En attente",
        color: "bg-yellow-100 text-yellow-700",
      },
      VERIFIED: {
        label: "Vérifié",
        color: "bg-green-100 text-green-700",
      },
      REJECTED: {
        label: "Rejeté",
        color: "bg-red-100 text-red-700",
      },
    };

    const cfg = config[status as keyof typeof config] || config.PENDING;
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
          <p className="text-slate-600 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="px-6 lg:px-20 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Mon Profil
          </h1>
          <p className="text-lg text-slate-600">
            Gérez vos informations personnelles et paramètres de sécurité
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

        {/* Profile Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">
              Informations personnelles
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Modifier</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email
              </label>
              <div className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-slate-600">
                {user.email}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Prénom
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
                />
              ) : (
                <div className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-slate-900">
                  {user.first_name}
                </div>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nom
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
                />
              ) : (
                <div className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-slate-900">
                  {user.last_name}
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Téléphone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
                />
              ) : (
                <div className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-slate-900">
                  {user.phone}
                </div>
              )}
            </div>

            {/* KYC Status */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Statut KYC
              </label>
              <div className="flex items-center gap-3">
                {getKYCBadge(user.kyc_status)}
                <Link
                  href="/services/solutions-financieres/vcard/kyc"
                  className="text-sm text-[#cea427] hover:text-[#b38d1f] font-bold"
                >
                  Voir les détails
                </Link>
              </div>
            </div>

            {/* Member Since */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Membre depuis
              </label>
              <div className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-slate-600">
                {new Date(user.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 h-12 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">
                        progress_activity
                      </span>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">save</span>
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFirstName(user.first_name);
                    setLastName(user.last_name);
                    setPhone(user.phone);
                  }}
                  className="flex-1 h-12 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-black text-slate-900 mb-6">
            Changer le mot de passe
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cea427] focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full h-12 bg-[#cea427] hover:bg-[#b38d1f] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                  <span>Modification...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock</span>
                  <span>Changer le mot de passe</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">Session</h2>
          <button
            onClick={handleLogout}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Se déconnecter</span>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
          <h2 className="text-xl font-black text-red-900 mb-4">Zone dangereuse</h2>
          <p className="text-sm text-slate-600 mb-4">
            La suppression de votre compte est permanente et irréversible. Toutes vos données seront supprimées.
          </p>
          <button
            disabled
            className="w-full h-12 bg-red-100 text-red-400 font-bold rounded-lg cursor-not-allowed"
          >
            Supprimer mon compte (Bientôt disponible)
          </button>
        </div>
      </div>
    </div>
  );
}
