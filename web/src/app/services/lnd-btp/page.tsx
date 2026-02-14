"use client";

import Link from "next/link";
import { useLanguage } from "@/i18n";

export default function LndBtpPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="bg-white text-[#121417] font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 md:px-10 lg:px-40 py-3 flex items-center justify-between">
          <Link href="/services/lnd-btp" className="flex items-center gap-4 text-[#1f3d7a]">
            <div className="w-8 h-8 flex items-center justify-center bg-[#1f3d7a] rounded text-white">
              <span className="material-symbols-outlined">architecture</span>
            </div>
            <h2 className="text-[#121417] text-xl font-bold tracking-tight">LND BTP</h2>
          </Link>

          <div className="hidden lg:flex flex-1 justify-end gap-8 items-center">
            <div className="flex items-center gap-8">
              <a className="text-[#121417] text-sm font-medium hover:text-[#1f3d7a] transition-colors" href="#">
                {t.nav.home}
              </a>
              <a className="text-[#121417] text-sm font-medium hover:text-[#1f3d7a] transition-colors" href="#expertise">
                {t.nav.expertise}
              </a>
              <a className="text-[#121417] text-sm font-medium hover:text-[#1f3d7a] transition-colors" href="#projets">
                {t.nav.projects}
              </a>
              <a className="text-[#121417] text-sm font-medium hover:text-[#1f3d7a] transition-colors" href="#methodologie">
                {t.nav.methodology}
              </a>
            </div>
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 text-[#1f3d7a] font-bold text-sm hover:underline"
            >
              <span className="material-symbols-outlined text-[20px]">home</span>
              LTC Group
            </Link>
            <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-5 bg-[#1f3d7a] hover:bg-[#162c56] transition-colors text-white text-sm font-bold">
              <span className="truncate">{t.nav.cta}</span>
            </button>
          </div>

          <button className="lg:hidden p-2 text-[#121417]">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative w-full min-h-[600px] flex items-center bg-[#F8FAFB]">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBxKIFbQk6VBs5PDsBr_bvBAo1nQa-uc0dJuO89A0J5NT_UjY0eH4oQFHQDRJMBPXyvNh_ncZGIDPUPY_glLGTlb6dDWn0RTN3OjkOMrGCjrRNL8D5JKTo49G4cJ0qpvRZ9jNp9HcTH4loEWFg4hC5vWLzPgF5Cm8aSkJvKhKdUGxbC8iF8PXq9g9Pp1cLvC05ysaLW8mH5K2G4a5iyNBYvd9G-UeiWWj-2UOSGTtEDREGtfkfvD8MUpBPAROY7gB2niNjo9F9Nm8E5")`,
            }}
          />
        </div>

        <div className="relative z-10 w-full px-4 md:px-10 lg:px-40 py-20">
          <div className="max-w-[800px] flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 w-fit">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-white text-xs font-medium tracking-wide uppercase">
                {t.hero.badge}
              </span>
            </div>

            <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              {t.hero.title}
            </h1>

            <p className="text-white/90 text-lg md:text-xl font-light leading-relaxed max-w-[600px] border-l-4 border-[#1f3d7a] pl-6">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button className="flex items-center justify-center h-12 px-8 bg-[#1f3d7a] hover:bg-[#162c56] text-white text-base font-bold rounded-lg transition-all shadow-lg shadow-[#1f3d7a]/30">
                {t.hero.cta1}
              </button>
              <button className="flex items-center justify-center h-12 px-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white text-base font-bold rounded-lg transition-all">
                {t.hero.cta2}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Expertise Section */}
      <section className="py-20 px-4 md:px-10 lg:px-40 bg-white" id="expertise">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-[#1f3d7a] text-sm font-bold uppercase tracking-wider mb-2">
                {t.expertise.tag}
              </h2>
              <h3 className="text-[#121417] text-3xl md:text-4xl font-bold leading-tight">
                {t.expertise.title}
              </h3>
            </div>
            <p className="text-[#677183] max-w-md text-base leading-relaxed">
              {t.expertise.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.expertise.items.map((item, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl bg-[#F8FAFB] border border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                <div
                  className="aspect-[4/3] w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url("${item.image}")` }}
                />
                <div className="p-6">
                  <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#1f3d7a]/10 text-[#1f3d7a]">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <h4 className="text-lg font-bold text-[#121417] mb-2">{item.title}</h4>
                  <p className="text-sm text-[#677183] leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#1f3d7a] text-white">
        <div className="px-4 md:px-10 lg:px-40 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-white/10">
            {t.stats.items.map((stat, index) => (
              <div key={index} className="flex flex-col items-center text-center p-4">
                <span className="material-symbols-outlined text-4xl mb-3 opacity-80">{stat.icon}</span>
                <h3 className="text-4xl font-bold mb-1">{stat.value}</h3>
                <p className="text-sm opacity-80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="py-20 px-4 md:px-10 lg:px-40 bg-[#F8FAFB]" id="projets">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <h2 className="text-[#121417] text-3xl md:text-4xl font-bold leading-tight">
              {t.portfolio.title}
            </h2>
            <div className="flex p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <button className="px-4 py-2 text-sm font-bold rounded-md bg-[#1f3d7a] text-white shadow-sm transition-all">
                {t.portfolio.filters.all}
              </button>
              <button className="px-4 py-2 text-sm font-medium rounded-md text-[#677183] hover:text-[#121417] transition-all">
                {t.portfolio.filters.inProgress}
              </button>
              <button className="px-4 py-2 text-sm font-medium rounded-md text-[#677183] hover:text-[#121417] transition-all">
                {t.portfolio.filters.delivered}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[300px]">
            {t.portfolio.projects.map((project, index) => (
              <div
                key={index}
                className={`group relative rounded-xl overflow-hidden cursor-pointer ${
                  index === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url("${project.image}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90"></div>
                <div className={`absolute bottom-0 left-0 w-full ${index === 0 ? "p-8" : "p-6"}`}>
                  <span
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider text-white rounded mb-3 inline-block ${
                      project.status === "delivered" ? "bg-green-600" : "bg-[#1f3d7a]"
                    }`}
                  >
                    {project.status === "delivered" ? t.portfolio.statusDelivered : t.portfolio.statusInProgress}
                  </span>
                  <h3 className={`text-white font-bold mb-1 ${index === 0 ? "text-2xl" : "text-lg"}`}>
                    {project.name}
                  </h3>
                  <p className="text-white/80 flex items-center gap-1 text-sm">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {project.location}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-6">
            <button className="flex items-center gap-2 text-[#1f3d7a] font-bold hover:text-[#162c56] transition-colors">
              {t.portfolio.viewAll}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* Methodology Section */}
      <section className="py-20 px-4 md:px-10 lg:px-40 bg-white" id="methodologie">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[#1f3d7a] text-sm font-bold uppercase tracking-wider mb-2">
              {t.methodology.tag}
            </h2>
            <h3 className="text-[#121417] text-3xl md:text-4xl font-bold leading-tight mb-4">
              {t.methodology.title}
            </h3>
            <p className="text-[#677183] text-base">{t.methodology.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.methodology.items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 p-8 rounded-2xl border border-gray-200 bg-white hover:border-[#1f3d7a]/30 transition-all hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#1f3d7a] mb-2">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <h4 className="text-xl font-bold text-[#121417]">{item.title}</h4>
                <p className="text-[#677183] leading-relaxed text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-10 lg:px-40 bg-[#1f3d7a] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, #ffffff 10px, #ffffff 11px)",
          }}
        ></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center gap-8">
          <h2 className="text-white text-3xl md:text-5xl font-bold leading-tight">
            {t.cta.title}
          </h2>
          <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">{t.cta.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
            <button className="h-14 px-8 bg-white text-[#1f3d7a] text-lg font-bold rounded-lg shadow-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              {t.cta.button1}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button className="h-14 px-8 bg-transparent border-2 border-white/30 text-white text-lg font-bold rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center">
              {t.cta.button2}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#17191c] text-white pt-20 pb-10 px-4 md:px-10 lg:px-40 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 flex items-center justify-center bg-[#1f3d7a] rounded text-white">
                  <span className="material-symbols-outlined">architecture</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">LND BTP</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{t.footer.description}</p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold">{t.footer.quickLinks}</h4>
              {t.footer.links.map((link, index) => (
                <a key={index} className="text-gray-400 hover:text-white transition-colors text-sm" href="#">
                  {link}
                </a>
              ))}
            </div>

            {/* Services */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold">{t.footer.servicesTitle}</h4>
              {t.footer.services.map((service, index) => (
                <a key={index} className="text-gray-400 hover:text-white transition-colors text-sm" href="#">
                  {service}
                </a>
              ))}
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold">{t.footer.contactTitle}</h4>
              <div className="flex items-start gap-3 text-gray-400 text-sm">
                <span className="material-symbols-outlined text-[#1f3d7a] mt-0.5">location_on</span>
                <span>
                  Yaoundé – Mvan
                  <br />
                  Cameroun
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <span className="material-symbols-outlined text-[#1f3d7a]">phone</span>
                <span>+237 691 371 922</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <span className="material-symbols-outlined text-[#1f3d7a]">mail</span>
                <span>btp@ltcgroup.site</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} LND BTP - LTC GROUP SARL. {t.footer.rights}
            </p>
            <div className="flex gap-6">
              <Link className="text-gray-500 hover:text-white text-xs" href="/">
                LTC Group
              </Link>
              <a className="text-gray-500 hover:text-white text-xs" href="#">
                {t.footer.legal}
              </a>
              <a className="text-gray-500 hover:text-white text-xs" href="#">
                {t.footer.privacy}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Translations for LND BTP
const translations = {
  fr: {
    nav: {
      home: "Accueil",
      expertise: "Expertise",
      projects: "Projets",
      methodology: "Méthodologie",
      cta: "Demander une étude",
    },
    hero: {
      badge: "Filiale de LTC GROUP SARL",
      title: "Construisons l'avenir avec rigueur et innovation",
      subtitle:
        "Excellence en ingénierie et construction au Cameroun. Nous transformons vos visions architecturales en réalités durables.",
      cta1: "Découvrir nos projets",
      cta2: "Notre méthodologie",
    },
    expertise: {
      tag: "Nos domaines d'expertise",
      title: "Une expertise complète en génie civil",
      subtitle:
        "De la conception à la réalisation, nous maîtrisons chaque étape de la construction pour garantir qualité et pérennité.",
      items: [
        {
          icon: "apartment",
          title: "Construction Résidentielle",
          description:
            "Immeubles d'habitation modernes, alliant confort de vie et respect des normes environnementales.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDBkIroHN_ThwUL4quBub72H-SoLa3RJ_6drzX5xtdf8DigYKgTguaQJ-vnC7OhfI_WNJyG7ab-rAAAMjUjxEJY1lLwgpTaGNCBqRLp_cOBK7oRAmQJ0cLULYokj3v-deYFQRnlyMc2rqDi7fJA7KQVh208ga5G22xNJrQ6Z-84Dm9MtkfXZiTVMWgqm292lQfP1ciKhyPbtuLgnvzcXMc04EtMiRPFJJbLwqheUv3r02Je2Vose4BnAsfFwRv0MVPPHW2nWV1IGh78",
        },
        {
          icon: "storefront",
          title: "Complexes Commerciaux",
          description:
            "Espaces bureaux et centres commerciaux optimisés pour la performance et l'accueil du public.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuA4m0etYKYRCqPB9vcm84i6iUT-7Q2XFcOCQZWhWtfFLEQJ_Qvc0ZOQAsOQNFXocL22hrIYKD6-H6BsGHbW-Bj60H44dV38KC54D1UJeCbdDoz-W-eZyFzw3hOKvRvwA1P4pTqCxesOSPPORgaTcrHBnO0CcyqJYmv1moFMBiE6sK282bjgZTSB4-mFx3Pc7Ll6sfWGggAUv3a-7AZ8ME2B32E6nqKDKl-4mfQhqoluncPvWrwvvl8IoILhVawmBx4FM7GbuLtccrPl",
        },
        {
          icon: "factory",
          title: "Génie Civil Industriel",
          description:
            "Infrastructures robustes, hangars et usines conçus pour supporter les contraintes industrielles.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuAVGe7JyH1MPL_6x7AiLrDsLTL7aQLzoNgGHK8vtCJq7x-QL0Kc2ED7drd6gROAGsUuzPBX9BntC1CkA66s3O0VNLPaBEHu2GLXbxbocagdqHUMFwurBdUIT00BYsQcpQNWtRJ8HjcSX48FaEPE8k4W4_BOx8xDwhRkCen_-5ScCwfOpgt8P2HAyid9Jw9ji_i3j5VAZbK-yn2M_QKai3jRD_YYNwqdqqWAbXCPqi_IhbVmys0LDQM5MlOJtrKWFiZ6kBKQxL6kuOdY",
        },
        {
          icon: "architecture",
          title: "Études Techniques",
          description:
            "Planification rigoureuse, études de faisabilité et calculs de structure pour sécuriser vos investissements.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuAJPVHf2kaWLqW_X6BlRKdJVyY5o6BSHZVtLAOuebdNmwdhSyvNFECRzy4xx5_07LaKfMl5qDa2Trpyk5yDFhcdhwNDpS9_zhiQVxP-f1HfsewRJ-l5_tc-rkUJob9QowJDOGGyP8Clz-Kpcl2HV8YoUqz5G0-5CmG21-6B69oL1zfFFm5lqTqs_uZc9NREY7RkOjG9gr7J8PcNqN0mW-NMjQIz9RACbSrYoB6MG6PjmnSC0bJimy1BqdoCKRNzCvltq8F2FE1iYmvy",
        },
      ],
    },
    stats: {
      items: [
        { icon: "engineering", value: "15+", label: "Années d'expérience" },
        { icon: "check_circle", value: "85", label: "Projets Livrés" },
        { icon: "groups", value: "120+", label: "Experts & Ouvriers" },
        { icon: "local_shipping", value: "40+", label: "Engins Lourds" },
      ],
    },
    portfolio: {
      title: "Nos Réalisations",
      filters: {
        all: "Tous",
        inProgress: "En Cours",
        delivered: "Livrés",
      },
      statusInProgress: "En Cours",
      statusDelivered: "Livré",
      viewAll: "Voir tous les projets",
      projects: [
        {
          name: "Résidence Les Palmiers",
          location: "Douala, Cameroun",
          status: "inProgress",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDzJHuOf12nV31QZdc-nuA29s0PSGzIbCXGDGqK9eV-LRGL1NPO__Yr0jt20b1Qhuyp04hu7ogi1kFi3ccTFbQDRgAPDKixbu7ntwk21Qpp4cvmP3mkqHOTpSD6gA5DgbQvrd9TRvK32KH2mt2lzEhbIpA7rTwoUmQvORDEd4Oy1HzRCB00ws6tB-FOoaCGhdXn3mpWZmIGi4KpVEubid-C-m1mxVNe7eJMgYVyR3hy6tBhzG1l_XWPhm7DIMnAsenmdIiw67ZtKqnL",
        },
        {
          name: "Siège Social MTN",
          location: "Yaoundé, Cameroun",
          status: "delivered",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDM7uT8TxYbNfG1zVAGSH2wQcIgMekQeCKLdTiNkIRDDpDBrAv6a7xYwbYZjUK0zGs2zjjj2t81gPeC0haP6ARE2bqqnQKCThAbPUmpXaVIorhHMtYcizvIwpfR0n3JfH8yrRa0O_OMDYCiB9pbnqZUn23BEGki2LWV9pePPAsYVa8JvvyK3QhCPByaBAabNwoFwUB0FbvSX1k2VACQq7aGjHhxzHYi8H0U-SGHHTfPLjcWwJ-W_1MDm09TR6I5ycseBH30XWcs83hU",
        },
        {
          name: "Pont sur le Wouri (Extension)",
          location: "Douala, Cameroun",
          status: "inProgress",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDalN7H0ws2qiUUFWgSXS9Xj0CW1tWp6-39QsqdH_W-xRl64iC_esobbRayFz1DYOI81M0zLsq1QC13skl17EjfG6jQqLKqmMD9w_PMxC5P34P_PIeErcTenBONn_73jpU79gHRMQ-bWv6SCG-QGDIr-jwsCZ6WfuiGS9JvvWGcV2eZFrZKu7UiOuvh4IrEdtQpIkRWrSIKoYkmnenn0KGw2MszUUa1zfdwVmUMrTRBhiFYamEhmLDNed_0mE4oHuW-grSe8knH9HVU",
        },
      ],
    },
    methodology: {
      tag: "Le Standard LTC Group",
      title: "Une méthodologie axée sur l'excellence",
      subtitle:
        "Nous appliquons les standards internationaux les plus stricts pour garantir la sécurité et la qualité de chaque ouvrage.",
      items: [
        {
          icon: "verified_user",
          title: "Sécurité Maximale",
          description:
            "Protocoles stricts conformes aux normes ISO 45001. La sécurité de nos équipes et de vos futurs occupants est notre priorité absolue.",
        },
        {
          icon: "precision_manufacturing",
          title: "Qualité & Rigueur",
          description:
            "Contrôle qualité à chaque étape du chantier. Utilisation de matériaux certifiés et traçabilité complète des fournitures.",
        },
        {
          icon: "eco",
          title: "Durabilité",
          description:
            "Approche éco-responsable favorisant l'efficacité énergétique et l'utilisation de matériaux locaux durables.",
        },
      ],
    },
    cta: {
      title: "Prêt à concrétiser votre vision ?",
      subtitle:
        "Nos ingénieurs sont prêts à étudier la faisabilité technique et financière de votre projet. Bénéficiez de l'expertise LND BTP dès aujourd'hui.",
      button1: "Demander une étude technique",
      button2: "Contacter nos experts",
    },
    footer: {
      description:
        "Filiale du LTC GROUP SARL. Leader dans la construction et le génie civil au Cameroun, offrant des solutions durables et innovantes.",
      quickLinks: "Liens Rapides",
      links: ["Accueil", "À propos de LTC Group", "Nos Projets", "Carrières"],
      servicesTitle: "Services",
      services: [
        "Construction Bâtiments",
        "Travaux Publics",
        "Génie Civil Industriel",
        "Bureau d'Études",
      ],
      contactTitle: "Contact",
      rights: "Tous droits réservés.",
      legal: "Mentions Légales",
      privacy: "Politique de Confidentialité",
    },
  },
  en: {
    nav: {
      home: "Home",
      expertise: "Expertise",
      projects: "Projects",
      methodology: "Methodology",
      cta: "Request a study",
    },
    hero: {
      badge: "A Subsidiary of LTC GROUP SARL",
      title: "Building the future with rigor and innovation",
      subtitle:
        "Excellence in engineering and construction in Cameroon. We transform your architectural visions into lasting realities.",
      cta1: "Discover our projects",
      cta2: "Our methodology",
    },
    expertise: {
      tag: "Our areas of expertise",
      title: "Complete expertise in civil engineering",
      subtitle:
        "From design to completion, we master every stage of construction to guarantee quality and durability.",
      items: [
        {
          icon: "apartment",
          title: "Residential Construction",
          description:
            "Modern residential buildings, combining living comfort and respect for environmental standards.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDBkIroHN_ThwUL4quBub72H-SoLa3RJ_6drzX5xtdf8DigYKgTguaQJ-vnC7OhfI_WNJyG7ab-rAAAMjUjxEJY1lLwgpTaGNCBqRLp_cOBK7oRAmQJ0cLULYokj3v-deYFQRnlyMc2rqDi7fJA7KQVh208ga5G22xNJrQ6Z-84Dm9MtkfXZiTVMWgqm292lQfP1ciKhyPbtuLgnvzcXMc04EtMiRPFJJbLwqheUv3r02Je2Vose4BnAsfFwRv0MVPPHW2nWV1IGh78",
        },
        {
          icon: "storefront",
          title: "Commercial Complexes",
          description:
            "Office spaces and shopping centers optimized for performance and public reception.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuA4m0etYKYRCqPB9vcm84i6iUT-7Q2XFcOCQZWhWtfFLEQJ_Qvc0ZOQAsOQNFXocL22hrIYKD6-H6BsGHbW-Bj60H44dV38KC54D1UJeCbdDoz-W-eZyFzw3hOKvRvwA1P4pTqCxesOSPPORgaTcrHBnO0CcyqJYmv1moFMBiE6sK282bjgZTSB4-mFx3Pc7Ll6sfWGggAUv3a-7AZ8ME2B32E6nqKDKl-4mfQhqoluncPvWrwvvl8IoILhVawmBx4FM7GbuLtccrPl",
        },
        {
          icon: "factory",
          title: "Industrial Civil Engineering",
          description:
            "Robust infrastructures, warehouses and factories designed to withstand industrial constraints.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuAVGe7JyH1MPL_6x7AiLrDsLTL7aQLzoNgGHK8vtCJq7x-QL0Kc2ED7drd6gROAGsUuzPBX9BntC1CkA66s3O0VNLPaBEHu2GLXbxbocagdqHUMFwurBdUIT00BYsQcpQNWtRJ8HjcSX48FaEPE8k4W4_BOx8xDwhRkCen_-5ScCwfOpgt8P2HAyid9Jw9ji_i3j5VAZbK-yn2M_QKai3jRD_YYNwqdqqWAbXCPqi_IhbVmys0LDQM5MlOJtrKWFiZ6kBKQxL6kuOdY",
        },
        {
          icon: "architecture",
          title: "Technical Studies",
          description:
            "Rigorous planning, feasibility studies and structural calculations to secure your investments.",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuAJPVHf2kaWLqW_X6BlRKdJVyY5o6BSHZVtLAOuebdNmwdhSyvNFECRzy4xx5_07LaKfMl5qDa2Trpyk5yDFhcdhwNDpS9_zhiQVxP-f1HfsewRJ-l5_tc-rkUJob9QowJDOGGyP8Clz-Kpcl2HV8YoUqz5G0-5CmG21-6B69oL1zfFFm5lqTqs_uZc9NREY7RkOjG9gr7J8PcNqN0mW-NMjQIz9RACbSrYoB6MG6PjmnSC0bJimy1BqdoCKRNzCvltq8F2FE1iYmvy",
        },
      ],
    },
    stats: {
      items: [
        { icon: "engineering", value: "15+", label: "Years of Experience" },
        { icon: "check_circle", value: "85", label: "Projects Delivered" },
        { icon: "groups", value: "120+", label: "Experts & Workers" },
        { icon: "local_shipping", value: "40+", label: "Heavy Equipment" },
      ],
    },
    portfolio: {
      title: "Our Achievements",
      filters: {
        all: "All",
        inProgress: "In Progress",
        delivered: "Delivered",
      },
      statusInProgress: "In Progress",
      statusDelivered: "Delivered",
      viewAll: "View all projects",
      projects: [
        {
          name: "Les Palmiers Residence",
          location: "Douala, Cameroon",
          status: "inProgress",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDzJHuOf12nV31QZdc-nuA29s0PSGzIbCXGDGqK9eV-LRGL1NPO__Yr0jt20b1Qhuyp04hu7ogi1kFi3ccTFbQDRgAPDKixbu7ntwk21Qpp4cvmP3mkqHOTpSD6gA5DgbQvrd9TRvK32KH2mt2lzEhbIpA7rTwoUmQvORDEd4Oy1HzRCB00ws6tB-FOoaCGhdXn3mpWZmIGi4KpVEubid-C-m1mxVNe7eJMgYVyR3hy6tBhzG1l_XWPhm7DIMnAsenmdIiw67ZtKqnL",
        },
        {
          name: "MTN Headquarters",
          location: "Yaoundé, Cameroon",
          status: "delivered",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDM7uT8TxYbNfG1zVAGSH2wQcIgMekQeCKLdTiNkIRDDpDBrAv6a7xYwbYZjUK0zGs2zjjj2t81gPeC0haP6ARE2bqqnQKCThAbPUmpXaVIorhHMtYcizvIwpfR0n3JfH8yrRa0O_OMDYCiB9pbnqZUn23BEGki2LWV9pePPAsYVa8JvvyK3QhCPByaBAabNwoFwUB0FbvSX1k2VACQq7aGjHhxzHYi8H0U-SGHHTfPLjcWwJ-W_1MDm09TR6I5ycseBH30XWcs83hU",
        },
        {
          name: "Wouri Bridge (Extension)",
          location: "Douala, Cameroon",
          status: "inProgress",
          image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDalN7H0ws2qiUUFWgSXS9Xj0CW1tWp6-39QsqdH_W-xRl64iC_esobbRayFz1DYOI81M0zLsq1QC13skl17EjfG6jQqLKqmMD9w_PMxC5P34P_PIeErcTenBONn_73jpU79gHRMQ-bWv6SCG-QGDIr-jwsCZ6WfuiGS9JvvWGcV2eZFrZKu7UiOuvh4IrEdtQpIkRWrSIKoYkmnenn0KGw2MszUUa1zfdwVmUMrTRBhiFYamEhmLDNed_0mE4oHuW-grSe8knH9HVU",
        },
      ],
    },
    methodology: {
      tag: "The LTC Group Standard",
      title: "A methodology focused on excellence",
      subtitle:
        "We apply the strictest international standards to guarantee the safety and quality of each structure.",
      items: [
        {
          icon: "verified_user",
          title: "Maximum Safety",
          description:
            "Strict protocols compliant with ISO 45001 standards. The safety of our teams and your future occupants is our top priority.",
        },
        {
          icon: "precision_manufacturing",
          title: "Quality & Rigor",
          description:
            "Quality control at every stage of the site. Use of certified materials and complete traceability of supplies.",
        },
        {
          icon: "eco",
          title: "Sustainability",
          description:
            "Eco-responsible approach promoting energy efficiency and the use of sustainable local materials.",
        },
      ],
    },
    cta: {
      title: "Ready to make your vision a reality?",
      subtitle:
        "Our engineers are ready to study the technical and financial feasibility of your project. Benefit from LND BTP expertise today.",
      button1: "Request a technical study",
      button2: "Contact our experts",
    },
    footer: {
      description:
        "Subsidiary of LTC GROUP SARL. Leader in construction and civil engineering in Cameroon, offering sustainable and innovative solutions.",
      quickLinks: "Quick Links",
      links: ["Home", "About LTC Group", "Our Projects", "Careers"],
      servicesTitle: "Services",
      services: [
        "Building Construction",
        "Public Works",
        "Industrial Civil Engineering",
        "Engineering Office",
      ],
      contactTitle: "Contact",
      rights: "All rights reserved.",
      legal: "Legal Notice",
      privacy: "Privacy Policy",
    },
  },
};
