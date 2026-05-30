"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Lang = "fr" | "en";

const TRANSLATIONS: Record<string, { fr: string; en: string }> = {
  // Shell / Nav
  "nav.landing": { fr: "Accueil", en: "Home" },
  "nav.pricing": { fr: "Tarifs", en: "Pricing" },
  "nav.howit": { fr: "Comment \u00e7a marche", en: "How it works" },
  "nav.docs": { fr: "Documentation API", en: "API docs" },
  "nav.login": { fr: "Connexion", en: "Sign in" },
  "nav.signup": { fr: "Cr\u00e9er un compte", en: "Sign up" },
  "nav.reset": { fr: "Mot de passe oubli\u00e9", en: "Forgot password" },
  "nav.status": { fr: "Statut syst\u00e8me", en: "System status" },
  "nav.checkout": { fr: "Checkout", en: "Checkout" },

  // Merchant pages
  "m.overview": { fr: "Vue d'ensemble", en: "Overview" },
  "m.tx": { fr: "Transactions", en: "Transactions" },
  "m.links": { fr: "Liens de paiement", en: "Payment links" },
  "m.api": { fr: "API & Webhooks", en: "API & Webhooks" },
  "m.refunds": { fr: "Remboursements", en: "Refunds" },
  "m.payouts": { fr: "R\u00e8glements", en: "Payouts" },
  "m.team": { fr: "\u00c9quipe", en: "Team" },
  "m.kyc": { fr: "KYC", en: "KYC" },
  "m.reports": { fr: "Rapports", en: "Reports" },
  "m.notifs": { fr: "Notifications", en: "Notifications" },
  "m.billing": { fr: "Facturation Nkap", en: "Nkap billing" },
  "m.settings": { fr: "Param\u00e8tres", en: "Settings" },

  // Admin pages
  "a.overview": { fr: "Plateforme", en: "Platform" },
  "a.merchants": { fr: "Marchands", en: "Merchants" },
  "a.fees": { fr: "Pricing & frais", en: "Pricing & fees" },
  "a.webhooks": { fr: "Webhooks TouchPay", en: "TouchPay webhooks" },
  "a.health": { fr: "Sant\u00e9 syst\u00e8me", en: "System health" },
  "a.security": { fr: "S\u00e9curit\u00e9 & audit", en: "Security & audit" },
  "a.disputes": { fr: "Litiges & remboursements", en: "Disputes & refunds" },
  "a.users": { fr: "Utilisateurs internes", en: "Internal users" },
  "a.finance": { fr: "Finance", en: "Finance" },

  // Categories
  "cat.encaisser": { fr: "Encaissement", en: "Collect" },
  "cat.finance": { fr: "Finance", en: "Finance" },
  "cat.compte": { fr: "Compte", en: "Account" },
  "cat.dev": { fr: "D\u00e9veloppeur", en: "Developer" },
  "cat.platform": { fr: "Plateforme", en: "Platform" },
  "cat.ops": { fr: "Op\u00e9rations", en: "Operations" },
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
  "common.copied": { fr: "Copi\u00e9", en: "Copied" },
  "common.actions": { fr: "Actions", en: "Actions" },
  "common.details": { fr: "D\u00e9tails", en: "Details" },
  "common.live": { fr: "Production", en: "Live" },
  "common.test": { fr: "Test", en: "Test" },
  "common.amount": { fr: "Montant", en: "Amount" },
  "common.status": { fr: "Statut", en: "Status" },
  "common.date": { fr: "Date", en: "Date" },
  "common.method": { fr: "M\u00e9thode", en: "Method" },
  "common.ref": { fr: "R\u00e9f\u00e9rence", en: "Reference" },
  "common.customer": { fr: "Client", en: "Customer" },
  "common.email": { fr: "Email", en: "Email" },
  "common.phone": { fr: "T\u00e9l\u00e9phone", en: "Phone" },
  "common.merchant": { fr: "Marchand", en: "Merchant" },
  "common.success": { fr: "R\u00e9ussi", en: "Succeeded" },
  "common.pending": { fr: "En attente", en: "Pending" },
  "common.failed": { fr: "\u00c9chou\u00e9", en: "Failed" },
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
