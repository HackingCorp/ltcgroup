"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authAPI, isAuthenticated } from "@/lib/vcard-api";

export default function VCardAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/services/solutions-financieres/vcard/dashboard");
    }
  }, [router]);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await authAPI.login(loginData.email, loginData.password);
      // Redirect to dashboard
      router.push("/services/solutions-financieres/vcard/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur de connexion"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Validate password match
      if (registerData.password !== registerData.confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }

      await authAPI.register({
        email: registerData.email,
        phone: registerData.phone,
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        password: registerData.password,
      });

      // Redirect to dashboard
      router.push("/services/solutions-financieres/vcard/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur lors de l'inscription"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#10151e] to-slate-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">vCard</h1>
          <p className="text-white/80">
            {mode === "login"
              ? "Connectez-vous à votre compte"
              : "Créez votre compte"}
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => {
                setMode("login");
                setErrorMessage("");
              }}
              className={`flex-1 h-10 px-4 font-bold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-[#cea427] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => {
                setMode("register");
                setErrorMessage("");
              }}
              className={`flex-1 h-10 px-4 font-bold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-[#cea427] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-red-600">
                  error
                </span>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#cea427] hover:bg-[#cea427]-dark disabled:bg-slate-300 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    <span>Connexion...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">login</span>
                    <span>Se connecter</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Register form */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={registerData.first_name}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        first_name: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                    placeholder="Jean"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={registerData.last_name}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        last_name: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      email: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={registerData.phone}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, phone: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                  placeholder="6XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      password: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#cea427] focus:ring-2 focus:ring-[#cea427]/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#cea427] hover:bg-[#cea427]-dark disabled:bg-slate-300 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    <span>Inscription...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">
                      person_add
                    </span>
                    <span>Créer mon compte</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <a
            href="/services/solutions-financieres/vcard"
            className="text-white/80 hover:text-white text-sm font-bold transition-colors"
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
