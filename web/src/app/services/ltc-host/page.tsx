"use client";

import Link from "next/link";
import { useLanguage } from "@/i18n";

export default function LtcHostPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="bg-[#10141e] text-white font-sans antialiased overflow-x-hidden">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#10141e]/80 border-b border-[#2b2f36]">
        <div className="px-6 lg:px-20 py-4 flex items-center justify-between">
          <Link href="/services/ltc-host" className="flex items-center gap-3">
            <div className="w-8 h-8 text-[#00E8C4] flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">dns</span>
            </div>
            <h2 className="text-white text-xl font-bold tracking-tight">LTC Host</h2>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a className="text-gray-300 hover:text-[#00E8C4] transition-colors text-sm font-medium" href="#hosting">
              Hosting
            </a>
            <a className="text-gray-300 hover:text-[#00E8C4] transition-colors text-sm font-medium" href="#services">
              Services
            </a>
            <a className="text-gray-300 hover:text-[#00E8C4] transition-colors text-sm font-medium" href="#infrastructure">
              Infrastructure
            </a>
            <a className="text-gray-300 hover:text-[#00E8C4] transition-colors text-sm font-medium" href="#contact">
              Contact
            </a>
          </nav>

          <div className="flex gap-3">
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 text-[#00E8C4] font-bold text-sm hover:underline"
            >
              <span className="material-symbols-outlined text-[20px]">home</span>
              LTC Group
            </Link>
            <button className="hidden sm:flex h-9 items-center justify-center px-4 rounded border border-[#3f4650] bg-transparent text-white text-xs font-bold uppercase tracking-wider hover:bg-[#2b2f36] transition-all">
              Support
            </button>
            <button className="flex h-9 items-center justify-center px-4 rounded bg-[#00E8C4] text-[#10141e] text-xs font-bold uppercase tracking-wider hover:bg-[#00Cfb0] hover:shadow-[0_0_15px_rgba(0,232,196,0.2)] transition-all">
              {t.nav.clientArea}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center py-20 lg:py-32 px-4 border-b border-[#2b2f36] overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-40 mix-blend-screen bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDnD-QMzSQ0LU4mJsqyzjgY9Wfqa0dcnYaAKP5se4tQgO8_zRTLVe-R7LWz3C_RZQaAWdiLVH4QdNATSBl3RZjr5cOdW-PsbaTYszu3Rc_Svp190A19g2LHNaaLMSwStOWk3ICyFvxjhvmTVxMS5jX3eG57XXlVkmTiqOURYMN1pn1EjMdljdpU22d1aFxJ4k6KJMobyMKI1sVhyeCPmxlF_9XupfVObDj_-q2Llf1tKSTaCM3IrTCYS0uV3paYi2_XelCrTqdMM9Eh')`,
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#10141e]/80 via-[#10141e]/90 to-[#10141e]"></div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00E8C4]/30 bg-[#00E8C4]/10 text-[#00E8C4] text-xs font-mono mb-4 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#00E8C4]"></span>
            {t.hero.status}
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-white">
            {t.hero.title1} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00E8C4]">
              {t.hero.title2}
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl font-light">{t.hero.subtitle}</p>

          {/* Domain Search */}
          <div className="w-full max-w-2xl mt-8">
            <div className="relative flex w-full items-center p-1 rounded-lg bg-[#161b26] border border-[#3f4650] focus-within:border-[#00E8C4] focus-within:shadow-[0_0_15px_rgba(0,232,196,0.2)] transition-all duration-300">
              <div className="pl-4 pr-2 text-gray-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 h-12 md:h-14 text-base md:text-lg font-mono focus:outline-none"
                placeholder={t.hero.searchPlaceholder}
                type="text"
              />
              <button className="h-10 md:h-12 px-6 md:px-8 bg-[#00E8C4] hover:bg-[#00Cfb0] text-[#10141e] font-bold rounded text-sm md:text-base transition-all uppercase tracking-wide">
                {t.hero.searchButton}
              </button>
            </div>
            <div className="flex gap-4 justify-center mt-4 text-xs md:text-sm text-gray-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="text-[#00E8C4]">.com</span> $9.99
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#00E8C4]">.net</span> $8.99
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#00E8C4]">.io</span> $32.00
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#00E8C4]">.tech</span> $4.99
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* IT Services Section */}
      <section className="py-20 bg-[#10141e] relative" id="services">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(90deg, #1f2937 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        <div className="px-6 lg:px-20 relative z-10 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 border-b border-[#2b2f36] pb-6">
            <div>
              <h2 className="text-[#00E8C4] font-mono text-sm mb-2 uppercase tracking-widest">
                // {t.services.tag}
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white">{t.services.title}</h3>
            </div>
            <a
              className="hidden md:flex items-center gap-2 text-white hover:text-[#00E8C4] transition-colors text-sm font-medium"
              href="#"
            >
              {t.services.viewAll}{" "}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.services.items.map((service, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-xl bg-[#161b26] border border-[#2b2f36] hover:border-[#00E8C4]/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,232,196,0.2)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-8xl text-white">{service.bgIcon}</span>
                </div>
                <div className="w-12 h-12 rounded bg-[#1b3c6a]/20 flex items-center justify-center text-[#00E8C4] mb-6 group-hover:bg-[#00E8C4] group-hover:text-[#10141e] transition-colors">
                  <span className="material-symbols-outlined">{service.icon}</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-3 group-hover:text-[#00E8C4] transition-colors">
                  {service.title}
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{service.description}</p>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-gray-300 font-mono">
                      <span className="w-1 h-1 bg-[#00E8C4] rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hosting Pricing Section */}
      <section className="py-20 bg-[#1d2330]" id="hosting">
        <div className="px-6 lg:px-20 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[#00E8C4] font-mono text-sm mb-2 uppercase tracking-widest">
              // {t.hosting.tag}
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.hosting.title}</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">{t.hosting.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {t.hosting.plans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-lg bg-[#161b26] border ${
                  index === 1 ? "border-2 border-[#00E8C4] md:-translate-y-4 shadow-[0_0_15px_rgba(0,232,196,0.2)]" : "border-[#2b2f36]"
                } p-0 overflow-hidden flex flex-col h-full ${
                  index !== 1 ? "hover:-translate-y-1" : ""
                } transition-transform duration-300`}
              >
                {index === 1 && (
                  <div className="bg-[#00E8C4] px-4 py-1 text-center">
                    <span className="text-[#10141e] text-xs font-bold uppercase tracking-wider">
                      {t.hosting.popular}
                    </span>
                  </div>
                )}
                <div className={`p-6 ${index === 1 ? "bg-[#1a2333]" : "bg-[#161b26]"} border-b border-[#2b2f36]`}>
                  <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                  <p className="text-gray-500 text-xs mt-1">{plan.description}</p>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-baseline gap-1 mb-6">
                    <span
                      className={`${index === 1 ? "text-5xl" : "text-4xl"} font-bold text-white font-mono ${
                        index === 1 ? "drop-shadow-[0_0_10px_rgba(0,232,196,0.5)]" : ""
                      }`}
                    >
                      ${plan.price}
                    </span>
                    <span className="text-gray-400 font-mono">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-3 text-sm ${index === 1 ? "text-white" : "text-gray-300"}`}
                      >
                        <span className="material-symbols-outlined text-[#00E8C4] text-lg">
                          {index === 1 ? "verified" : "check_circle"}
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-3 px-4 rounded font-bold text-sm transition-colors ${
                      index === 1
                        ? "bg-[#00E8C4] text-[#10141e] hover:bg-white shadow-[0_0_20px_rgba(0,232,196,0.4)]"
                        : "bg-[#2b2f36] text-white hover:bg-white hover:text-black"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="py-20 bg-[#10141e] border-y border-[#2b2f36]" id="infrastructure">
        <div className="px-6 lg:px-20 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="flex-1">
              <h2 className="text-[#00E8C4] font-mono text-sm mb-2 uppercase tracking-widest">
                // {t.infrastructure.tag}
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">{t.infrastructure.title}</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">{t.infrastructure.description}</p>

              <div className="grid grid-cols-2 gap-4">
                {t.infrastructure.stats.map((stat, index) => (
                  <div key={index} className="p-4 rounded border border-[#2b2f36] bg-[#161b26]">
                    <div className="text-2xl font-mono font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-500 uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="w-full h-full min-h-[300px] rounded-xl bg-[#161b26] border border-[#2b2f36] relative overflow-hidden flex items-center justify-center p-4">
                <div className="relative z-10 w-full max-w-sm bg-[#10141e]/90 backdrop-blur border border-[#2b2f36] rounded-lg p-4 font-mono text-xs">
                  <div className="flex justify-between items-center border-b border-[#2b2f36] pb-2 mb-2">
                    <span className="text-[#00E8C4]">SERVER_STATUS_LOG</span>
                    <span className="text-green-500">● LIVE</span>
                  </div>
                  <div className="space-y-2">
                    {t.infrastructure.servers.map((server, index) => (
                      <div key={index} className="flex justify-between text-gray-400">
                        <span>{server.location}</span>
                        <span className="text-green-400">{server.status}</span>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-[#2b2f36] text-right text-[10px] text-gray-500">
                      {t.infrastructure.lastUpdate}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why LTC Host & FAQ */}
      <section className="py-20 bg-[#1d2330]">
        <div className="px-6 lg:px-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Why LTC */}
            <div>
              <h2 className="text-[#00E8C4] font-mono text-sm mb-2 uppercase tracking-widest">
                // {t.whyUs.tag}
              </h2>
              <h3 className="text-3xl font-bold text-white mb-6">{t.whyUs.title}</h3>
              <p className="text-gray-400 mb-8">{t.whyUs.description}</p>

              <div className="space-y-6">
                {t.whyUs.items.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1b3c6a] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-sm">{item.icon}</span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">{t.faq.title}</h3>
              <div className="space-y-3">
                {t.faq.items.map((item, index) => (
                  <details
                    key={index}
                    className="group bg-[#161b26] border border-[#2b2f36] rounded-lg overflow-hidden"
                  >
                    <summary className="flex justify-between items-center p-4 cursor-pointer text-white font-medium hover:bg-[#1f2532] transition-colors list-none">
                      <span>{item.question}</span>
                      <span className="material-symbols-outlined transition-transform group-open:rotate-180 text-gray-500">
                        expand_more
                      </span>
                    </summary>
                    <div className="px-4 pb-4 text-sm text-gray-400">{item.answer}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#1b3c6a] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}
        ></div>
        <div className="px-6 lg:px-20 max-w-7xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">{t.cta.title}</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">{t.cta.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-[#00E8C4] text-[#10141e] font-bold rounded hover:bg-white transition-colors shadow-lg">
              {t.cta.button1}
            </button>
            <button className="px-8 py-3 bg-transparent border border-white text-white font-bold rounded hover:bg-white/10 transition-colors">
              {t.cta.button2}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b0e14] border-t border-[#1f2532] text-gray-400 py-12 text-sm">
        <div className="px-6 lg:px-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-4 text-white">
                <span className="material-symbols-outlined">dns</span>
                <span className="font-bold text-lg">LTC Host</span>
              </div>
              <p className="mb-4 text-xs leading-relaxed">{t.footer.description}</p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">{t.footer.services}</h4>
              <ul className="space-y-2">
                {t.footer.serviceLinks.map((link, index) => (
                  <li key={index}>
                    <a className="hover:text-[#00E8C4] transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">{t.footer.company}</h4>
              <ul className="space-y-2">
                {t.footer.companyLinks.map((link, index) => (
                  <li key={index}>
                    <a className="hover:text-[#00E8C4] transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">{t.footer.legal}</h4>
              <ul className="space-y-2">
                {t.footer.legalLinks.map((link, index) => (
                  <li key={index}>
                    <a className="hover:text-[#00E8C4] transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#1f2532] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono">
            <p>© {new Date().getFullYear()} LTC GROUP SARL. {t.footer.rights}</p>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:text-[#00E8C4] transition-colors">
                LTC Group
              </Link>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {t.footer.operational}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Translations
const translations = {
  fr: {
    nav: {
      clientArea: "Espace Client",
    },
    hero: {
      status: "STATUT SYSTÈME: OPTIMAL",
      title1: "Propulsez votre",
      title2: "présence digitale",
      subtitle:
        "Solutions d'hébergement premium et automatisation pour l'entreprise moderne. Sécurisé, fiable et conçu pour une scalabilité infinie.",
      searchPlaceholder: "Entrez votre nom de domaine (ex: monsite.com)...",
      searchButton: "Rechercher",
    },
    services: {
      tag: "Capabilities",
      title: "Services IT & Solutions",
      viewAll: "Voir tous les services",
      items: [
        {
          icon: "terminal",
          bgIcon: "code",
          title: "Développement Web",
          description:
            "Sites web et applications personnalisés haute performance construits avec des frameworks modernes adaptés à votre logique métier.",
          features: ["React / Vue / Next.js", "Intégration API personnalisée", "Optimisation SEO"],
        },
        {
          icon: "precision_manufacturing",
          bgIcon: "settings_suggest",
          title: "Automatisation Business",
          description:
            "Rationalisez vos workflows avec des scripts d'automatisation personnalisés, bots et services d'intégration.",
          features: ["Optimisation des workflows", "Bots de traitement de données", "Intégrations CRM"],
        },
        {
          icon: "domain_verification",
          bgIcon: "hub",
          title: "Consulting IT",
          description:
            "Conseils stratégiques pour aligner votre infrastructure IT avec vos objectifs business. Audits de sécurité et migration cloud.",
          features: ["Audits de sécurité", "Migration Cloud", "Conception d'infrastructure"],
        },
      ],
    },
    hosting: {
      tag: "Plans d'Hébergement",
      title: "Déploiement Haute Performance",
      subtitle:
        "Solutions évolutives pour projets de toute taille. Tous les plans incluent surveillance 24/7 et protection DDoS.",
      popular: "Plus Populaire",
      plans: [
        {
          name: "Starter Node",
          description: "Parfait pour blogs personnels & portfolios",
          price: "5",
          features: [
            "10GB SSD NVMe",
            "1 Site Web",
            "Certificat SSL Gratuit",
            "Support Email Standard",
          ],
          cta: "Déployer Starter",
        },
        {
          name: "Business Node",
          description: "Pour entreprises en croissance",
          price: "15",
          features: [
            "50GB SSD NVMe",
            "Sites Illimités",
            "Domaine & SSL Gratuits",
            "Support Prioritaire 24/7",
            "Sauvegardes Quotidiennes",
          ],
          cta: "Déployer Business",
        },
        {
          name: "Enterprise Cluster",
          description: "Puissance maximale & ressources dédiées",
          price: "45",
          features: [
            "Stockage Illimité",
            "Account Manager Dédié",
            "Config Serveur Personnalisée",
            "SLA 99.99% Garanti",
          ],
          cta: "Contacter Ventes",
        },
      ],
    },
    infrastructure: {
      tag: "Infrastructure",
      title: "Conçu pour la Stabilité",
      description:
        "Notre réseau est architecturé pour la redondance et la vitesse. Avec des datacenters stratégiquement localisés pour minimiser la latence et maximiser l'uptime.",
      lastUpdate: "Mis à jour il y a: 12ms",
      stats: [
        { value: "99.9%", label: "Garantie Uptime" },
        { value: "<30ms", label: "Latence Moyenne" },
        { value: "24/7", label: "Surveillance Réseau" },
        { value: "DDoS", label: "Protection Active" },
      ],
      servers: [
        { location: "EU-West (Paris)", status: "Online" },
        { location: "US-East (Virginia)", status: "Online" },
        { location: "AP-South (Singapore)", status: "Online" },
      ],
    },
    whyUs: {
      tag: "Pourquoi LTC Host",
      title: "Une Expertise de Confiance",
      description:
        "Nous ne sommes pas qu'un hébergeur; nous sommes votre partenaire technique. Notre équipe est locale, vous parlez à un expert qui comprend votre contexte.",
      items: [
        {
          icon: "group",
          title: "Support Local",
          description: "Accès direct à des ingénieurs qui résolvent rapidement les problèmes complexes.",
        },
        {
          icon: "rocket_launch",
          title: "Solutions Sur Mesure",
          description: "Nous personnalisons notre infrastructure selon vos besoins applicatifs.",
        },
      ],
    },
    faq: {
      title: "FAQ Technique",
      items: [
        {
          question: "Offrez-vous la migration gratuite?",
          answer:
            "Oui, notre équipe technique gère la migration de votre site et bases de données gratuitement pour les plans annuels.",
        },
        {
          question: "Quelles versions PHP supportez-vous?",
          answer:
            "Nous supportons toutes les versions PHP actives (7.4, 8.0, 8.1, 8.2, 8.3) et vous pouvez basculer instantanément via le panneau de contrôle.",
        },
        {
          question: "Le SSL est-il inclus?",
          answer:
            "Absolument. Nous fournissons des certificats AutoSSL gratuits pour tous les domaines et sous-domaines hébergés.",
        },
      ],
    },
    cta: {
      title: "Prêt à améliorer votre infrastructure?",
      subtitle: "Rejoignez des centaines d'entreprises qui font confiance à LTC Host pour leurs opérations digitales.",
      button1: "Commencer Maintenant",
      button2: "Contacter Support",
    },
    footer: {
      description:
        "Filiale de LTC GROUP SARL. Infrastructure digitale premium et services IT depuis 2015.",
      services: "Services",
      serviceLinks: ["Hébergement Web", "Serveurs VPS", "Serveurs Dédiés", "Consulting IT"],
      company: "Entreprise",
      companyLinks: ["À propos", "Notre Équipe", "Carrières", "Contact"],
      legal: "Légal",
      legalLinks: ["Conditions d'utilisation", "Politique de confidentialité", "SLA"],
      rights: "Tous droits réservés.",
      operational: "Systèmes Opérationnels",
    },
  },
  en: {
    nav: {
      clientArea: "Client Area",
    },
    hero: {
      status: "SYSTEM STATUS: OPTIMAL",
      title1: "Power your",
      title2: "digital presence",
      subtitle:
        "Premium hosting and automation solutions for the modern enterprise. Secure, reliable, and built for infinite scale.",
      searchPlaceholder: "Enter your domain name (e.g. mysite.com)...",
      searchButton: "Search",
    },
    services: {
      tag: "Capabilities",
      title: "IT Services & Solutions",
      viewAll: "View All Services",
      items: [
        {
          icon: "terminal",
          bgIcon: "code",
          title: "Web Development",
          description:
            "Custom high-performance websites and web applications built with modern frameworks tailored to your business logic.",
          features: ["React / Vue / Next.js", "Custom API Integration", "SEO Optimization"],
        },
        {
          icon: "precision_manufacturing",
          bgIcon: "settings_suggest",
          title: "Business Automation",
          description:
            "Streamline your workflows with custom automation scripts, bots, and integration services to save time.",
          features: ["Workflow Optimization", "Data Processing Bots", "CRM Integrations"],
        },
        {
          icon: "domain_verification",
          bgIcon: "hub",
          title: "IT Consulting",
          description:
            "Strategic advice to align your IT infrastructure with business goals. Security audits and cloud migration.",
          features: ["Security Audits", "Cloud Migration", "Infrastructure Design"],
        },
      ],
    },
    hosting: {
      tag: "Hosting Plans",
      title: "High-Performance Deployment",
      subtitle:
        "Scalable solutions for projects of any size. All plans include 24/7 monitoring and DDoS protection.",
      popular: "Most Popular",
      plans: [
        {
          name: "Starter Node",
          description: "Perfect for personal blogs & portfolios",
          price: "5",
          features: [
            "10GB NVMe SSD Storage",
            "1 Website",
            "Free SSL Certificate",
            "Standard Email Support",
          ],
          cta: "Deploy Starter",
        },
        {
          name: "Business Node",
          description: "For growing businesses & traffic",
          price: "15",
          features: [
            "50GB NVMe SSD Storage",
            "Unlimited Websites",
            "Free Domain & SSL",
            "24/7 Priority Support",
            "Daily Backups",
          ],
          cta: "Deploy Business",
        },
        {
          name: "Enterprise Cluster",
          description: "Maximum power & dedicated resources",
          price: "45",
          features: [
            "Unlimited Storage",
            "Dedicated Account Manager",
            "Custom Server Config",
            "99.99% SLA Guarantee",
          ],
          cta: "Contact Sales",
        },
      ],
    },
    infrastructure: {
      tag: "Infrastructure",
      title: "Built for Stability",
      description:
        "Our network is architected for redundancy and speed. With datacenters strategically located to minimize latency and maximize uptime.",
      lastUpdate: "Last updated: 12ms ago",
      stats: [
        { value: "99.9%", label: "Uptime Guarantee" },
        { value: "<30ms", label: "Average Latency" },
        { value: "24/7", label: "Network Monitoring" },
        { value: "DDoS", label: "Active Protection" },
      ],
      servers: [
        { location: "EU-West (Paris)", status: "Online" },
        { location: "US-East (Virginia)", status: "Online" },
        { location: "AP-South (Singapore)", status: "Online" },
      ],
    },
    whyUs: {
      tag: "Why LTC Host",
      title: "Expertise You Can Trust",
      description:
        "We aren't just a hosting provider; we are your technical partner. Our team is based locally, ensuring you speak to an expert who understands your context.",
      items: [
        {
          icon: "group",
          title: "Local Support Team",
          description: "Direct access to engineers who can solve complex problems quickly.",
        },
        {
          icon: "rocket_launch",
          title: "Tailored Solutions",
          description: "We customize our infrastructure to fit your specific application needs.",
        },
      ],
    },
    faq: {
      title: "Technical FAQ",
      items: [
        {
          question: "Do you offer free migration?",
          answer:
            "Yes, our technical team will handle the migration of your website and databases from your current provider at no extra cost for annual plans.",
        },
        {
          question: "What PHP versions do you support?",
          answer:
            "We support all active PHP versions (7.4, 8.0, 8.1, 8.2, 8.3) and allow you to toggle between them instantly via your control panel.",
        },
        {
          question: "Is SSL included?",
          answer:
            "Absolutely. We provide free AutoSSL certificates for all domains and subdomains hosted on our platform.",
        },
      ],
    },
    cta: {
      title: "Ready to upgrade your infrastructure?",
      subtitle: "Join hundreds of businesses trusting LTC Host for their digital operations.",
      button1: "Get Started Now",
      button2: "Contact Support",
    },
    footer: {
      description:
        "Part of LTC GROUP SARL. Providing premium digital infrastructure and IT services since 2015.",
      services: "Services",
      serviceLinks: ["Web Hosting", "VPS Servers", "Dedicated Servers", "IT Consulting"],
      company: "Company",
      companyLinks: ["About Us", "Our Team", "Careers", "Contact"],
      legal: "Legal",
      legalLinks: ["Terms of Service", "Privacy Policy", "SLA"],
      rights: "All rights reserved.",
      operational: "Systems Operational",
    },
  },
};
