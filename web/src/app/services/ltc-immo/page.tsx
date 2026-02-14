"use client";

import Link from "next/link";
import { useLanguage } from "@/i18n";

const translations = {
  fr: {
    nav: {
      listings: "Annonces",
      services: "Services",
      about: "À propos",
      news: "Actualités",
      postAd: "Publier une annonce",
    },
    hero: {
      title: "L'Excellence dans",
      titleLine2: "l'Immobilier Camerounais",
      subtitle:
        "Trouvez la propriété de vos rêves à Yaoundé, Douala et au-delà avec une expertise locale de confiance soutenue par le Groupe LTC.",
      locationPlaceholder: "Ville, Quartier...",
      allTypes: "Tous les types",
      villa: "Villa",
      apartment: "Appartement",
      land: "Terrain",
      commercial: "Commercial",
      forSale: "À vendre",
      forRent: "À louer",
      search: "Rechercher",
    },
    featured: {
      title: "Résidences Sélectionnées",
      subtitle: "Des propriétés triées sur le volet pour des clients exigeants.",
      viewAll: "Voir toutes les annonces",
      exclusive: "Exclusif",
      new: "Nouveau",
      rental: "Location",
      beds: "Ch.",
      baths: "SdB",
      rooms: "Pièces",
      parking: "Pkg",
      perMonth: "/ mois",
      listing1: {
        title: "Villa Moderne à Bastos",
        location: "Yaoundé, Cameroun",
        price: "500 000 000 FCFA",
      },
      listing2: {
        title: "Appartement de Luxe à Bonapriso",
        location: "Douala, Cameroun",
        price: "250 000 000 FCFA",
      },
      listing3: {
        title: "Espace Commercial à Akwa",
        location: "Douala, Cameroun",
        price: "2 000 000 FCFA",
      },
    },
    services: {
      title: "Solutions Immobilières Complètes",
      subtitle:
        "De l'évaluation à la gestion, LTC Immo offre des services de bout en bout adaptés au marché camerounais.",
      management: {
        title: "Gestion de Propriété",
        description:
          "Sécurisez votre investissement avec nos services de sélection de locataires, d'entretien et de collecte de loyers.",
      },
      sales: {
        title: "Vente & Location",
        description:
          "Courtage expert pour les propriétés résidentielles et commerciales, garantissant des transactions optimales pour les deux parties.",
      },
      valuation: {
        title: "Évaluation Immobilière",
        description:
          "Analyses de marché précises et rapports d'évaluation pour vous aider à comprendre la vraie valeur de vos actifs.",
      },
      consulting: {
        title: "Conseil",
        description:
          "Conseils stratégiques pour les projets de développement immobilier, la conformité légale et les opportunités d'investissement.",
      },
    },
    whyUs: {
      tag: "Pourquoi Nous Choisir",
      title: "Soutenu par la Force de",
      titleHighlight: "LTC Group SARL",
      description:
        "Nous apportons un professionnalisme de niveau corporatif au secteur immobilier. Contrairement aux agents informels, nous offrons un processus structuré, transparent et juridiquement sécurisé pour chaque transaction.",
      yearsExp: "Années d'Expérience du Groupe",
      legal: {
        title: "Sécurité Juridique",
        description:
          "Chaque transaction est vérifiée par nos experts juridiques pour assurer la conformité avec les lois immobilières camerounaises.",
      },
      local: {
        title: "Expertise Locale",
        description:
          "Connaissance approfondie des quartiers de Yaoundé, Douala, Kribi et Limbé.",
      },
      verified: {
        title: "Annonces Vérifiées",
        description:
          "Pas d'annonces fantômes. Nous vérifions physiquement chaque propriété avant publication.",
      },
    },
    cta: {
      title: "Vendez ou Louez Votre Propriété en Toute Confiance",
      description:
        "Rejoignez les centaines de propriétaires qui font confiance à LTC Immo pour gérer et commercialiser leurs actifs immobiliers. Nous gérons la complexité pour que vous puissiez profiter des rendements.",
      submitProperty: "Soumettre Votre Propriété",
      contactAgent: "Contacter un Agent",
    },
    news: {
      title: "Analyses & Guides du Marché",
      article1: {
        tag: "Guide de Quartier",
        title: "Bastos : Le Cœur Diplomatique de Yaoundé",
        description:
          "Découvrez pourquoi Bastos reste le quartier le plus recherché par les expatriés et les personnes fortunées.",
        readMore: "Lire l'Article",
      },
      article2: {
        tag: "Tendances du Marché",
        title: "Investissement Immobilier en 2024 : À Quoi S'Attendre",
        description:
          "Une analyse de la croissance de la valeur des propriétés dans les quartiers émergents de Douala et des conseils pour les nouveaux investisseurs.",
        readMore: "Lire l'Article",
      },
    },
    footer: {
      description:
        "Le partenaire de confiance pour tous vos besoins immobiliers au Cameroun. Une filiale de LTC GROUP SARL.",
      quickLinks: "Liens Rapides",
      browseListings: "Parcourir les Annonces",
      ourServices: "Nos Services",
      postProperty: "Publier une Propriété",
      aboutLtc: "À propos de LTC Group",
      contactUs: "Nous Contacter",
      offices: "Nos Bureaux",
      office1: "Bastos, Yaoundé",
      office1Detail: "Face à l'Ambassade de Belgique",
      office2: "Bonapriso, Douala",
      office2Detail: "Rue des Palmiers",
      contact: "Contact",
      hours: "Lun - Ven: 8h - 18h",
      rights: "© 2024 LTC Immo. Tous droits réservés.",
      privacy: "Politique de Confidentialité",
      terms: "Conditions d'Utilisation",
    },
    back: "Retour à l'accueil",
  },
  en: {
    nav: {
      listings: "Listings",
      services: "Services",
      about: "About Us",
      news: "News",
      postAd: "Post an Ad",
    },
    hero: {
      title: "Excellence in",
      titleLine2: "Cameroonian Real Estate",
      subtitle:
        "Find your dream property in Yaoundé, Douala, and beyond with trusted local expertise backed by the LTC Group.",
      locationPlaceholder: "City, Neighborhood...",
      allTypes: "All Property Types",
      villa: "Villa",
      apartment: "Apartment",
      land: "Land",
      commercial: "Commercial",
      forSale: "For Sale",
      forRent: "For Rent",
      search: "Search",
    },
    featured: {
      title: "Curated Residences",
      subtitle: "Handpicked properties for discerning clients.",
      viewAll: "View All Listings",
      exclusive: "Exclusive",
      new: "New",
      rental: "Rental",
      beds: "Beds",
      baths: "Baths",
      rooms: "Rms",
      parking: "Pkg",
      perMonth: "/ month",
      listing1: {
        title: "Modern Villa in Bastos",
        location: "Yaoundé, Cameroon",
        price: "500,000,000 FCFA",
      },
      listing2: {
        title: "Luxury Apartment in Bonapriso",
        location: "Douala, Cameroon",
        price: "250,000,000 FCFA",
      },
      listing3: {
        title: "Commercial Space in Akwa",
        location: "Douala, Cameroon",
        price: "2,000,000 FCFA",
      },
    },
    services: {
      title: "Comprehensive Real Estate Solutions",
      subtitle:
        "From valuation to management, LTC Immo offers end-to-end services tailored to the Cameroonian market.",
      management: {
        title: "Property Management",
        description:
          "Secure your investment with our rigorous tenant screening, maintenance, and rent collection services.",
      },
      sales: {
        title: "Sales & Leasing",
        description:
          "Expert brokerage for residential and commercial properties, ensuring optimal deals for both parties.",
      },
      valuation: {
        title: "Property Valuation",
        description:
          "Accurate market analysis and appraisal reports to help you understand the true value of your assets.",
      },
      consulting: {
        title: "Consulting",
        description:
          "Strategic advice for real estate development projects, legal compliance, and investment opportunities.",
      },
    },
    whyUs: {
      tag: "Why Choose Us",
      title: "Backed by the Strength of",
      titleHighlight: "LTC Group SARL",
      description:
        "We bring corporate-level professionalism to the real estate sector. Unlike informal agents, we offer a structured, transparent, and legally secure process for every transaction.",
      yearsExp: "Years of Group Experience",
      legal: {
        title: "Legal Security",
        description:
          "Every transaction is vetted by our legal experts to ensure compliance with Cameroonian property laws.",
      },
      local: {
        title: "Local Expertise",
        description:
          "Deep knowledge of neighborhoods in Yaoundé, Douala, Kribi, and Limbe.",
      },
      verified: {
        title: "Verified Listings",
        description:
          "No ghost listings. We physically verify every property before publishing.",
      },
    },
    cta: {
      title: "Sell or Rent Your Property with Confidence",
      description:
        "Join the hundreds of owners who trust LTC Immo to manage and market their real estate assets. We handle the complexity so you can enjoy the returns.",
      submitProperty: "Submit Your Property",
      contactAgent: "Contact an Agent",
    },
    news: {
      title: "Market Insights & Guides",
      article1: {
        tag: "Neighborhood Guide",
        title: "Bastos: The Diplomatic Heart of Yaoundé",
        description:
          "Discover why Bastos remains the most sought-after district for expatriates and high-net-worth individuals.",
        readMore: "Read Article",
      },
      article2: {
        tag: "Market Trends",
        title: "Real Estate Investment in 2024: What to Expect",
        description:
          "An analysis of property value growth in Douala's emerging districts and advice for new investors.",
        readMore: "Read Article",
      },
    },
    footer: {
      description:
        "The trusted partner for all your real estate needs in Cameroon. A subsidiary of LTC GROUP SARL.",
      quickLinks: "Quick Links",
      browseListings: "Browse Listings",
      ourServices: "Our Services",
      postProperty: "Post a Property",
      aboutLtc: "About LTC Group",
      contactUs: "Contact Us",
      offices: "Our Offices",
      office1: "Bastos, Yaoundé",
      office1Detail: "Opposite Embassy of Belgium",
      office2: "Bonapriso, Douala",
      office2Detail: "Rue des Palmiers",
      contact: "Contact",
      hours: "Mon - Fri: 8am - 6pm",
      rights: "© 2024 LTC Immo. All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
    back: "Back to home",
  },
};

export default function LtcImmoPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#285e8f] rounded-sm flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">apartment</span>
            </div>
            <div>
              <h2 className="text-[#285e8f] text-xl font-bold tracking-tight leading-none">
                LTC Immo
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Group LTC SARL
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-10">
            <a
              className="text-slate-700 hover:text-[#285e8f] text-sm font-medium transition-colors"
              href="#listings"
            >
              {t.nav.listings}
            </a>
            <a
              className="text-slate-700 hover:text-[#285e8f] text-sm font-medium transition-colors"
              href="#services"
            >
              {t.nav.services}
            </a>
            <a
              className="text-slate-700 hover:text-[#285e8f] text-sm font-medium transition-colors"
              href="#why-us"
            >
              {t.nav.about}
            </a>
            <a
              className="text-slate-700 hover:text-[#285e8f] text-sm font-medium transition-colors"
              href="#news"
            >
              {t.nav.news}
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden lg:flex cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-[#285e8f] hover:bg-[#285e8f]/90 transition-colors text-white text-sm font-bold shadow-lg shadow-[#285e8f]/20">
              {t.nav.postAd}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative w-full h-[600px] lg:h-[700px] flex items-center justify-center overflow-hidden">
        {/* Hero Background */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-br from-[#285e8f] to-[#1a3d5c]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/30 to-slate-900/70"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl px-6 pt-12 flex flex-col items-center">
          <h1 className="text-white text-center text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-4 drop-shadow-md">
            {t.hero.title} <br className="hidden md:block" />
            {t.hero.titleLine2}
          </h1>
          <p className="text-slate-200 text-center text-base md:text-lg max-w-2xl mb-10 font-light drop-shadow-sm">
            {t.hero.subtitle}
          </p>

          {/* Search Module */}
          <div className="bg-white p-2 rounded-xl shadow-2xl flex flex-col md:flex-row gap-2 w-full max-w-4xl border border-white/20 backdrop-blur-sm">
            <div className="flex-1 min-w-[200px] relative border-b md:border-b-0 md:border-r border-slate-200">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">
                location_on
              </span>
              <input
                className="w-full h-14 pl-12 pr-4 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 rounded-lg"
                placeholder={t.hero.locationPlaceholder}
                type="text"
              />
            </div>

            <div className="flex-1 min-w-[150px] relative border-b md:border-b-0 md:border-r border-slate-200">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">
                home_work
              </span>
              <select className="w-full h-14 pl-12 pr-8 bg-transparent border-none focus:ring-0 text-slate-800 cursor-pointer rounded-lg appearance-none">
                <option>{t.hero.allTypes}</option>
                <option>{t.hero.villa}</option>
                <option>{t.hero.apartment}</option>
                <option>{t.hero.land}</option>
                <option>{t.hero.commercial}</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-outlined text-sm">
                expand_more
              </span>
            </div>

            <div className="flex-1 min-w-[150px] relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">
                sell
              </span>
              <select className="w-full h-14 pl-12 pr-8 bg-transparent border-none focus:ring-0 text-slate-800 cursor-pointer rounded-lg appearance-none">
                <option>{t.hero.forSale}</option>
                <option>{t.hero.forRent}</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-symbols-outlined text-sm">
                expand_more
              </span>
            </div>

            <button className="bg-[#285e8f] hover:bg-[#285e8f]/90 text-white font-bold px-8 py-3 md:py-0 rounded-lg transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">search</span>
              <span>{t.hero.search}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Listings */}
      <section className="py-20 px-6 max-w-7xl mx-auto" id="listings">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3 relative inline-block">
              {t.featured.title}
              <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-[#C8A967] rounded-full"></span>
            </h2>
            <p className="text-slate-600 text-lg">{t.featured.subtitle}</p>
          </div>
          <a
            className="group flex items-center gap-2 text-[#285e8f] font-bold text-sm uppercase tracking-wider hover:text-[#C8A967] transition-colors"
            href="#"
          >
            {t.featured.viewAll}
            <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
            <div className="relative aspect-[4/3] overflow-hidden">
              <div className="absolute top-4 left-4 z-10 bg-[#285e8f]/90 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider shadow-sm">
                {t.featured.exclusive}
              </div>
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-colors">
                  <span className="material-symbols-outlined text-lg">favorite</span>
                </button>
              </div>
              <div className="w-full h-full bg-gradient-to-br from-[#285e8f]/20 to-[#C8A967]/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                <span className="material-symbols-outlined !text-[80px] text-[#285e8f]/30">
                  villa
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="font-bold text-2xl text-[#C8A967]">
                  {t.featured.listing1.price}
                </p>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#285e8f] transition-colors">
                {t.featured.listing1.title}
              </h3>
              <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
                <span className="material-symbols-outlined text-base">location_on</span>
                <span>{t.featured.listing1.location}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4 text-slate-600 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">bed</span>
                    5 {t.featured.beds}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">
                      bathtub
                    </span>
                    4 {t.featured.baths}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">
                      square_foot
                    </span>
                    800m²
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
            <div className="relative aspect-[4/3] overflow-hidden">
              <div className="absolute top-4 left-4 z-10 bg-[#C8A967]/90 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider shadow-sm">
                {t.featured.new}
              </div>
              <div className="w-full h-full bg-gradient-to-br from-[#C8A967]/20 to-[#285e8f]/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                <span className="material-symbols-outlined !text-[80px] text-[#C8A967]/30">
                  apartment
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="font-bold text-2xl text-[#C8A967]">
                  {t.featured.listing2.price}
                </p>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#285e8f] transition-colors">
                {t.featured.listing2.title}
              </h3>
              <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
                <span className="material-symbols-outlined text-base">location_on</span>
                <span>{t.featured.listing2.location}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4 text-slate-600 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">bed</span>
                    3 {t.featured.beds}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">
                      bathtub
                    </span>
                    2 {t.featured.baths}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">
                      square_foot
                    </span>
                    220m²
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
            <div className="relative aspect-[4/3] overflow-hidden">
              <div className="absolute top-4 left-4 z-10 bg-slate-800/90 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider shadow-sm">
                {t.featured.rental}
              </div>
              <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                <span className="material-symbols-outlined !text-[80px] text-slate-300">
                  store
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="font-bold text-2xl text-[#C8A967]">
                  {t.featured.listing3.price}{" "}
                  <span className="text-sm font-sans text-white/80 font-normal">
                    {t.featured.perMonth}
                  </span>
                </p>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#285e8f] transition-colors">
                {t.featured.listing3.title}
              </h3>
              <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
                <span className="material-symbols-outlined text-base">location_on</span>
                <span>{t.featured.listing3.location}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4 text-slate-600 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">
                      meeting_room
                    </span>
                    4 {t.featured.rooms}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">
                      local_parking
                    </span>
                    10 {t.featured.parking}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#C8A967]">
                      square_foot
                    </span>
                    300m²
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-[#FBFBF9]" id="services">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {t.services.title}
            </h2>
            <p className="text-slate-600">{t.services.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Service 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group">
              <div className="w-14 h-14 rounded-full bg-[#285e8f]/10 flex items-center justify-center mb-6 group-hover:bg-[#285e8f] transition-colors">
                <span className="material-symbols-outlined text-[#285e8f] text-3xl group-hover:text-white transition-colors">
                  manage_accounts
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {t.services.management.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.services.management.description}
              </p>
            </div>

            {/* Service 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group">
              <div className="w-14 h-14 rounded-full bg-[#285e8f]/10 flex items-center justify-center mb-6 group-hover:bg-[#285e8f] transition-colors">
                <span className="material-symbols-outlined text-[#285e8f] text-3xl group-hover:text-white transition-colors">
                  real_estate_agent
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {t.services.sales.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.services.sales.description}
              </p>
            </div>

            {/* Service 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group">
              <div className="w-14 h-14 rounded-full bg-[#285e8f]/10 flex items-center justify-center mb-6 group-hover:bg-[#285e8f] transition-colors">
                <span className="material-symbols-outlined text-[#285e8f] text-3xl group-hover:text-white transition-colors">
                  trending_up
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {t.services.valuation.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.services.valuation.description}
              </p>
            </div>

            {/* Service 4 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group">
              <div className="w-14 h-14 rounded-full bg-[#285e8f]/10 flex items-center justify-center mb-6 group-hover:bg-[#285e8f] transition-colors">
                <span className="material-symbols-outlined text-[#285e8f] text-3xl group-hover:text-white transition-colors">
                  support_agent
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {t.services.consulting.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.services.consulting.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-20 max-w-7xl mx-auto px-6" id="why-us">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2 relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl bg-gradient-to-br from-[#285e8f] to-[#1a3d5c] flex items-center justify-center">
              <span className="material-symbols-outlined !text-[120px] text-white/20">
                handshake
              </span>
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#FBFBF9] p-6 hidden md:flex flex-col justify-center items-center rounded-lg shadow-xl border border-slate-100">
              <span className="text-4xl font-bold text-[#285e8f] mb-1">15+</span>
              <span className="text-center text-sm text-slate-600">
                {t.whyUs.yearsExp}
              </span>
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="inline-block px-3 py-1 bg-[#285e8f]/10 text-[#285e8f] text-xs font-bold uppercase tracking-wider rounded mb-4">
              {t.whyUs.tag}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
              {t.whyUs.title}{" "}
              <span className="text-[#285e8f]">{t.whyUs.titleHighlight}</span>
            </h2>
            <p className="text-slate-600 mb-8 text-lg leading-relaxed">
              {t.whyUs.description}
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="min-w-[40px] h-10 rounded-full bg-[#C8A967]/20 flex items-center justify-center mt-1">
                  <span className="material-symbols-outlined text-[#C8A967]">
                    gavel
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">
                    {t.whyUs.legal.title}
                  </h4>
                  <p className="text-slate-600 text-sm">
                    {t.whyUs.legal.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="min-w-[40px] h-10 rounded-full bg-[#C8A967]/20 flex items-center justify-center mt-1">
                  <span className="material-symbols-outlined text-[#C8A967]">
                    location_city
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">
                    {t.whyUs.local.title}
                  </h4>
                  <p className="text-slate-600 text-sm">
                    {t.whyUs.local.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="min-w-[40px] h-10 rounded-full bg-[#C8A967]/20 flex items-center justify-center mt-1">
                  <span className="material-symbols-outlined text-[#C8A967]">
                    verified_user
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">
                    {t.whyUs.verified.title}
                  </h4>
                  <p className="text-slate-600 text-sm">
                    {t.whyUs.verified.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Owner CTA */}
      <section className="py-24 bg-[#285e8f] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {t.cta.title}
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            {t.cta.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-[#C8A967] hover:bg-[#b09355] text-white font-bold py-4 px-8 rounded-lg transition-colors shadow-lg shadow-black/20 flex items-center justify-center gap-2">
              <span>{t.cta.submitProperty}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button className="bg-transparent border border-white/30 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-lg transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">call</span>
              <span>{t.cta.contactAgent}</span>
            </button>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-20 max-w-7xl mx-auto px-6" id="news">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900">{t.news.title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <a
            className="group flex flex-col md:flex-row gap-6 items-start p-4 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100"
            href="#"
          >
            <div className="w-full md:w-48 h-48 md:h-32 rounded-lg bg-gradient-to-br from-[#285e8f]/20 to-[#C8A967]/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined !text-[50px] text-[#285e8f]/30">
                location_city
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#C8A967] uppercase tracking-wider mb-2 block">
                {t.news.article1.tag}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#285e8f] transition-colors">
                {t.news.article1.title}
              </h3>
              <p className="text-slate-600 text-sm line-clamp-2">
                {t.news.article1.description}
              </p>
              <span className="text-[#285e8f] text-sm font-bold mt-3 block group-hover:underline">
                {t.news.article1.readMore}
              </span>
            </div>
          </a>

          <a
            className="group flex flex-col md:flex-row gap-6 items-start p-4 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100"
            href="#"
          >
            <div className="w-full md:w-48 h-48 md:h-32 rounded-lg bg-gradient-to-br from-[#C8A967]/20 to-[#285e8f]/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined !text-[50px] text-[#C8A967]/30">
                trending_up
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#C8A967] uppercase tracking-wider mb-2 block">
                {t.news.article2.tag}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#285e8f] transition-colors">
                {t.news.article2.title}
              </h3>
              <p className="text-slate-600 text-sm line-clamp-2">
                {t.news.article2.description}
              </p>
              <span className="text-[#285e8f] text-sm font-bold mt-3 block group-hover:underline">
                {t.news.article2.readMore}
              </span>
            </div>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-[#285e8f] rounded-sm flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-xl">apartment</span>
                </div>
                <h2 className="text-xl font-bold">LTC Immo</h2>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                {t.footer.description}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6">{t.footer.quickLinks}</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <a className="hover:text-white transition-colors" href="#">
                    {t.footer.browseListings}
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#">
                    {t.footer.ourServices}
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#">
                    {t.footer.postProperty}
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#">
                    {t.footer.aboutLtc}
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#">
                    {t.footer.contactUs}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6">{t.footer.offices}</h3>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-[#285e8f]">
                    location_on
                  </span>
                  <span>
                    {t.footer.office1}
                    <br />
                    {t.footer.office1Detail}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-[#285e8f]">
                    location_on
                  </span>
                  <span>
                    {t.footer.office2}
                    <br />
                    {t.footer.office2Detail}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6">{t.footer.contact}</h3>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#285e8f]">call</span>
                  <span>(+237) 600 00 00 00</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#285e8f]">mail</span>
                  <span>contact@ltcimmo.cm</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#285e8f]">
                    schedule
                  </span>
                  <span>{t.footer.hours}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>{t.footer.rights}</p>
            <div className="flex gap-6">
              <a className="hover:text-white transition-colors" href="#">
                {t.footer.privacy}
              </a>
              <a className="hover:text-white transition-colors" href="#">
                {t.footer.terms}
              </a>
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#C8A967] hover:underline font-medium"
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
