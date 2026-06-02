"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import dynamic from "next/dynamic";

type Lang = "fr" | "en";

const TRANSLATIONS: Record<string, { fr: string; en: string }> = {
  // Shell / Nav
  "nav.landing": { fr: "Accueil", en: "Home" },
  "nav.pricing": { fr: "Tarifs", en: "Pricing" },
  "nav.howit": { fr: "Comment ça marche", en: "How it works" },
  "nav.docs": { fr: "Documentation API", en: "API docs" },
  "nav.login": { fr: "Connexion", en: "Sign in" },
  "nav.signup": { fr: "Créer un compte", en: "Sign up" },
  "nav.reset": { fr: "Mot de passe oublié", en: "Forgot password" },
  "nav.status": { fr: "Statut système", en: "System status" },
  "nav.checkout": { fr: "Checkout", en: "Checkout" },

  // Merchant pages
  "m.overview": { fr: "Vue d'ensemble", en: "Overview" },
  "m.tx": { fr: "Transactions", en: "Transactions" },
  "m.links": { fr: "Liens de paiement", en: "Payment links" },
  "m.api": { fr: "API & Webhooks", en: "API & Webhooks" },
  "m.refunds": { fr: "Remboursements", en: "Refunds" },
  "m.payouts": { fr: "Règlements", en: "Payouts" },
  "m.team": { fr: "Équipe", en: "Team" },
  "m.kyc": { fr: "KYC", en: "KYC" },
  "m.reports": { fr: "Rapports", en: "Reports" },
  "m.notifs": { fr: "Notifications", en: "Notifications" },
  "m.billing": { fr: "Facturation Nkap", en: "Nkap billing" },
  "m.settings": { fr: "Paramètres", en: "Settings" },
  "m.logout": { fr: "Déconnexion", en: "Log out" },

  // Admin pages
  "a.overview": { fr: "Plateforme", en: "Platform" },
  "a.merchants": { fr: "Marchands", en: "Merchants" },
  "a.fees": { fr: "Pricing & frais", en: "Pricing & fees" },
  "a.webhooks": { fr: "Webhooks TouchPay", en: "TouchPay webhooks" },
  "a.health": { fr: "Santé système", en: "System health" },
  "a.security": { fr: "Sécurité & audit", en: "Security & audit" },
  "a.disputes": { fr: "Litiges & remboursements", en: "Disputes & refunds" },
  "a.users": { fr: "Utilisateurs internes", en: "Internal users" },
  "a.finance": { fr: "Finance", en: "Finance" },

  // Categories
  "cat.encaisser": { fr: "Encaissement", en: "Collect" },
  "cat.finance": { fr: "Finance", en: "Finance" },
  "cat.compte": { fr: "Compte", en: "Account" },
  "cat.dev": { fr: "Développeur", en: "Developer" },
  "cat.platform": { fr: "Plateforme", en: "Platform" },
  "cat.ops": { fr: "Opérations", en: "Operations" },
  "cat.gov": { fr: "Gouvernance", en: "Governance" },

  // Common UI
  "common.search": { fr: "Rechercher", en: "Search" },
  "common.export": { fr: "Exporter", en: "Export" },
  "common.filter": { fr: "Filtrer", en: "Filter" },
  "common.new": { fr: "Nouveau", en: "New" },
  "common.cancel": { fr: "Annuler", en: "Cancel" },
  "common.save": { fr: "Enregistrer", en: "Save" },
  "common.continue": { fr: "Continuer", en: "Continue" },
  "common.back": { fr: "Retour", en: "Back" },
  "common.viewall": { fr: "Voir tout", en: "View all" },
  "common.copy": { fr: "Copier", en: "Copy" },
  "common.copied": { fr: "Copié", en: "Copied" },
  "common.actions": { fr: "Actions", en: "Actions" },
  "common.details": { fr: "Détails", en: "Details" },
  "common.live": { fr: "Production", en: "Live" },
  "common.test": { fr: "Test", en: "Test" },
  "common.amount": { fr: "Montant", en: "Amount" },
  "common.status": { fr: "Statut", en: "Status" },
  "common.date": { fr: "Date", en: "Date" },
  "common.method": { fr: "Méthode", en: "Method" },
  "common.ref": { fr: "Référence", en: "Reference" },
  "common.customer": { fr: "Client", en: "Customer" },
  "common.email": { fr: "Email", en: "Email" },
  "common.phone": { fr: "Téléphone", en: "Phone" },
  "common.merchant": { fr: "Marchand", en: "Merchant" },
  "common.success": { fr: "Réussi", en: "Succeeded" },
  "common.pending": { fr: "En attente", en: "Pending" },
  "common.failed": { fr: "Échoué", en: "Failed" },
};

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  /* Always start with "fr" to match SSR. Read localStorage after mount. */
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nkap_lang");
      if (saved === "fr" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("nkap_lang", l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = TRANSLATIONS[key];
      if (!entry) return key;
      return entry[lang] || entry.fr || key;
    },
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Inline bilingual text component */
export function T({ fr, en }: { fr: ReactNode; en?: ReactNode }) {
  const { lang } = useLang();
  return <>{lang === "en" ? (en ?? fr) : (fr ?? en ?? "")}</>;
}

export { TRANSLATIONS };
export type { Lang };
