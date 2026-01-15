"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/i18n";

export default function GlobalCargoPage() {
  const { language } = useLanguage();

  const t = translations[language];

  return (
    <div className="bg-white text-[#111418] overflow-x-hidden antialiased">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/services/global-cargo" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0a2f6b] rounded-md flex items-center justify-center text-white">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#0a2f6b] text-xl font-extrabold tracking-tight leading-none">
                  GLOBAL CARGO
                </span>
                <span className="text-xs text-gray-500 font-medium tracking-wide">
                  {t.subsidiary}
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium text-gray-700 hover:text-[#0a2f6b] transition-colors" href="#services">
                {t.nav.services}
              </a>
              <a className="text-sm font-medium text-gray-700 hover:text-[#0a2f6b] transition-colors" href="#pricing">
                {t.nav.pricing}
              </a>
              <a className="text-sm font-medium text-gray-700 hover:text-[#0a2f6b] transition-colors" href="#how-it-works">
                {t.nav.howItWorks}
              </a>
              <a className="text-sm font-medium text-gray-700 hover:text-[#0a2f6b] transition-colors" href="#about">
                {t.nav.about}
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="hidden md:flex items-center gap-2 text-[#0a2f6b] font-bold text-sm hover:underline"
              >
                <span className="material-symbols-outlined text-[20px]">home</span>
                LTC Group
              </Link>
              <button className="bg-[#FF8000] hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-md transition-colors shadow-md flex items-center gap-2">
                <span>{t.cta.quote}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-[#0a2f6b] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a2f6b]/90 to-[#0a2f6b]/40 z-10"></div>
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuB-IEEJRCzRBq6Spwd0hroMPn0cYvHYXCLEAJSG0rOQb6i8yazyeqM2WpFcyZM_D4YzgVCj75fCgjnxQOwmD7NywNc7CBYpuyjTRceaE1NfTTKWwhiQCnWHuIJqh1-gMQDdqKvcjGMBuQZGb92QOy6FEspYnHH7_XAlOfyEoaQ86GpKq2hFUrAAHHohwyZsNeRts4P37I-nV2gcQI0IuzL4e0rK9jDl4Lb4TZ8g2Fgs-tMSoMSUi1CWpY3OFNiou_pGPsuc4N5K31se')`,
            }}
          />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-[#FF8000] animate-pulse"></span>
              {t.hero.badge}
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              {t.hero.title1} <br />
              <span className="text-[#FF8000]">{t.hero.title2}</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-200 mb-10 font-light leading-relaxed">
              {t.hero.subtitle}
            </p>

            {/* Tracking Bar */}
            <div className="bg-white p-2 rounded-lg shadow-xl max-w-lg flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400">search</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-3 border-none rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0a2f6b] sm:text-sm bg-gray-50 h-full"
                  placeholder={t.hero.trackingPlaceholder}
                  type="text"
                />
              </div>
              <button className="bg-[#0a2f6b] hover:bg-[#082555] text-white px-6 py-3 rounded-md font-bold text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                {t.hero.trackButton}
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#FF8000] text-[18px]">verified_user</span>
              {t.hero.stats}
            </p>
          </div>
        </div>
      </section>

      {/* Trust Signals Bar */}
      <div className="bg-[#F2F5F8] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-items-center md:justify-items-start text-center md:text-left">
            {t.trustSignals.map((signal, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#0a2f6b] text-3xl">{signal.icon}</span>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-sm">{signal.title}</span>
                  <span className="text-xs text-gray-500">{signal.subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Services */}
      <section className="py-20 bg-white" id="services">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[#0a2f6b] font-bold text-3xl md:text-4xl mb-4">{t.services.title}</h2>
            <p className="text-gray-600 text-lg">{t.services.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.services.items.map((service, index) => (
              <div
                key={index}
                className="group bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.1)] transition-all duration-300 p-6 flex flex-col"
              >
                <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center text-[#0a2f6b] mb-6 group-hover:bg-[#0a2f6b] group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-3xl">{service.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-6 flex-grow text-sm leading-relaxed">{service.description}</p>
                <a className="inline-flex items-center text-[#0a2f6b] font-bold text-sm hover:text-[#FF8000] transition-colors" href="#">
                  {t.services.learnMore} <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-[#F2F5F8] border-y border-gray-200" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-[#0a2f6b] font-bold text-3xl md:text-4xl mb-6">
                {t.howItWorks.title}
              </h2>
              <p className="text-gray-600 text-lg mb-8">{t.howItWorks.subtitle}</p>

              <div className="space-y-8 relative">
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-300"></div>

                {t.howItWorks.steps.map((step, index) => (
                  <div key={index} className="relative flex items-start gap-6">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-sm z-10 ${
                        index === t.howItWorks.steps.length - 1
                          ? "bg-[#FF8000] text-white shadow-md"
                          : "bg-white border-2 border-[#0a2f6b] text-[#0a2f6b]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{step.title}</h4>
                      <p className="text-gray-600 mt-1 text-sm">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <button className="bg-[#0a2f6b] hover:bg-[#082555] text-white font-bold py-3 px-8 rounded-md shadow-lg transition-transform transform hover:-translate-y-0.5">
                  {t.howItWorks.ctaButton}
                </button>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              {/* Calculator Card */}
              <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-100 max-w-md mx-auto relative z-10">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                  <span className="material-symbols-outlined text-[#FF8000]">calculate</span>
                  <h3 className="text-lg font-bold text-gray-900">{t.calculator.title}</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {t.calculator.transportType}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="bg-blue-50 border border-[#0a2f6b] text-[#0a2f6b] font-bold py-2 px-4 rounded-md text-sm">
                        {t.calculator.air}
                      </button>
                      <button className="bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2 px-4 rounded-md text-sm">
                        {t.calculator.sea}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        {t.calculator.weight}
                      </label>
                      <input
                        className="w-full border-gray-300 rounded-md focus:ring-[#0a2f6b] focus:border-[#0a2f6b] text-sm"
                        placeholder="0"
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        {t.calculator.volume}
                      </label>
                      <input
                        className="w-full border-gray-300 rounded-md focus:ring-[#0a2f6b] focus:border-[#0a2f6b] text-sm"
                        placeholder="0"
                        type="number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {t.calculator.goodsType}
                    </label>
                    <select className="w-full border-gray-300 rounded-md focus:ring-[#0a2f6b] focus:border-[#0a2f6b] text-sm">
                      <option>{t.calculator.goodsOptions[0]}</option>
                      <option>{t.calculator.goodsOptions[1]}</option>
                      <option>{t.calculator.goodsOptions[2]}</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <button className="w-full bg-[#FF8000] hover:bg-orange-600 text-white font-bold py-3 rounded-md transition-colors shadow-md">
                      {t.calculator.calculateButton}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">{t.calculator.disclaimer}</p>
                  </div>
                </div>
              </div>

              {/* Decorative */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#0a2f6b]/10 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#FF8000]/10 rounded-full blur-3xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-[#0a2f6b] font-bold text-3xl text-center mb-16">{t.testimonials.title}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.testimonials.items.map((testimonial, index) => (
              <div key={index} className="bg-[#F2F5F8] p-8 rounded-xl relative">
                <span className="material-symbols-outlined text-[#0a2f6b]/20 text-6xl absolute top-4 right-4">
                  format_quote
                </span>
                <p className="text-gray-700 mb-6 relative z-10 italic">&quot;{testimonial.content}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0a2f6b] rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0a2f6b] py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">{t.finalCta.title}</h2>
          <p className="text-xl text-blue-100 mb-10">{t.finalCta.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-[#FF8000] hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-md shadow-lg transition-transform transform hover:scale-105 text-lg">
              {t.finalCta.quoteButton}
            </button>
            <button className="bg-transparent border-2 border-white hover:bg-white hover:text-[#0a2f6b] text-white font-bold py-4 px-8 rounded-md transition-colors text-lg">
              {t.finalCta.contactButton}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#16191d] text-white pt-16 pb-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-[#0a2f6b]">
                  <span className="material-symbols-outlined text-sm">local_shipping</span>
                </div>
                <span className="text-white text-lg font-bold tracking-tight">GLOBAL CARGO</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{t.footer.description}</p>
              <div className="flex gap-4">
                <a className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center hover:bg-[#0a2f6b] transition-colors text-white" href="#">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                </a>
                <a className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center hover:bg-[#0a2f6b] transition-colors text-white" href="#">
                  <span className="material-symbols-outlined text-[18px]">share</span>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">{t.footer.quickLinks}</h4>
              <ul className="space-y-3">
                {t.footer.links.map((link, index) => (
                  <li key={index}>
                    <a className="text-gray-400 hover:text-white text-sm transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">{t.footer.servicesTitle}</h4>
              <ul className="space-y-3">
                {t.footer.serviceLinks.map((link, index) => (
                  <li key={index}>
                    <a className="text-gray-400 hover:text-white text-sm transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">{t.footer.contactTitle}</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="material-symbols-outlined text-[#FF8000] text-[18px] mt-0.5">location_on</span>
                  <span>
                    Akwa, Douala, Cameroun
                    <br />
                    Baiyun District, Guangzhou, Chine
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="material-symbols-outlined text-[#FF8000] text-[18px]">phone</span>
                  <span>+237 691 371 922</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="material-symbols-outlined text-[#FF8000] text-[18px]">mail</span>
                  <span>cargo@ltcgroup.site</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs">© 2024 Global Cargo Logistics - LTC Group Sarl. {t.footer.rights}</p>
            <div className="flex gap-6">
              <Link href="/" className="text-gray-500 hover:text-white text-xs transition-colors">
                LTC Group
              </Link>
              <a className="text-gray-500 hover:text-white text-xs transition-colors" href="#">
                {t.footer.legal}
              </a>
              <a className="text-gray-500 hover:text-white text-xs transition-colors" href="#">
                {t.footer.privacy}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Translations for Global Cargo
const translations = {
  fr: {
    subsidiary: "FILIALE DE LTC GROUP",
    nav: {
      services: "Services",
      pricing: "Tarifs",
      howItWorks: "Comment ça marche",
      about: "À propos",
    },
    cta: {
      quote: "Demander un devis",
    },
    hero: {
      badge: "Leader Logistique Chine-Cameroun",
      title1: "Pont Logistique",
      title2: "Chine — Cameroun",
      subtitle:
        "Votre partenaire fiable pour le transport rapide, le sourcing sécurisé et le dédouanement sans tracas de Guangzhou à Douala.",
      trackingPlaceholder: "Numéro de suivi (ex: GCL-8842...)",
      trackButton: "Suivre mon colis",
      stats: "Déjà plus de 10,000 expéditions réussies cette année.",
    },
    trustSignals: [
      { icon: "warehouse", title: "Entrepôt Sécurisé", subtitle: "Stockage gratuit 15 jours" },
      { icon: "flight_takeoff", title: "Départs Quotidiens", subtitle: "Vols cargo réguliers" },
      { icon: "gavel", title: "Expertise Douane", subtitle: "Dédouanement simplifié" },
      { icon: "support_agent", title: "Support 24/7", subtitle: "Équipe locale dédiée" },
    ],
    services: {
      title: "Solutions Logistiques Intégrées",
      subtitle:
        "Nous simplifions l'import-export pour les entreprises et les particuliers avec une gamme complète de services.",
      learnMore: "En savoir plus",
      items: [
        {
          icon: "rocket_launch",
          title: "Fret Aérien Express",
          description: "Livraison ultra-rapide en 3-5 jours pour vos marchandises urgentes et échantillons.",
        },
        {
          icon: "directions_boat",
          title: "Fret Maritime",
          description: "Solutions économiques en conteneur complet (FCL) ou groupage (LCL). Transit sûr.",
        },
        {
          icon: "shopping_cart",
          title: "Sourcing en Chine",
          description: "Identification et vérification de fournisseurs fiables pour vos produits.",
        },
        {
          icon: "payments",
          title: "Paiement Fournisseurs",
          description: "Transactions sécurisées en RMB/Yuan vers vos partenaires chinois.",
        },
      ],
    },
    howItWorks: {
      title: "De Guangzhou à Douala, en toute simplicité.",
      subtitle: "Notre processus est conçu pour vous offrir une transparence totale à chaque étape.",
      ctaButton: "Créer un compte client gratuit",
      steps: [
        {
          title: "Réception à l'entrepôt",
          description: "Vos fournisseurs livrent vos colis à notre entrepôt sécurisé à Guangzhou.",
        },
        {
          title: "Consolidation & Contrôle",
          description: "Nous vérifions l'état, reconditionnons si nécessaire et groupons vos achats.",
        },
        {
          title: "Expédition & Dédouanement",
          description: "Transport par avion ou bateau avec gestion complète des formalités douanières.",
        },
        {
          title: "Livraison / Retrait",
          description: "Vos marchandises sont prêtes à être retirées à notre agence ou livrées à domicile.",
        },
      ],
    },
    calculator: {
      title: "Estimez vos coûts",
      transportType: "Type de Transport",
      air: "Aérien",
      sea: "Maritime",
      weight: "Poids (Kg)",
      volume: "Volume (CBM)",
      goodsType: "Nature de la marchandise",
      goodsOptions: ["Général (Vêtements, chaussures...)", "Électronique", "Batteries / Liquides"],
      calculateButton: "Calculer l'estimation",
      disclaimer: "*Ceci est une estimation. Contactez-nous pour un devis précis.",
    },
    testimonials: {
      title: "Ils nous font confiance",
      items: [
        {
          name: "Jean-Paul M.",
          role: "Importateur Pièces Auto",
          content:
            "Depuis que je travaille avec Global Cargo, mes délais d'approvisionnement ont été réduits de moitié. Une équipe vraiment pro à Douala.",
        },
        {
          name: "Sarah K.",
          role: "Boutique Prêt-à-porter",
          content:
            "Le service d'achat et paiement fournisseurs est un game-changer. Je n'ai plus à m'inquiéter des arnaques sur Alibaba.",
        },
        {
          name: "Hervé T.",
          role: "Grossiste Électronique",
          content: "Fret aérien toujours à l'heure. Mes clients sont satisfaits, donc je suis satisfait. Merci à l'équipe LTC.",
        },
      ],
    },
    finalCta: {
      title: "Prêt à expédier ?",
      subtitle:
        "Rejoignez le réseau logistique le plus fiable entre l'Asie et l'Afrique Centrale. Obtenez votre devis en moins de 24h.",
      quoteButton: "Obtenir un devis gratuit",
      contactButton: "Contacter un agent",
    },
    footer: {
      description:
        "Filiale de LTC GROUP SARL. Spécialiste de la logistique internationale, nous connectons les marchés chinois et camerounais avec efficacité et sécurité.",
      quickLinks: "Liens Rapides",
      links: ["Nos Services", "Calculateur de tarifs", "Suivre un colis", "Guide d'importation", "Contact"],
      servicesTitle: "Services",
      serviceLinks: ["Fret Aérien", "Fret Maritime (LCL/FCL)", "Sourcing & Achats", "Dédouanement", "Livraison Door-to-Door"],
      contactTitle: "Nous Contacter",
      rights: "Tous droits réservés.",
      legal: "Mentions Légales",
      privacy: "Politique de Confidentialité",
    },
  },
  en: {
    subsidiary: "A SUBSIDIARY OF LTC GROUP",
    nav: {
      services: "Services",
      pricing: "Pricing",
      howItWorks: "How it works",
      about: "About",
    },
    cta: {
      quote: "Request a quote",
    },
    hero: {
      badge: "China-Cameroon Logistics Leader",
      title1: "Logistics Bridge",
      title2: "China — Cameroon",
      subtitle:
        "Your reliable partner for fast shipping, secure sourcing, and hassle-free customs clearance from Guangzhou to Douala.",
      trackingPlaceholder: "Tracking number (e.g.: GCL-8842...)",
      trackButton: "Track my package",
      stats: "Already over 10,000 successful shipments this year.",
    },
    trustSignals: [
      { icon: "warehouse", title: "Secure Warehouse", subtitle: "15 days free storage" },
      { icon: "flight_takeoff", title: "Daily Departures", subtitle: "Regular cargo flights" },
      { icon: "gavel", title: "Customs Expertise", subtitle: "Simplified clearance" },
      { icon: "support_agent", title: "24/7 Support", subtitle: "Dedicated local team" },
    ],
    services: {
      title: "Integrated Logistics Solutions",
      subtitle: "We simplify import-export for businesses and individuals with a complete range of services.",
      learnMore: "Learn more",
      items: [
        {
          icon: "rocket_launch",
          title: "Express Air Freight",
          description: "Ultra-fast delivery in 3-5 days for your urgent goods and samples.",
        },
        {
          icon: "directions_boat",
          title: "Sea Freight",
          description: "Economical solutions in full container (FCL) or groupage (LCL). Safe transit.",
        },
        {
          icon: "shopping_cart",
          title: "Sourcing in China",
          description: "Identification and verification of reliable suppliers for your products.",
        },
        {
          icon: "payments",
          title: "Supplier Payments",
          description: "Secure transactions in RMB/Yuan to your Chinese partners.",
        },
      ],
    },
    howItWorks: {
      title: "From Guangzhou to Douala, with ease.",
      subtitle: "Our process is designed to provide you with total transparency at every step.",
      ctaButton: "Create a free account",
      steps: [
        {
          title: "Warehouse Reception",
          description: "Your suppliers deliver your packages to our secure warehouse in Guangzhou.",
        },
        {
          title: "Consolidation & Control",
          description: "We check the condition, repackage if necessary and group your purchases.",
        },
        {
          title: "Shipping & Customs",
          description: "Transport by air or sea with complete management of customs formalities.",
        },
        {
          title: "Delivery / Pickup",
          description: "Your goods are ready to be picked up at our agency or delivered to your door.",
        },
      ],
    },
    calculator: {
      title: "Estimate your costs",
      transportType: "Transport Type",
      air: "Air",
      sea: "Sea",
      weight: "Weight (Kg)",
      volume: "Volume (CBM)",
      goodsType: "Type of goods",
      goodsOptions: ["General (Clothing, shoes...)", "Electronics", "Batteries / Liquids"],
      calculateButton: "Calculate estimate",
      disclaimer: "*This is an estimate. Contact us for an accurate quote.",
    },
    testimonials: {
      title: "They trust us",
      items: [
        {
          name: "Jean-Paul M.",
          role: "Auto Parts Importer",
          content:
            "Since working with Global Cargo, my supply times have been cut in half. A truly professional team in Douala.",
        },
        {
          name: "Sarah K.",
          role: "Ready-to-wear Boutique",
          content:
            "The purchase and supplier payment service is a game-changer. I no longer have to worry about scams on Alibaba.",
        },
        {
          name: "Hervé T.",
          role: "Electronics Wholesaler",
          content: "Air freight always on time. My customers are satisfied, so I am satisfied. Thanks to the LTC team.",
        },
      ],
    },
    finalCta: {
      title: "Ready to ship?",
      subtitle:
        "Join the most reliable logistics network between Asia and Central Africa. Get your quote in less than 24 hours.",
      quoteButton: "Get a free quote",
      contactButton: "Contact an agent",
    },
    footer: {
      description:
        "A subsidiary of LTC GROUP SARL. Specializing in international logistics, we connect Chinese and Cameroonian markets with efficiency and security.",
      quickLinks: "Quick Links",
      links: ["Our Services", "Rate Calculator", "Track a package", "Import Guide", "Contact"],
      servicesTitle: "Services",
      serviceLinks: ["Air Freight", "Sea Freight (LCL/FCL)", "Sourcing & Purchasing", "Customs Clearance", "Door-to-Door Delivery"],
      contactTitle: "Contact Us",
      rights: "All rights reserved.",
      legal: "Legal Notice",
      privacy: "Privacy Policy",
    },
  },
};
