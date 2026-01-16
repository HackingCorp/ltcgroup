"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/i18n";

export default function SolutionsFinancieresPage() {
  const { language } = useLanguage();
  const t = translations[language];

  const [formData, setFormData] = useState({
    cardType: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    birthCity: "",
    cityNeighborhood: "",
    phone: "",
    email: "",
    profession: "",
    idNumber: "",
    registrationNumber: "",
    fatherName: "",
    motherName: "",
  });

  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "id" | "passport") => {
    const file = e.target.files?.[0] || null;
    if (type === "id") {
      setIdPhotoFile(file);
    } else {
      setPassportPhotoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // Create WhatsApp message with form data
      const message = `*DEMANDE DE CARTE VISA PREPAYEE*%0A%0A` +
        `*Type de carte:* ${formData.cardType}%0A` +
        `*Prénom:* ${formData.firstName}%0A` +
        `*Nom:* ${formData.lastName}%0A` +
        `*Date de naissance:* ${formData.birthDate}%0A` +
        `*Ville de naissance:* ${formData.birthCity}%0A` +
        `*Ville-Quartier:* ${formData.cityNeighborhood}%0A` +
        `*Téléphone:* ${formData.phone}%0A` +
        `*Email:* ${formData.email}%0A` +
        `*Profession:* ${formData.profession}%0A` +
        `*N° CNI/Récépissé/Passeport:* ${formData.idNumber}%0A` +
        `*Attestation/NIU:* ${formData.registrationNumber}%0A` +
        `*Nom du père:* ${formData.fatherName}%0A` +
        `*Nom de la mère:* ${formData.motherName}%0A%0A` +
        `_Veuillez envoyer les photos de votre CNI et photo d'identité après ce message._`;

      // Open WhatsApp with the message
      window.open(`https://wa.me/237673209375?text=${message}`, "_blank");

      setSubmitStatus("success");
      // Reset form
      setFormData({
        cardType: "",
        firstName: "",
        lastName: "",
        birthDate: "",
        birthCity: "",
        cityNeighborhood: "",
        phone: "",
        email: "",
        profession: "",
        idNumber: "",
        registrationNumber: "",
        fatherName: "",
        motherName: "",
      });
      setIdPhotoFile(null);
      setPassportPhotoFile(null);
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#10151e] text-white font-sans antialiased overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#10151e]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/services/solutions-financieres" className="flex-shrink-0 flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#cea427] to-yellow-200 flex items-center justify-center text-[#10151e] font-bold">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                LTC<span className="text-[#cea427]">.Finance</span>
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a className="text-sm font-medium text-gray-300 hover:text-[#cea427] transition-colors" href="#">
                {t.nav.individuals}
              </a>
              <a className="text-sm font-medium text-gray-300 hover:text-[#cea427] transition-colors" href="#">
                {t.nav.business}
              </a>
              <a className="text-sm font-medium text-gray-300 hover:text-[#cea427] transition-colors" href="#">
                {t.nav.help}
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="hidden md:flex items-center gap-2 text-[#cea427] font-bold text-sm hover:underline"
              >
                <span className="material-symbols-outlined text-[20px]">home</span>
                LTC Group
              </Link>
              <a
                href="#order-form"
                className="flex items-center justify-center h-10 px-5 rounded bg-[#cea427] hover:bg-[#b38d1f] text-[#10151e] text-sm font-bold transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(206,164,39,0.3)]"
              >
                {t.nav.orderCard}
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(206,164,39,0.15)_0%,rgba(16,21,30,0)_70%)] pointer-events-none opacity-60"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2233] border border-white/10 mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-medium text-[#cea427] tracking-wide uppercase">
                  {t.hero.badge}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6 text-white">
                {t.hero.title1} <br className="hidden lg:block" />
                <span className="bg-gradient-to-r from-[#cea427] via-white to-[#cea427] bg-clip-text text-transparent">
                  {t.hero.title2}
                </span>
              </h1>

              <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t.hero.subtitle}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button className="w-full sm:w-auto h-12 px-8 rounded bg-[#cea427] hover:bg-[#b38d1f] text-[#10151e] font-bold text-base transition-all shadow-lg shadow-[#cea427]/20 flex items-center justify-center gap-2">
                  <span>{t.hero.cta1}</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
                <button className="w-full sm:w-auto h-12 px-8 rounded border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all backdrop-blur-sm">
                  {t.hero.cta2}
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                  <span>{t.hero.delivery}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                  <span>{t.hero.noCommitment}</span>
                </div>
              </div>
            </div>

            {/* Hero Card Visual */}
            <div className="flex-1 relative w-full max-w-[500px] lg:max-w-none">
              <div
                className="relative w-full aspect-[1.586/1] rounded-xl transform transition-transform duration-700 ease-out hover:rotate-3 shadow-2xl z-20"
                style={{
                  background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/10">
                  {/* Gold Accents */}
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#cea427]/20 blur-3xl rounded-full"></div>
                  <div className="absolute -left-10 bottom-0 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full"></div>

                  <div className="absolute top-8 left-8 flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-[#cea427] to-yellow-100 flex items-center justify-center text-[#10151e] font-bold text-xs">
                      LTC
                    </div>
                  </div>
                  <div className="absolute top-8 right-8 text-white/50 text-sm font-mono tracking-widest">DEBIT</div>

                  {/* Chip */}
                  <div className="absolute top-24 left-8 w-12 h-10 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-inner border border-yellow-600/50"></div>

                  {/* Contactless Icon */}
                  <span
                    className="material-symbols-outlined absolute top-24 right-10 text-white/80 rotate-90"
                    style={{ fontSize: "28px" }}
                  >
                    rss_feed
                  </span>

                  <div className="absolute bottom-20 left-8 text-white/90 font-mono text-xl sm:text-2xl tracking-[0.15em] drop-shadow-md">
                    **** **** **** 4289
                  </div>

                  <div className="absolute bottom-8 left-8 text-white/70 text-sm font-mono uppercase tracking-wider">
                    Jean Dupont
                  </div>

                  <div className="absolute bottom-6 right-8 text-white font-bold text-2xl italic">VISA</div>
                </div>
              </div>
              {/* Ambient shadow below card */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-black/40 blur-xl rounded-[100%]"></div>
            </div>
          </div>
        </div>

        {/* Trust/Partners Strip */}
        <div className="mt-20 border-y border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <p className="text-center text-sm font-medium text-gray-400 mb-6 uppercase tracking-widest">
              {t.partners.title}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 hover:opacity-90 transition-all duration-500">
              <span className="text-xl font-bold text-white tracking-tighter">VISA</span>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-[#eb001b]"></div>
                <div className="w-5 h-5 rounded-full bg-[#f79e1b] -ml-1.5"></div>
                <span className="text-lg font-bold text-white ml-2">Mastercard</span>
              </div>
              <span className="text-lg font-bold text-[#0033a0]">Access Bank</span>
              <span className="text-lg font-bold text-[#ce1126]">UBA</span>
              <span className="text-xl font-bold text-white italic">
                MTN<span className="font-light">MoMo</span>
              </span>
              <span className="text-xl font-bold text-white">
                orange<span className="font-light text-[#cea427]">Money</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#10151e] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t.features.title} <span className="text-[#cea427]">LTC Visa</span> ?
            </h2>
            <p className="text-gray-400 text-lg">{t.features.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.features.items.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-[#232b40] flex items-center justify-center text-[#cea427] mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-[#0d1118]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">{t.howItWorks.title}</h2>
            <p className="text-gray-400">{t.howItWorks.subtitle}</p>
          </div>

          <div className="relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#cea427]/30 to-transparent -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {t.howItWorks.steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div
                    className={`w-16 h-16 rounded-full bg-[#1B2233] border-2 ${
                      index === 0 ? "border-[#cea427]" : "border-[#cea427]/50"
                    } text-white flex items-center justify-center text-xl font-bold mb-4 ${
                      index === 0 ? "shadow-[0_0_15px_rgba(206,164,39,0.2)]" : ""
                    }`}
                  >
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* App Promo */}
          <div className="mt-16 bg-[#1B2233] rounded-2xl p-8 lg:p-12 flex flex-col md:flex-row items-center gap-10 border border-white/5">
            <div className="flex-1 space-y-6">
              <h3 className="text-2xl font-bold text-white">{t.app.title}</h3>
              <p className="text-gray-400">{t.app.description}</p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-white text-black px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-200 transition">
                  <span className="material-symbols-outlined">android</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] uppercase">{t.app.availableOn}</span>
                    <span className="font-bold text-sm">Google Play</span>
                  </div>
                </button>
                <button className="bg-white/10 text-white px-4 py-2 rounded flex items-center gap-2 border border-white/20 hover:bg-white/20 transition">
                  <span className="material-symbols-outlined">ad_units</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] uppercase">{t.app.downloadOn}</span>
                    <span className="font-bold text-sm">App Store</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="flex-1 flex justify-center w-full max-w-[300px]">
              <div className="relative w-full aspect-[9/18] bg-black rounded-[2.5rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden">
                <div className="h-full w-full bg-[#1B2233] flex flex-col pt-8 px-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="material-symbols-outlined text-white">menu</span>
                    <span className="text-white font-bold">{t.app.myAccount}</span>
                    <span className="material-symbols-outlined text-white">notifications</span>
                  </div>
                  <div className="bg-gradient-to-br from-[#cea427] to-yellow-600 p-4 rounded-xl mb-6 text-[#10151e] shadow-lg">
                    <div className="text-xs font-bold opacity-80 mb-1">{t.app.currentBalance}</div>
                    <div className="text-2xl font-black">125 500 FCFA</div>
                    <div className="text-xs mt-4 flex justify-between items-center font-mono">
                      <span>**** 4289</span>
                      <span>VISA</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-white/5 rounded-lg p-3 flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[#cea427]">add</span>
                      <span className="text-[10px] text-white">{t.app.topUp}</span>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-lg p-3 flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[#cea427]">send</span>
                      <span className="text-[10px] text-white">{t.app.send}</span>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-lg p-3 flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[#cea427]">history</span>
                      <span className="text-[10px] text-white">{t.app.history}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-[#10151e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">{t.pricing.title}</h2>
            <p className="text-gray-400 mt-2">{t.pricing.subtitle}</p>
          </div>

          {/* Access Bank Mastercard */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-[#0033a0] flex items-center justify-center text-white font-bold text-sm">
                AB
              </div>
              <h3 className="text-xl font-bold text-white">Access Bank - Mastercard</h3>
            </div>

            <div className="max-w-md">
              <div className="relative rounded-2xl border border-[#ff5f00]/50 bg-[#161b26] p-6 overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#ff5f00] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  PROMO
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl font-bold text-white">Mastercard</span>
                  <div className="flex">
                    <div className="w-6 h-6 rounded-full bg-[#eb001b]"></div>
                    <div className="w-6 h-6 rounded-full bg-[#f79e1b] -ml-2"></div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">{t.pricing.accessBank.description}</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-white">12 500</span>
                  <span className="text-lg text-gray-400">FCFA</span>
                  <span className="text-sm text-gray-500 line-through ml-2">15 000 FCFA</span>
                </div>
                <div className="text-sm text-[#cea427] font-medium mb-4">
                  {t.pricing.accessBank.limit}: 2 500 000 FCFA/mois
                </div>
                <ul className="space-y-2 mb-6">
                  {t.pricing.accessBank.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="material-symbols-outlined text-green-500 text-[18px]">check</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded bg-[#0033a0] text-white font-bold hover:bg-[#002080] transition-colors">
                  {t.pricing.accessBank.cta}
                </button>
              </div>
            </div>
          </div>

          {/* UBA Visa Cards */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-[#ce1126] flex items-center justify-center text-white font-bold text-sm">
                UBA
              </div>
              <h3 className="text-xl font-bold text-white">UBA Bank - Visa</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.pricing.ubaCards.map((card, index) => (
                <div
                  key={index}
                  className={`relative rounded-2xl border ${
                    index === 2 ? "border-[#cea427]/50" : "border-white/10"
                  } bg-[#1B2233] p-6 flex flex-col ${
                    index === 2 ? "shadow-[0_0_30px_-10px_rgba(206,164,39,0.15)]" : ""
                  }`}
                >
                  {index === 2 && (
                    <div className="absolute top-0 right-0 bg-[#cea427] text-[#10151e] text-xs font-bold px-3 py-1 rounded-bl-lg">
                      {t.pricing.popular}
                    </div>
                  )}
                  {index < 2 && (
                    <div className="absolute top-0 right-0 bg-[#ce1126] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      PROMO
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-lg font-bold ${index === 2 ? "text-[#cea427]" : "text-white"}`}>
                      {card.name}
                    </span>
                    <span className="text-white font-bold italic">VISA</span>
                  </div>

                  <div className="text-sm text-[#cea427] font-medium mb-2">
                    {t.pricing.monthlyLimit}: {card.limit}
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-white">{card.price}</span>
                    <span className="text-lg text-gray-400">FCFA</span>
                    <span className="text-sm text-gray-500 line-through ml-2">{card.oldPrice} FCFA</span>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {t.pricing.ubaFeatures.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className={`material-symbols-outlined text-[18px] ${index === 2 ? "text-[#cea427]" : "text-green-500"}`}>
                          check
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3 rounded font-bold transition-colors ${
                      index === 2
                        ? "bg-[#cea427] text-[#10151e] hover:bg-[#b38d1f]"
                        : "bg-[#ce1126] text-white hover:bg-[#a00d1e]"
                    }`}
                  >
                    {t.pricing.orderCta}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-gray-400">
              <span className="material-symbols-outlined text-[#cea427] text-[16px] align-middle mr-1">info</span>
              {t.pricing.rechargeNote}
            </div>
          </div>

          {/* Documents Required */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="bg-[#1B2233] rounded-2xl p-8 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#cea427]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#cea427] text-2xl">folder_open</span>
                </div>
                <h3 className="text-xl font-bold text-white">{t.documents.title}</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">{t.documents.subtitle}</p>
              <ul className="space-y-4">
                {t.documents.items.map((doc, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#cea427] text-[20px] mt-0.5">check_circle</span>
                    <div>
                      <span className="text-white font-medium">{doc.name}</span>
                      {doc.description && (
                        <p className="text-gray-400 text-sm mt-1">{doc.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#cea427] text-[18px]">schedule</span>
                  {t.documents.processingTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Form Section */}
      <section className="py-20 bg-[#0d1118]" id="order-form">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#cea427]/10 border border-[#cea427]/20 mb-6">
              <span className="material-symbols-outlined text-[#cea427]">edit_note</span>
              <span className="text-[#cea427] font-bold text-sm">{t.orderForm.title}</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">{t.orderForm.title}</h2>
            <p className="text-gray-400">{t.orderForm.subtitle}</p>
          </div>

          <div className="bg-[#1B2233] rounded-2xl p-8 border border-white/10">
            {submitStatus === "success" ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t.orderForm.successTitle}</h3>
                <p className="text-gray-400 mb-8">{t.orderForm.successMessage}</p>
                <button
                  onClick={() => setSubmitStatus("idle")}
                  className="px-6 py-3 bg-[#cea427] text-[#10151e] font-bold rounded-lg hover:bg-[#b38d1f] transition-colors"
                >
                  {language === "fr" ? "Nouvelle demande" : "New request"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t.orderForm.cardType} <span className="text-[#cea427]">*</span>
                  </label>
                  <select
                    name="cardType"
                    value={formData.cardType}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                  >
                    <option value="">{t.orderForm.selectCard}</option>
                    <option value="ACCESS_MASTERCARD_12500">Access Bank Mastercard - 12 500 FCFA</option>
                    <option value="UBA_SEGMENT1_10000">UBA Visa Segment 1 - 10 000 FCFA (Plafond 2.5M)</option>
                    <option value="UBA_SEGMENT2_15000">UBA Visa Segment 2 - 15 000 FCFA (Plafond 4.5M)</option>
                    <option value="UBA_SEGMENT3_25000">UBA Visa Segment 3 - 25 000 FCFA (Plafond 10M)</option>
                  </select>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.lastName} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      placeholder="DUPONT"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.firstName} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="JEAN"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.birthDate} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                      required
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.birthCity} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="text"
                      name="birthCity"
                      value={formData.birthCity}
                      onChange={handleInputChange}
                      required
                      placeholder="YAOUNDÉ"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t.orderForm.cityNeighborhood} <span className="text-[#cea427]">*</span>
                  </label>
                  <input
                    type="text"
                    name="cityNeighborhood"
                    value={formData.cityNeighborhood}
                    onChange={handleInputChange}
                    required
                    placeholder="YAOUNDÉ - BASTOS"
                    className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.phone} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      placeholder="+237 6XX XXX XXX"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.email} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="exemple@email.com"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t.orderForm.profession} <span className="text-[#cea427]">*</span>
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    required
                    placeholder="ENTREPRENEUR / ÉTUDIANT / SALARIÉ..."
                    className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.idNumber} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="text"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="XXXXXXXXX"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.registrationNumber}
                    </label>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleInputChange}
                      placeholder="XXXXXXXXX"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.fatherName} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleInputChange}
                      required
                      placeholder="DUPONT PIERRE"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.motherName} <span className="text-[#cea427]">*</span>
                    </label>
                    <input
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleInputChange}
                      required
                      placeholder="MBARGA MARIE"
                      className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.idPhoto} <span className="text-[#cea427]">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">{t.orderForm.idPhotoDesc}</p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer bg-[#10151e] hover:border-[#cea427]/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <span className="material-symbols-outlined text-gray-400 mb-2">upload_file</span>
                        {idPhotoFile ? (
                          <p className="text-sm text-[#cea427] font-medium">{idPhotoFile.name}</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-400">{t.orderForm.uploadFile}</p>
                            <p className="text-xs text-gray-500">{t.orderForm.acceptedFormats}</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, "id")}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.orderForm.passportPhoto}
                    </label>
                    <p className="text-xs text-gray-500 mb-3">{t.orderForm.passportPhotoDesc}</p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer bg-[#10151e] hover:border-[#cea427]/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <span className="material-symbols-outlined text-gray-400 mb-2">photo_camera</span>
                        {passportPhotoFile ? (
                          <p className="text-sm text-[#cea427] font-medium">{passportPhotoFile.name}</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-400">{t.orderForm.uploadFile}</p>
                            <p className="text-xs text-gray-500">{t.orderForm.acceptedFormats}</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, "passport")}
                      />
                    </label>
                  </div>
                </div>

                {/* Required Fields Notice */}
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="text-[#cea427]">*</span> {t.orderForm.required}
                </p>

                {/* Error Message */}
                {submitStatus === "error" && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <div>
                      <p className="text-red-500 font-medium">{t.orderForm.errorTitle}</p>
                      <p className="text-sm text-red-400">{t.orderForm.errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-lg bg-[#cea427] hover:bg-[#b38d1f] text-[#10151e] font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#cea427]/20"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      {t.orderForm.submitting}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">send</span>
                      {t.orderForm.submit}
                    </>
                  )}
                </button>

                {/* WhatsApp Note */}
                <p className="text-center text-sm text-gray-400">
                  <span className="material-symbols-outlined text-green-500 text-[16px] align-middle mr-1">chat</span>
                  {language === "fr"
                    ? "Votre demande sera envoyée via WhatsApp pour un traitement rapide"
                    : "Your request will be sent via WhatsApp for quick processing"
                  }
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Business Solutions Teaser */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#1B2233]"></div>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1486406140926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')",
          }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex-1">
            <span className="text-[#cea427] font-bold tracking-wider text-sm uppercase mb-2 block">
              {t.business.tag}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.business.title}</h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl">{t.business.description}</p>
            <a
              className="inline-flex items-center gap-2 text-[#cea427] font-bold hover:text-white transition-colors"
              href="#"
            >
              {t.business.cta}
              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>

          <div className="flex-1 flex justify-end">
            <div className="bg-[#10151e] p-6 rounded-lg border border-white/10 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                <div>
                  <div className="h-2 w-24 bg-gray-700 rounded mb-2"></div>
                  <div className="h-2 w-16 bg-gray-800 rounded"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>Marketing</span>
                  <span className="text-white">- 250 000 FCFA</span>
                </div>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#cea427] w-3/4"></div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-400 mt-2">
                  <span>IT / Tech</span>
                  <span className="text-white">- 450 000 FCFA</span>
                </div>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b0e14] border-t border-white/5 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[#cea427]">account_balance_wallet</span>
                <span className="font-bold text-xl text-white">LTC Finance</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{t.footer.description}</p>
              <div className="flex gap-4">
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#cea427] hover:text-[#10151e] transition-all" href="#" aria-label="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#cea427] hover:text-[#10151e] transition-all" href="#" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#cea427] hover:text-[#10151e] transition-all" href="#" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#cea427] hover:text-[#10151e] transition-all" href="#" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">{t.footer.products}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {t.footer.productLinks.map((link, index) => (
                  <li key={index}>
                    <a className="hover:text-[#cea427] transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">{t.footer.support}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {t.footer.supportLinks.map((link, index) => (
                  <li key={index}>
                    <a className="hover:text-[#cea427] transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">{t.footer.legal}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {t.footer.legalLinks.map((link, index) => (
                  <li key={index}>
                    <a className="hover:text-[#cea427] transition-colors" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} LTC Financial Solutions. {t.footer.rights}
            </p>
            <div className="flex gap-6">
              <Link className="text-gray-500 hover:text-white text-xs" href="/">
                LTC Group
              </Link>
            </div>
            <p className="text-xs text-gray-600 text-center md:text-right max-w-md">{t.footer.disclaimer}</p>
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
      individuals: "Particuliers",
      business: "Entreprises",
      help: "Aide",
      login: "Se connecter",
      orderCard: "Commander ma carte",
    },
    hero: {
      badge: "Nouveau: Carte Gold Premium",
      title1: "Votre liberté financière",
      title2: "sans frontières",
      subtitle:
        "Payez partout dans le monde avec la carte Visa LTC. Rechargez instantanément via Mobile Money (MTN, Orange). Sans compte bancaire requis.",
      cta1: "Commander ma carte",
      cta2: "En savoir plus",
      delivery: "Livraison 48h",
      noCommitment: "Sans engagement",
    },
    partners: {
      title: "Partenaires de confiance",
    },
    features: {
      title: "Pourquoi choisir la carte",
      subtitle:
        "Profitez d'une flexibilité financière totale, sécurisée et adaptée à vos besoins en Afrique et ailleurs.",
      items: [
        {
          icon: "public",
          title: "Acceptation Mondiale",
          description:
            "Utilisez votre carte dans plus de 200 pays et sur tous vos sites préférés (Netflix, Amazon, Alibaba).",
        },
        {
          icon: "smartphone",
          title: "Recharge Instantanée",
          description:
            "Rechargez votre carte en quelques secondes via Mobile Money (MTN, Orange) depuis notre app.",
        },
        {
          icon: "badge",
          title: "Sans Compte Bancaire",
          description:
            "Aucune formalité bancaire complexe. Obtenez votre carte avec une simple pièce d'identité valide.",
        },
        {
          icon: "shield_lock",
          title: "Sécurité Maximale",
          description:
            "Vos transactions sont protégées par le cryptage 3D Secure, la technologie Visa et le verrouillage in-app.",
        },
      ],
    },
    howItWorks: {
      title: "Comment ça marche ?",
      subtitle: "Démarrez en moins de 10 minutes",
      steps: [
        { title: "Commandez", description: "Sélectionnez votre carte et commandez-la en ligne." },
        { title: "Recevez", description: "Livraison à domicile ou retrait en agence partenaire." },
        { title: "Activez", description: "Liez votre carte à l'application mobile LTC." },
        { title: "Utilisez", description: "Rechargez via Mobile Money et dépensez librement." },
      ],
    },
    app: {
      title: "L'application LTC au creux de votre main",
      description:
        "Gérez vos finances, bloquez votre carte en cas de perte, consultez vos transactions en temps réel et transférez de l'argent.",
      availableOn: "Disponible sur",
      downloadOn: "Télécharger sur",
      myAccount: "Mon Compte",
      currentBalance: "Solde actuel",
      topUp: "Recharger",
      send: "Envoyer",
      history: "Historique",
    },
    pricing: {
      title: "Nos Cartes Prépayées",
      subtitle: "Deux partenaires bancaires, plusieurs options selon vos besoins",
      popular: "PREMIUM",
      monthlyLimit: "Plafond mensuel",
      orderCta: "Commander",
      rechargeNote: "Rechargeable à distance via Orange Money et MTN MoMo - Contact: 673 20 93 75",
      accessBank: {
        description: "Carte Mastercard prépayée Access Bank - Activation instantanée",
        limit: "Plafond mensuel",
        features: [
          "Utilisable dans plus de 200 pays",
          "Transactions sécurisées",
          "Sans compte bancaire requis",
          "Activation instantanée",
          "Disponibilité immédiate",
          "Suivi en temps réel des dépenses",
        ],
        cta: "Commander Mastercard",
      },
      ubaCards: [
        { name: "Segment 1", limit: "2 500 000 FCFA", price: "10 000", oldPrice: "12 500" },
        { name: "Segment 2", limit: "4 500 000 FCFA", price: "15 000", oldPrice: "17 500" },
        { name: "Segment 3", limit: "10 000 000 FCFA", price: "25 000", oldPrice: "30 000" },
      ],
      ubaFeatures: [
        "Utilisable à l'internationale",
        "Achats en ligne",
        "Disponible immédiatement",
        "0 frais d'entretien",
        "Sécurité renforcée",
        "Validité 2-3 ans",
      ],
    },
    documents: {
      title: "Documents Requis",
      subtitle: "Pour obtenir votre carte prépayée, veuillez fournir les documents suivants:",
      processingTime: "Traitement sous 24-48h après réception des documents",
      items: [
        { name: "Une photo d'identité", description: "Format demi-carte (4x4 cm)" },
        { name: "Attestation d'immatriculation", description: "Document officiel d'enregistrement" },
        { name: "Photocopie de la CNI", description: "Carte Nationale d'Identité en cours de validité" },
        { name: "Plan de localisation", description: "Croquis ou capture Google Maps de votre domicile" },
      ],
    },
    orderForm: {
      title: "Formulaire de Commande",
      subtitle: "Remplissez ce formulaire pour commander votre carte Visa prépayée. Veuillez écrire en MAJUSCULES.",
      cardType: "Type de carte souhaitée",
      selectCard: "Sélectionnez une carte",
      firstName: "Prénom",
      lastName: "Nom",
      birthDate: "Date de naissance",
      birthCity: "Ville de naissance",
      cityNeighborhood: "Ville - Quartier de résidence",
      phone: "Téléphone",
      email: "Adresse email",
      profession: "Profession",
      idNumber: "Numéro de CNI / Récépissé / Passeport",
      registrationNumber: "Attestation d'immatriculation / NIU",
      fatherName: "Nom et prénom du père",
      motherName: "Nom et prénom de la mère",
      idPhoto: "Photo de votre CNI",
      idPhotoDesc: "Recto et verso de votre pièce d'identité",
      passportPhoto: "Photo d'identité",
      passportPhotoDesc: "Format demi-carte (4x4 cm)",
      uploadFile: "Cliquez pour sélectionner un fichier",
      dragDrop: "ou glissez-déposez ici",
      acceptedFormats: "PNG, JPG, PDF (max 5MB)",
      submit: "Envoyer ma demande",
      submitting: "Envoi en cours...",
      required: "Champs obligatoires",
      successTitle: "Demande envoyée !",
      successMessage: "Votre demande de carte a bien été enregistrée. Nous vous contacterons sous 24-48h.",
      errorTitle: "Erreur",
      errorMessage: "Une erreur est survenue. Veuillez réessayer ou nous contacter directement.",
    },
    business: {
      tag: "LTC Business",
      title: "Gérez les dépenses de votre entreprise",
      description:
        "Simplifiez la gestion des frais, distribuez des cartes à vos employés et contrôlez tout depuis un tableau de bord centralisé. Idéal pour les PME et startups.",
      cta: "Découvrir nos offres entreprises",
    },
    footer: {
      description:
        "LTC Financial Solutions est une filiale de LTC GROUP SARL. Nous démocratisons l'accès aux paiements numériques en Afrique centrale.",
      products: "Produits",
      productLinks: ["Carte Classic", "Carte Gold Premium", "Carte Virtuelle", "Business"],
      support: "Support",
      supportLinks: ["Centre d'aide", "FAQ", "Tarifs & Frais", "Contactez-nous"],
      legal: "Légal",
      legalLinks: ["Conditions d'utilisation", "Politique de confidentialité", "Mentions légales"],
      rights: "Tous droits réservés.",
      disclaimer:
        "Les services de carte Visa sont fournis par notre partenaire bancaire agréé par la COBAC.",
    },
  },
  en: {
    nav: {
      individuals: "Individuals",
      business: "Business",
      help: "Help",
      login: "Log in",
      orderCard: "Order my card",
    },
    hero: {
      badge: "New: Gold Premium Card",
      title1: "Your financial freedom",
      title2: "without borders",
      subtitle:
        "Pay anywhere in the world with the LTC Visa card. Top up instantly via Mobile Money (MTN, Orange). No bank account required.",
      cta1: "Order my card",
      cta2: "Learn more",
      delivery: "48h delivery",
      noCommitment: "No commitment",
    },
    partners: {
      title: "Trusted partners",
    },
    features: {
      title: "Why choose the",
      subtitle:
        "Enjoy total financial flexibility, secure and adapted to your needs in Africa and beyond.",
      items: [
        {
          icon: "public",
          title: "Worldwide Acceptance",
          description:
            "Use your card in over 200 countries and on all your favorite sites (Netflix, Amazon, Alibaba).",
        },
        {
          icon: "smartphone",
          title: "Instant Top-Up",
          description:
            "Top up your card in seconds via Mobile Money (MTN, Orange) from our app.",
        },
        {
          icon: "badge",
          title: "No Bank Account",
          description:
            "No complex banking formalities. Get your card with just a valid ID.",
        },
        {
          icon: "shield_lock",
          title: "Maximum Security",
          description:
            "Your transactions are protected by 3D Secure encryption, Visa technology and in-app locking.",
        },
      ],
    },
    howItWorks: {
      title: "How does it work?",
      subtitle: "Get started in less than 10 minutes",
      steps: [
        { title: "Order", description: "Select your card and order it online." },
        { title: "Receive", description: "Home delivery or pickup at partner agency." },
        { title: "Activate", description: "Link your card to the LTC mobile app." },
        { title: "Use", description: "Top up via Mobile Money and spend freely." },
      ],
    },
    app: {
      title: "The LTC app in the palm of your hand",
      description:
        "Manage your finances, block your card if lost, view your transactions in real time and transfer money.",
      availableOn: "Available on",
      downloadOn: "Download on",
      myAccount: "My Account",
      currentBalance: "Current balance",
      topUp: "Top Up",
      send: "Send",
      history: "History",
    },
    pricing: {
      title: "Our Prepaid Cards",
      subtitle: "Two banking partners, multiple options for your needs",
      popular: "PREMIUM",
      monthlyLimit: "Monthly limit",
      orderCta: "Order",
      rechargeNote: "Rechargeable remotely via Orange Money and MTN MoMo - Contact: 673 20 93 75",
      accessBank: {
        description: "Access Bank Prepaid Mastercard - Instant activation",
        limit: "Monthly limit",
        features: [
          "Usable in over 200 countries",
          "Secure transactions",
          "No bank account required",
          "Instant activation",
          "Immediate availability",
          "Real-time expense tracking",
        ],
        cta: "Order Mastercard",
      },
      ubaCards: [
        { name: "Segment 1", limit: "2,500,000 FCFA", price: "10,000", oldPrice: "12,500" },
        { name: "Segment 2", limit: "4,500,000 FCFA", price: "15,000", oldPrice: "17,500" },
        { name: "Segment 3", limit: "10,000,000 FCFA", price: "25,000", oldPrice: "30,000" },
      ],
      ubaFeatures: [
        "International use",
        "Online shopping",
        "Immediately available",
        "Zero maintenance fees",
        "Enhanced security",
        "2-3 years validity",
      ],
    },
    documents: {
      title: "Required Documents",
      subtitle: "To obtain your prepaid card, please provide the following documents:",
      processingTime: "Processing within 24-48h after document receipt",
      items: [
        { name: "Passport photo", description: "Half-card format (4x4 cm)" },
        { name: "Registration certificate", description: "Official registration document" },
        { name: "Copy of National ID", description: "Valid National Identity Card" },
        { name: "Location map", description: "Sketch or Google Maps screenshot of your home" },
      ],
    },
    orderForm: {
      title: "Order Form",
      subtitle: "Fill out this form to order your prepaid Visa card. Please write in CAPITAL LETTERS.",
      cardType: "Desired card type",
      selectCard: "Select a card",
      firstName: "First name",
      lastName: "Last name",
      birthDate: "Date of birth",
      birthCity: "City of birth",
      cityNeighborhood: "City - Neighborhood of residence",
      phone: "Phone number",
      email: "Email address",
      profession: "Profession",
      idNumber: "ID Card / Receipt / Passport Number",
      registrationNumber: "Registration Certificate / NIU",
      fatherName: "Father's full name",
      motherName: "Mother's full name",
      idPhoto: "Photo of your ID",
      idPhotoDesc: "Front and back of your identity document",
      passportPhoto: "Passport photo",
      passportPhotoDesc: "Half-card format (4x4 cm)",
      uploadFile: "Click to select a file",
      dragDrop: "or drag and drop here",
      acceptedFormats: "PNG, JPG, PDF (max 5MB)",
      submit: "Submit my request",
      submitting: "Sending...",
      required: "Required fields",
      successTitle: "Request sent!",
      successMessage: "Your card request has been registered. We will contact you within 24-48h.",
      errorTitle: "Error",
      errorMessage: "An error occurred. Please try again or contact us directly.",
    },
    business: {
      tag: "LTC Business",
      title: "Manage your company expenses",
      description:
        "Simplify expense management, distribute cards to your employees and control everything from a centralized dashboard. Ideal for SMEs and startups.",
      cta: "Discover our business offers",
    },
    footer: {
      description:
        "LTC Financial Solutions is a subsidiary of LTC GROUP SARL. We democratize access to digital payments in Central Africa.",
      products: "Products",
      productLinks: ["Classic Card", "Gold Premium Card", "Virtual Card", "Business"],
      support: "Support",
      supportLinks: ["Help Center", "FAQ", "Rates & Fees", "Contact Us"],
      legal: "Legal",
      legalLinks: ["Terms of Use", "Privacy Policy", "Legal Notice"],
      rights: "All rights reserved.",
      disclaimer:
        "Visa card services are provided by our banking partner licensed by COBAC.",
    },
  },
};
