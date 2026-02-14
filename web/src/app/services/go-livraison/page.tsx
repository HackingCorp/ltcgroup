"use client";

import Link from "next/link";
import { useLanguage } from "@/i18n";

const translations = {
  fr: {
    nav: {
      services: "Services",
      howItWorks: "Comment ça marche",
      pricing: "Tarifs",
      partners: "Partenaires",
      trackPlaceholder: "Suivre un colis...",
      requestDelivery: "Demander une course",
    },
    hero: {
      badge: "Disponible à Yaoundé & Douala",
      title: "Vos colis livrés en un",
      titleHighlight: "clin d'œil",
      description:
        "La solution logistique urbaine rapide, fiable et sécurisée. Du pli confidentiel au colis volumineux, nous assurons le dernier kilomètre pour vous.",
      trackingPlaceholder: "Entrez votre numéro de suivi",
      trackButton: "Suivre",
      satisfiedClients: "Clients satisfaits ce mois-ci",
      lastDelivery: "Dernière livraison",
      lastDeliveryText: "Livré à Akwa, Douala il y a 5 min",
    },
    services: {
      title: "Nos Services de Livraison",
      subtitle:
        "Des solutions logistiques sur mesure adaptées aux besoins personnels et professionnels du Cameroun.",
      express: {
        title: "Livraison Express",
        description:
          "Le moyen le plus rapide de déplacer de petits colis à travers la ville. Nos motos se faufilent dans le trafic pour vous.",
        feature1: "Moins de 60 min",
        feature2: "Suivi GPS temps réel",
      },
      courier: {
        title: "Courrier Professionnel",
        description:
          "Gestion sécurisée et confidentielle de vos documents sensibles, factures et plis urgents entre entreprises.",
        feature1: "Preuve de livraison",
        feature2: "Confidentialité garantie",
      },
      ecommerce: {
        title: "Logistique E-commerce",
        description:
          "Solutions complètes pour les vendeurs en ligne : stockage, emballage et expédition vers vos clients finaux.",
        feature1: "Paiement à la livraison",
        feature2: "Retours simplifiés",
      },
    },
    howItWorks: {
      title: "Comment ça marche ?",
      step1: {
        title: "Commandez",
        description:
          "Via notre application mobile ou site web. Estimez le coût instantanément.",
      },
      step2: {
        title: "Ramassage",
        description:
          "Le livreur Go le plus proche récupère votre colis en quelques minutes.",
      },
      step3: {
        title: "Livraison",
        description:
          "Suivez le trajet en temps réel jusqu'à la remise en main propre.",
      },
      cta: "Lancer une livraison",
    },
    pricing: {
      title: "Tarification Transparente",
      subtitle: "Pas de frais cachés. Payez selon la distance et le type de colis.",
      popular: "POPULAIRE",
      perDelivery: "/ course standard",
      viewZones: "Voir la carte des zones",
      yaounde: {
        title: "Zone Yaoundé",
        price: "500 FCFA",
        feature1: "Centre-ville & quartiers périphériques",
        feature2: "Livraison < 45 min",
        feature3: "Assurance jusqu'à 50.000 FCFA",
      },
      douala: {
        title: "Zone Douala",
        price: "500 FCFA",
        feature1: "Akwa, Bonanjo, Bali & environs",
        feature2: "Livraison < 60 min (selon trafic)",
        feature3: "Assurance jusqu'à 50.000 FCFA",
      },
    },
    partners: {
      badge: "BUSINESS",
      title: "Développez votre commerce avec Go Livraison",
      description:
        "Restaurants, e-commerçants, pharmacies : offrez la livraison à vos clients sans gérer de flotte. Intégration API disponible.",
      stat1: "+30% de ventes",
      stat2: "Gain de temps",
      formTitle: "Devenir partenaire",
      companyName: "Nom de l'entreprise",
      email: "Email professionnel",
      phone: "Numéro de téléphone",
      submit: "Être recontacté",
    },
    app: {
      title: "La livraison dans votre poche",
      description:
        "Téléchargez l'application Go Livraison pour suivre vos colis, commander une course et gérer votre historique en toute simplicité.",
      downloadOn: "Télécharger sur",
      appStore: "App Store",
      availableOn: "DISPONIBLE SUR",
      googlePlay: "Google Play",
      yourDriver: "Votre livreur",
      arrivesIn: "Arrive dans 5 min",
    },
    footer: {
      subsidiary: "Une filiale de LTC GROUP SARL.",
      location: "Siège social: Yaoundé, Cameroun.",
      company: "Entreprise",
      about: "À propos",
      careers: "Carrières",
      press: "Presse",
      help: "Aide",
      helpCenter: "Centre d'aide",
      terms: "Termes & Conditions",
      privacy: "Confidentialité",
      contact: "Contact",
      rights: "© 2024 Go Livraison. Tous droits réservés.",
      systemStatus: "Systèmes opérationnels",
    },
    back: "Retour à l'accueil",
  },
  en: {
    nav: {
      services: "Services",
      howItWorks: "How it works",
      pricing: "Pricing",
      partners: "Partners",
      trackPlaceholder: "Track a package...",
      requestDelivery: "Request delivery",
    },
    hero: {
      badge: "Available in Yaoundé & Douala",
      title: "Your packages delivered in the",
      titleHighlight: "blink of an eye",
      description:
        "The fast, reliable and secure urban logistics solution. From confidential documents to bulky parcels, we handle the last mile for you.",
      trackingPlaceholder: "Enter your tracking number",
      trackButton: "Track",
      satisfiedClients: "Satisfied clients this month",
      lastDelivery: "Last delivery",
      lastDeliveryText: "Delivered to Akwa, Douala 5 min ago",
    },
    services: {
      title: "Our Delivery Services",
      subtitle:
        "Tailored logistics solutions adapted to personal and professional needs in Cameroon.",
      express: {
        title: "Express Delivery",
        description:
          "The fastest way to move small packages across the city. Our motorcycles navigate through traffic for you.",
        feature1: "Under 60 min",
        feature2: "Real-time GPS tracking",
      },
      courier: {
        title: "Professional Courier",
        description:
          "Secure and confidential handling of your sensitive documents, invoices and urgent mail between businesses.",
        feature1: "Proof of delivery",
        feature2: "Guaranteed confidentiality",
      },
      ecommerce: {
        title: "E-commerce Logistics",
        description:
          "Complete solutions for online sellers: storage, packaging and shipping to your end customers.",
        feature1: "Cash on delivery",
        feature2: "Simplified returns",
      },
    },
    howItWorks: {
      title: "How does it work?",
      step1: {
        title: "Order",
        description:
          "Via our mobile app or website. Get an instant cost estimate.",
      },
      step2: {
        title: "Pickup",
        description:
          "The nearest Go driver picks up your package within minutes.",
      },
      step3: {
        title: "Delivery",
        description:
          "Track the journey in real-time until hand-to-hand delivery.",
      },
      cta: "Start a delivery",
    },
    pricing: {
      title: "Transparent Pricing",
      subtitle: "No hidden fees. Pay according to distance and package type.",
      popular: "POPULAR",
      perDelivery: "/ standard delivery",
      viewZones: "View zone map",
      yaounde: {
        title: "Yaoundé Zone",
        price: "500 FCFA",
        feature1: "City center & surrounding neighborhoods",
        feature2: "Delivery < 45 min",
        feature3: "Insurance up to 50,000 FCFA",
      },
      douala: {
        title: "Douala Zone",
        price: "500 FCFA",
        feature1: "Akwa, Bonanjo, Bali & surroundings",
        feature2: "Delivery < 60 min (traffic dependent)",
        feature3: "Insurance up to 50,000 FCFA",
      },
    },
    partners: {
      badge: "BUSINESS",
      title: "Grow your business with Go Livraison",
      description:
        "Restaurants, e-commerce sellers, pharmacies: offer delivery to your customers without managing a fleet. API integration available.",
      stat1: "+30% in sales",
      stat2: "Time savings",
      formTitle: "Become a partner",
      companyName: "Company name",
      email: "Professional email",
      phone: "Phone number",
      submit: "Get contacted",
    },
    app: {
      title: "Delivery in your pocket",
      description:
        "Download the Go Livraison app to track your packages, request a delivery and manage your history with ease.",
      downloadOn: "Download on",
      appStore: "App Store",
      availableOn: "AVAILABLE ON",
      googlePlay: "Google Play",
      yourDriver: "Your driver",
      arrivesIn: "Arrives in 5 min",
    },
    footer: {
      subsidiary: "A subsidiary of LTC GROUP SARL.",
      location: "Headquarters: Yaoundé, Cameroon.",
      company: "Company",
      about: "About",
      careers: "Careers",
      press: "Press",
      help: "Help",
      helpCenter: "Help Center",
      terms: "Terms & Conditions",
      privacy: "Privacy",
      contact: "Contact",
      rights: "© 2024 Go Livraison. All rights reserved.",
      systemStatus: "Systems operational",
    },
    back: "Back to home",
  },
};

export default function GoLivraisonPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="text-[#137fec]">
                <span className="material-symbols-outlined !text-[32px]">
                  local_shipping
                </span>
              </div>
              <span className="text-slate-900 text-xl font-bold tracking-tight">
                Go Livraison
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                className="text-slate-700 text-sm font-medium hover:text-[#137fec] transition-colors"
                href="#services"
              >
                {t.nav.services}
              </a>
              <a
                className="text-slate-700 text-sm font-medium hover:text-[#137fec] transition-colors"
                href="#comment-ca-marche"
              >
                {t.nav.howItWorks}
              </a>
              <a
                className="text-slate-700 text-sm font-medium hover:text-[#137fec] transition-colors"
                href="#tarifs"
              >
                {t.nav.pricing}
              </a>
              <a
                className="text-slate-700 text-sm font-medium hover:text-[#137fec] transition-colors"
                href="#partenaires"
              >
                {t.nav.partners}
              </a>
            </nav>

            {/* Action Group */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="relative hidden lg:block">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <span className="material-symbols-outlined !text-[20px]">
                    search
                  </span>
                </span>
                <input
                  className="w-48 py-2 pl-10 pr-4 text-sm bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-[#137fec]/20 placeholder:text-slate-400"
                  placeholder={t.nav.trackPlaceholder}
                  type="text"
                />
              </div>
              <button className="bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold py-2.5 px-5 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                <span>{t.nav.requestDelivery}</span>
                <span className="material-symbols-outlined !text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#24D469]/10 text-[#24D469] w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#24D469] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#24D469]"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t.hero.badge}
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                {t.hero.title}{" "}
                <span className="text-[#137fec] relative inline-block">
                  {t.hero.titleHighlight}
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-3 text-[#24D469]/30 -z-10"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 10"
                  >
                    <path
                      d="M0 5 Q 50 10 100 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                {t.hero.description}
              </p>

              {/* Hero Tracking Input */}
              <div className="mt-4 p-2 bg-white rounded-xl shadow-lg border border-slate-100 max-w-md flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center px-4 bg-slate-50 rounded-lg h-12 sm:h-auto">
                  <span className="material-symbols-outlined text-slate-400 mr-3">
                    package_2
                  </span>
                  <input
                    className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-base"
                    placeholder={t.hero.trackingPlaceholder}
                    type="text"
                  />
                </div>
                <button className="bg-[#24D469] hover:bg-green-500 text-white font-bold h-12 px-6 rounded-lg transition-all shadow-md active:scale-95 whitespace-nowrap">
                  {t.hero.trackButton}
                </button>
              </div>

              <div className="flex items-center gap-6 mt-2">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500 !text-[20px]">
                      person
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500 !text-[20px]">
                      person
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500 !text-[20px]">
                      person
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    +2k
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {t.hero.satisfiedClients}
                </p>
              </div>
            </div>

            {/* Visual */}
            <div className="relative mt-10 lg:mt-0">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#137fec]/20 to-[#24D469]/20 rounded-full blur-3xl opacity-50 -z-10"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white aspect-[4/3] group">
                <div className="w-full h-full bg-gradient-to-br from-[#137fec]/10 to-[#24D469]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined !text-[120px] text-[#137fec]/30">
                    two_wheeler
                  </span>
                </div>
                {/* Floating Badge */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-4">
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">
                      {t.hero.lastDelivery}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {t.hero.lastDeliveryText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        className="py-20 bg-slate-50 border-t border-slate-100"
        id="services"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t.services.title}
            </h2>
            <p className="text-slate-600 text-lg">{t.services.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Express */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-[#137fec]/10 text-[#137fec] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#137fec] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined !text-[32px]">
                  two_wheeler
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t.services.express.title}</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {t.services.express.description}
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-slate-500">
                  <span className="material-symbols-outlined text-green-500 mr-2 !text-[18px]">
                    check
                  </span>
                  {t.services.express.feature1}
                </li>
                <li className="flex items-center text-sm text-slate-500">
                  <span className="material-symbols-outlined text-green-500 mr-2 !text-[18px]">
                    check
                  </span>
                  {t.services.express.feature2}
                </li>
              </ul>
            </div>

            {/* Card 2: Courier */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined !text-[32px]">
                  folder_shared
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t.services.courier.title}</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {t.services.courier.description}
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-slate-500">
                  <span className="material-symbols-outlined text-green-500 mr-2 !text-[18px]">
                    check
                  </span>
                  {t.services.courier.feature1}
                </li>
                <li className="flex items-center text-sm text-slate-500">
                  <span className="material-symbols-outlined text-green-500 mr-2 !text-[18px]">
                    check
                  </span>
                  {t.services.courier.feature2}
                </li>
              </ul>
            </div>

            {/* Card 3: E-commerce */}
            <div className="group bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined !text-[32px]">
                  inventory_2
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">
                {t.services.ecommerce.title}
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {t.services.ecommerce.description}
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-slate-500">
                  <span className="material-symbols-outlined text-green-500 mr-2 !text-[18px]">
                    check
                  </span>
                  {t.services.ecommerce.feature1}
                </li>
                <li className="flex items-center text-sm text-slate-500">
                  <span className="material-symbols-outlined text-green-500 mr-2 !text-[18px]">
                    check
                  </span>
                  {t.services.ecommerce.feature2}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white" id="comment-ca-marche">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* Image Side */}
            <div className="w-full lg:w-1/2 relative">
              <div className="absolute inset-0 bg-[#137fec] rounded-2xl rotate-3 opacity-10"></div>
              <div className="relative rounded-2xl shadow-xl w-full aspect-[4/3] rotate-[-2deg] hover:rotate-0 transition-transform duration-500 bg-gradient-to-br from-[#137fec]/20 to-[#24D469]/20 flex items-center justify-center">
                <span className="material-symbols-outlined !text-[100px] text-[#137fec]/40">
                  package_2
                </span>
              </div>
            </div>

            {/* Steps Side */}
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl font-bold mb-10">{t.howItWorks.title}</h2>
              <div className="relative pl-8 border-l-2 border-slate-100 space-y-12">
                {/* Step 1 */}
                <div className="relative group">
                  <span className="absolute -left-[41px] top-0 h-10 w-10 rounded-full bg-white border-4 border-[#137fec] flex items-center justify-center text-[#137fec] font-bold shadow-sm z-10 group-hover:scale-110 transition-transform">
                    1
                  </span>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">
                      {t.howItWorks.step1.title}
                    </h3>
                    <p className="text-slate-600">
                      {t.howItWorks.step1.description}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative group">
                  <span className="absolute -left-[41px] top-0 h-10 w-10 rounded-full bg-white border-4 border-[#24D469] flex items-center justify-center text-[#24D469] font-bold shadow-sm z-10 group-hover:scale-110 transition-transform">
                    2
                  </span>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">
                      {t.howItWorks.step2.title}
                    </h3>
                    <p className="text-slate-600">
                      {t.howItWorks.step2.description}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative group">
                  <span className="absolute -left-[41px] top-0 h-10 w-10 rounded-full bg-white border-4 border-slate-900 flex items-center justify-center text-slate-900 font-bold shadow-sm z-10 group-hover:scale-110 transition-transform">
                    3
                  </span>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">
                      {t.howItWorks.step3.title}
                    </h3>
                    <p className="text-slate-600">
                      {t.howItWorks.step3.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <button className="bg-[#137fec] hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined">rocket_launch</span>
                  {t.howItWorks.cta}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-50" id="tarifs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t.pricing.title}</h2>
            <p className="text-slate-600">{t.pricing.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Yaoundé Card */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-bl-lg">
                {t.pricing.popular}
              </div>
              <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-4">
                {t.pricing.yaounde.title}
              </h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-slate-900">
                  {t.pricing.yaounde.price}
                </span>
                <span className="text-slate-500 font-medium">
                  {t.pricing.perDelivery}
                </span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">
                    check_circle
                  </span>
                  <span className="text-slate-700">
                    {t.pricing.yaounde.feature1}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">
                    check_circle
                  </span>
                  <span className="text-slate-700">
                    {t.pricing.yaounde.feature2}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">
                    check_circle
                  </span>
                  <span className="text-slate-700">
                    {t.pricing.yaounde.feature3}
                  </span>
                </li>
              </ul>
              <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold py-3 rounded-lg transition-colors">
                {t.pricing.viewZones}
              </button>
            </div>

            {/* Douala Card */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-4">
                {t.pricing.douala.title}
              </h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-slate-900">
                  {t.pricing.douala.price}
                </span>
                <span className="text-slate-500 font-medium">
                  {t.pricing.perDelivery}
                </span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">
                    check_circle
                  </span>
                  <span className="text-slate-700">
                    {t.pricing.douala.feature1}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">
                    check_circle
                  </span>
                  <span className="text-slate-700">
                    {t.pricing.douala.feature2}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">
                    check_circle
                  </span>
                  <span className="text-slate-700">
                    {t.pricing.douala.feature3}
                  </span>
                </li>
              </ul>
              <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold py-3 rounded-lg transition-colors">
                {t.pricing.viewZones}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Section */}
      <section
        className="py-20 bg-slate-900 text-white relative overflow-hidden"
        id="partenaires"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2">
              <div className="inline-block bg-[#24D469]/20 text-[#24D469] text-xs font-bold px-3 py-1 rounded-full mb-6">
                {t.partners.badge}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                {t.partners.title}
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-lg">
                {t.partners.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                  <span className="material-symbols-outlined text-[#24D469]">
                    trending_up
                  </span>
                  <span className="font-medium">{t.partners.stat1}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                  <span className="material-symbols-outlined text-[#24D469]">
                    schedule
                  </span>
                  <span className="font-medium">{t.partners.stat2}</span>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 bg-white text-slate-900 p-8 rounded-2xl shadow-2xl max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">{t.partners.formTitle}</h3>
              <form className="space-y-4">
                <input
                  className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#137fec] focus:border-transparent"
                  placeholder={t.partners.companyName}
                  type="text"
                />
                <input
                  className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#137fec] focus:border-transparent"
                  placeholder={t.partners.email}
                  type="email"
                />
                <input
                  className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#137fec] focus:border-transparent"
                  placeholder={t.partners.phone}
                  type="tel"
                />
                <button
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors"
                  type="button"
                >
                  {t.partners.submit}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#137fec] rounded-[2rem] p-8 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
              <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    height="40"
                    id="grid"
                    patternUnits="userSpaceOnUse"
                    width="40"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="white"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect fill="url(#grid)" height="100%" width="100%" />
              </svg>
            </div>

            <div className="md:w-1/2 relative z-10 text-white text-center md:text-left">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                {t.app.title}
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-md mx-auto md:mx-0">
                {t.app.description}
              </p>
              <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                <button className="bg-slate-900 hover:bg-slate-800 text-white py-3 px-6 rounded-xl flex items-center gap-3 transition-transform hover:-translate-y-1">
                  <span className="material-symbols-outlined">
                    phone_iphone
                  </span>
                  <div className="text-left">
                    <div className="text-[10px] uppercase leading-none">
                      {t.app.downloadOn}
                    </div>
                    <div className="text-base font-bold leading-none mt-1">
                      {t.app.appStore}
                    </div>
                  </div>
                </button>
                <button className="bg-slate-900 hover:bg-slate-800 text-white py-3 px-6 rounded-xl flex items-center gap-3 transition-transform hover:-translate-y-1">
                  <span className="material-symbols-outlined">
                    android
                  </span>
                  <div className="text-left">
                    <div className="text-[10px] uppercase leading-none">
                      {t.app.availableOn}
                    </div>
                    <div className="text-base font-bold leading-none mt-1">
                      {t.app.googlePlay}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="md:w-1/2 relative z-10 flex justify-center md:justify-end mt-8 md:mt-0">
              <div className="relative w-64 h-[500px] bg-slate-900 rounded-[3rem] shadow-2xl border-8 border-slate-900 overflow-hidden rotate-6 hover:rotate-0 transition-transform duration-500">
                {/* Screen Content */}
                <div className="absolute top-0 w-full h-full bg-white flex flex-col">
                  {/* Mockup Header */}
                  <div className="h-14 bg-[#137fec] flex items-center px-4 justify-between">
                    <span className="material-symbols-outlined text-white">
                      menu
                    </span>
                    <span className="text-white font-bold">Go Livraison</span>
                    <span className="material-symbols-outlined text-white">
                      notifications
                    </span>
                  </div>
                  {/* Mockup Map */}
                  <div className="flex-1 bg-slate-200 relative">
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <span className="material-symbols-outlined !text-[60px] text-slate-300">
                        map
                      </span>
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg">
                      <span className="material-symbols-outlined text-[#137fec]">
                        two_wheeler
                      </span>
                    </div>
                    {/* Mockup Card */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-xl shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full overflow-hidden flex items-center justify-center">
                          <span className="material-symbols-outlined text-slate-500 !text-[20px]">
                            person
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">
                            {t.app.yourDriver}
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            Jean-Paul E.
                          </p>
                        </div>
                        <div className="ml-auto text-[#137fec] font-bold text-xs">
                          {t.app.arrivesIn}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-[#137fec]">
                  <span className="material-symbols-outlined">
                    local_shipping
                  </span>
                </div>
                <span className="text-slate-900 text-lg font-bold">
                  Go Livraison
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-4">
                {t.footer.subsidiary}
                <br />
                {t.footer.location}
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-slate-900">
                {t.footer.company}
              </h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <a className="hover:text-[#137fec]" href="#">
                    {t.footer.about}
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#137fec]" href="#">
                    {t.footer.careers}
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#137fec]" href="#">
                    {t.footer.press}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-slate-900">{t.footer.help}</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <a className="hover:text-[#137fec]" href="#">
                    {t.footer.helpCenter}
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#137fec]" href="#">
                    {t.footer.terms}
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#137fec]" href="#">
                    {t.footer.privacy}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-slate-900">
                {t.footer.contact}
              </h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>support@golivraison.cm</li>
                <li>+237 699 99 99 99</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
            <p>{t.footer.rights}</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {t.footer.systemStatus}
              </span>
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#137fec] hover:underline font-medium"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              {t.back}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
