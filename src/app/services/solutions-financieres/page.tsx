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
            <div className="hidden md:flex items-center space-x-6">
              <a className="text-sm font-medium text-gray-300 hover:text-[#cea427] transition-colors" href="#pricing">
                {t.nav.pricing}
              </a>
              <a className="text-sm font-medium text-gray-300 hover:text-[#cea427] transition-colors" href="#resellers">
                {t.nav.partners}
              </a>
              <a className="text-sm font-medium text-gray-300 hover:text-[#cea427] transition-colors" href="#faq">
                {t.nav.faq}
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
                className="relative w-full aspect-[1.586/1] rounded-2xl transform transition-transform duration-700 ease-out hover:rotate-2 hover:scale-105 shadow-2xl z-20 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)",
                  boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(206, 164, 39, 0.1)",
                }}
              >
                {/* Card Background Pattern */}
                <div className="absolute inset-0">
                  {/* Holographic stripe effect */}
                  <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(120deg,transparent_30%,rgba(206,164,39,0.03)_50%,transparent_70%)]"></div>
                  {/* Subtle world map pattern */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='white' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='30' fill='none' stroke='white' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='20' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")", backgroundSize: "200px"}}></div>
                </div>

                <div className="absolute inset-0 rounded-2xl border border-white/10">
                  {/* Gold corner accent */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-[radial-gradient(circle,rgba(206,164,39,0.15)_0%,transparent_70%)]"></div>

                  {/* Bank Logo */}
                  <div className="absolute top-6 left-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#cea427] via-[#f0d77c] to-[#cea427] flex items-center justify-center shadow-lg">
                      <span className="text-[#10151e] font-black text-sm">LTC</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white/90 text-xs font-bold tracking-wider">LTC FINANCE</span>
                      <span className="text-[#cea427] text-[10px] tracking-widest">GOLD PREMIUM</span>
                    </div>
                  </div>

                  {/* Debit Label */}
                  <div className="absolute top-6 right-6 text-white/40 text-xs font-medium tracking-[0.2em]">DEBIT</div>

                  {/* EMV Chip */}
                  <div className="absolute top-[85px] left-6 w-14 h-11 rounded-lg overflow-hidden shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-[#d4af37] via-[#f5d76e] to-[#aa8c2c] relative">
                      {/* Chip lines */}
                      <div className="absolute inset-1 border border-[#8b7024]/30 rounded-sm"></div>
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#8b7024]/40"></div>
                      <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#8b7024]/40"></div>
                      <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-[#8b7024]/30 rounded-sm"></div>
                    </div>
                  </div>

                  {/* Contactless Symbol */}
                  <div className="absolute top-[90px] left-24">
                    <svg className="w-8 h-8 text-white/60" viewBox="0 0 24 24" fill="none">
                      <path d="M12 18c3.31 0 6-2.69 6-6s-2.69-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M12 14c1.66 0 3-1.34 3-3s-1.34-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M12 10c0.55 0 1 0.45 1 1s-0.45 1-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>

                  {/* Card Number */}
                  <div className="absolute bottom-[70px] left-6 right-6">
                    <div className="text-white font-mono text-xl sm:text-2xl tracking-[0.25em] drop-shadow-lg flex justify-between">
                      <span>4289</span>
                      <span>****</span>
                      <span>****</span>
                      <span>7842</span>
                    </div>
                  </div>

                  {/* Card Holder & Expiry */}
                  <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end">
                    <div>
                      <div className="text-white/40 text-[9px] tracking-wider mb-1">CARD HOLDER</div>
                      <div className="text-white font-medium text-sm tracking-wider">JEAN DUPONT</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/40 text-[9px] tracking-wider mb-1">VALID THRU</div>
                      <div className="text-white font-medium text-sm tracking-wider">12/28</div>
                    </div>
                    {/* Visa Logo */}
                    <div className="ml-4">
                      <svg className="w-16 h-10" viewBox="0 0 80 26" fill="none">
                        <path d="M32.5 1.5L28 24.5H22.5L27 1.5H32.5Z" fill="white"/>
                        <path d="M54 1.5L49.5 17L48.5 12L46 3.5C46 3.5 45.7 1.5 43 1.5H33.5L33.3 2C33.3 2 36.5 2.7 40 4.8L44.5 24.5H50.5L60.5 1.5H54Z" fill="white"/>
                        <path d="M18 1.5L10.5 17.5L9.7 13L7 3.5C7 3.5 6.7 1.5 4 1.5H0.5V2C0.5 2 5 3 9 6.5C12.8 9.8 14 13 14 13L18 24.5H24L30 1.5H18Z" fill="white"/>
                        <path d="M67 1.5C64.5 1.5 63.5 2.8 63.5 2.8L55 24.5H61L62 21.5H69.5L70.2 24.5H75.5L70.8 1.5H67ZM63.5 17L66.5 8L68 17H63.5Z" fill="white"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* Ambient shadow below card */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[70%] h-6 bg-black/50 blur-xl rounded-[100%]"></div>
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
      <section className="py-20 bg-[#10151e]" id="pricing">
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
                <a
                  href="#order-form"
                  className="w-full py-3 rounded bg-[#0033a0] text-white font-bold hover:bg-[#002080] transition-colors block text-center"
                >
                  {t.pricing.accessBank.cta}
                </a>
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

                  <a
                    href="#order-form"
                    className={`w-full py-3 rounded font-bold transition-colors block text-center ${
                      index === 2
                        ? "bg-[#cea427] text-[#10151e] hover:bg-[#b38d1f]"
                        : "bg-[#ce1126] text-white hover:bg-[#a00d1e]"
                    }`}
                  >
                    {t.pricing.orderCta}
                  </a>
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

      {/* Resellers/Partners Section */}
      <section className="py-20 bg-[#10151e] relative overflow-hidden" id="resellers">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(206,164,39,0.08)_0%,rgba(16,21,30,0)_70%)] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#cea427]/10 border border-[#cea427]/20 mb-6">
              <span className="material-symbols-outlined text-[#cea427]">handshake</span>
              <span className="text-[#cea427] font-bold text-sm">{t.resellers.tag}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.resellers.title}</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.resellers.subtitle}</p>
          </div>

          {/* Partner Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Segment 1 */}
            <div className="bg-[#1B2233] rounded-2xl p-6 border border-white/10 hover:border-[#cea427]/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-white">{t.resellers.segment1.name}</span>
                <span className="text-white font-bold italic">VISA</span>
              </div>
              <div className="text-sm text-[#cea427] font-medium mb-4">
                {language === "fr" ? "Plafond:" : "Limit:"} {t.resellers.segment1.limit}
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between bg-[#10151e] rounded-lg p-3">
                  <span className="text-gray-400 text-sm">{t.resellers.validity2y}</span>
                  <span className="text-white font-bold">{t.resellers.segment1.price2y} FCFA</span>
                </div>
                <div className="flex items-center justify-between bg-[#10151e] rounded-lg p-3">
                  <span className="text-gray-400 text-sm">{t.resellers.validity3y}</span>
                  <span className="text-white font-bold">{t.resellers.segment1.price3y} FCFA</span>
                </div>
              </div>
            </div>

            {/* Segment 2 */}
            <div className="bg-[#1B2233] rounded-2xl p-6 border border-[#cea427]/30 hover:border-[#cea427]/50 transition-all relative">
              <div className="absolute top-0 right-0 bg-[#cea427] text-[#10151e] text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                {language === "fr" ? "POPULAIRE" : "POPULAR"}
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-[#cea427]">{t.resellers.segment2.name}</span>
                <span className="text-white font-bold italic">VISA</span>
              </div>
              <div className="text-sm text-[#cea427] font-medium mb-4">
                {language === "fr" ? "Plafond:" : "Limit:"} {t.resellers.segment2.limit}
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between bg-[#10151e] rounded-lg p-3">
                  <span className="text-gray-400 text-sm">{t.resellers.validity2y}</span>
                  <span className="text-white font-bold">{t.resellers.segment2.price2y} FCFA</span>
                </div>
                <div className="flex items-center justify-between bg-[#10151e] rounded-lg p-3 border border-[#cea427]/20">
                  <span className="text-gray-400 text-sm">{t.resellers.validity3y}</span>
                  <span className="text-[#cea427] font-bold">{t.resellers.segment2.price3y} FCFA</span>
                </div>
              </div>
            </div>

            {/* Segment 3 */}
            <div className="bg-[#1B2233] rounded-2xl p-6 border border-white/10 hover:border-[#cea427]/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-white">{t.resellers.segment3.name}</span>
                <span className="text-white font-bold italic">VISA</span>
              </div>
              <div className="text-sm text-[#cea427] font-medium mb-4">
                {language === "fr" ? "Plafond:" : "Limit:"} {t.resellers.segment3.limit}
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between bg-[#10151e] rounded-lg p-3">
                  <span className="text-gray-400 text-sm">{t.resellers.validity3y}</span>
                  <span className="text-white font-bold">{t.resellers.segment3.price3y} FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Minimum Order Notice */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <div className="flex items-center gap-2 bg-[#1B2233] px-4 py-2 rounded-full border border-white/10">
              <span className="material-symbols-outlined text-[#cea427] text-[20px]">inventory_2</span>
              <span className="text-gray-300 text-sm">{t.resellers.minOrder}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#1B2233] px-4 py-2 rounded-full border border-white/10">
              <span className="material-symbols-outlined text-[#cea427] text-[20px]">shuffle</span>
              <span className="text-gray-300 text-sm">{t.resellers.mixSegments}</span>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-[#1B2233] rounded-2xl p-8 lg:p-12 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">{t.resellers.howItWorks.title}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#cea427]/20 flex items-center justify-center mx-auto mb-4 border-2 border-[#cea427]">
                  <span className="material-symbols-outlined text-[#cea427] text-3xl">shopping_cart</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{t.resellers.howItWorks.step1.title}</h4>
                <p className="text-sm text-gray-400">{t.resellers.howItWorks.step1.description}</p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#cea427]/20 flex items-center justify-center mx-auto mb-4 border-2 border-[#cea427]">
                  <span className="material-symbols-outlined text-[#cea427] text-3xl">sell</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{t.resellers.howItWorks.step2.title}</h4>
                <p className="text-sm text-gray-400">{t.resellers.howItWorks.step2.description}</p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#cea427]/20 flex items-center justify-center mx-auto mb-4 border-2 border-[#cea427]">
                  <span className="material-symbols-outlined text-[#cea427] text-3xl">send</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{t.resellers.howItWorks.step3.title}</h4>
                <p className="text-sm text-gray-400">{t.resellers.howItWorks.step3.description}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 text-center">
              <a
                href="https://wa.me/237673209375?text=Bonjour%2C%20je%20souhaite%20devenir%20partenaire%20revendeur%20de%20cartes%20Visa."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 h-14 px-10 rounded-lg bg-[#cea427] hover:bg-[#b38d1f] text-[#10151e] font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-[#cea427]/20"
              >
                <span className="material-symbols-outlined">handshake</span>
                {t.resellers.cta}
              </a>
              <p className="text-gray-500 text-sm mt-4">{t.resellers.ctaSubtext}</p>
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

      {/* FAQ Section */}
      <section className="py-20 bg-[#10151e]" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#cea427]/10 border border-[#cea427]/20 mb-6">
              <span className="material-symbols-outlined text-[#cea427]">help</span>
              <span className="text-[#cea427] font-bold text-sm">{t.faq.tag}</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">{t.faq.title}</h2>
            <p className="text-gray-400">{t.faq.subtitle}</p>
          </div>

          <div className="space-y-4">
            {t.faq.items.map((item, index) => (
              <details
                key={index}
                className="group bg-[#1B2233] rounded-xl border border-white/10 overflow-hidden hover:border-[#cea427]/30 transition-colors"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-white font-medium pr-4">{item.question}</span>
                  <span className="material-symbols-outlined text-[#cea427] transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-gray-400 leading-relaxed">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">{t.faq.moreQuestions}</p>
            <a
              href="https://wa.me/237673209375?text=Bonjour%2C%20j'ai%20une%20question%20concernant%20les%20cartes%20Visa%20LTC."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t.faq.contactUs}
            </a>
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
      pricing: "Nos Cartes",
      partners: "Partenaires",
      faq: "FAQ",
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
    resellers: {
      tag: "Programme Partenaires",
      title: "Devenez Revendeur de Cartes Visa",
      subtitle: "Rejoignez notre réseau de partenaires et bénéficiez de prix préférentiels pour revendre les cartes Visa prépayées UBA.",
      minOrder: "Commande minimum: 25 cartes par segment",
      mixSegments: "Vous pouvez mixer plusieurs segments",
      validity2y: "Validité 2 ans",
      validity3y: "Validité 3 ans",
      segment1: {
        name: "Segment 1",
        limit: "2 500 000 FCFA/mois",
        price2y: "6 500",
        price3y: "7 500",
      },
      segment2: {
        name: "Segment 2",
        limit: "4 500 000 FCFA/mois",
        price2y: "8 000",
        price3y: "10 000",
      },
      segment3: {
        name: "Segment 3",
        limit: "10 000 000 FCFA/mois",
        price3y: "15 000",
      },
      howItWorks: {
        title: "Comment ça fonctionne ?",
        step1: {
          title: "Achetez votre stock",
          description: "Commandez minimum 25 cartes aux prix partenaires. Vous pouvez mixer plusieurs segments.",
        },
        step2: {
          title: "Revendez librement",
          description: "Fixez vos propres prix de vente. Votre marge vous appartient entièrement.",
        },
        step3: {
          title: "Envoyez les infos",
          description: "À chaque vente, transmettez-nous les informations client pour l'enregistrement de la carte.",
        },
      },
      cta: "Devenir Partenaire",
      ctaSubtext: "Contactez-nous pour rejoindre le programme",
    },
    faq: {
      tag: "FAQ",
      title: "Questions Fréquentes",
      subtitle: "Retrouvez les réponses aux questions les plus courantes sur nos cartes Visa prépayées",
      moreQuestions: "Vous avez d'autres questions ?",
      contactUs: "Contactez-nous sur WhatsApp",
      items: [
        {
          question: "Comment obtenir une carte Visa LTC ?",
          answer: "C'est simple ! Remplissez le formulaire de commande sur notre site avec vos informations personnelles et une copie de votre CNI. Votre carte sera prête sous 24-48h. Vous pouvez également nous contacter directement via WhatsApp au 673 20 93 75."
        },
        {
          question: "Comment recharger ma carte ?",
          answer: "Vous pouvez recharger votre carte instantanément via Orange Money ou MTN Mobile Money. Contactez-nous au 673 20 93 75 avec le montant souhaité et nous effectuons la recharge en quelques minutes."
        },
        {
          question: "Puis-je utiliser ma carte à l'étranger ?",
          answer: "Oui ! Votre carte Visa est acceptée dans plus de 200 pays et sur des millions de sites web (Netflix, Amazon, Alibaba, etc.). Elle fonctionne pour les paiements en ligne et les retraits aux distributeurs automatiques."
        },
        {
          question: "Quels sont les frais associés à la carte ?",
          answer: "Le prix de la carte inclut son activation. Il n'y a pas de frais d'entretien mensuels. Les frais de transaction dépendent de votre utilisation (retrait DAB, paiement international). Contactez-nous pour plus de détails sur la grille tarifaire."
        },
        {
          question: "Quelle est la différence entre les segments 1, 2 et 3 ?",
          answer: "La différence principale est le plafond mensuel de dépenses. Segment 1: jusqu'à 2,5 millions FCFA/mois. Segment 2: jusqu'à 4,5 millions FCFA/mois. Segment 3: jusqu'à 10 millions FCFA/mois. Choisissez selon vos besoins."
        },
        {
          question: "Combien de temps faut-il pour recevoir ma carte ?",
          answer: "Une fois votre demande validée et le paiement effectué, votre carte est généralement prête sous 24 à 48 heures. La livraison à domicile est disponible à Yaoundé, Douala et dans les principales villes."
        },
        {
          question: "Que faire si je perds ma carte ?",
          answer: "En cas de perte ou de vol, contactez-nous immédiatement au 673 20 93 75. Nous bloquerons votre carte pour éviter toute utilisation frauduleuse. Une nouvelle carte pourra être émise avec le solde restant."
        },
        {
          question: "Comment devenir revendeur de cartes ?",
          answer: "Rejoignez notre programme partenaires ! Commandez un minimum de 25 cartes par segment à des prix préférentiels et revendez-les librement. Contactez-nous via WhatsApp pour connaître les tarifs revendeurs et les modalités."
        }
      ]
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
      pricing: "Our Cards",
      partners: "Partners",
      faq: "FAQ",
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
    resellers: {
      tag: "Partner Program",
      title: "Become a Visa Card Reseller",
      subtitle: "Join our partner network and benefit from preferential prices to resell UBA prepaid Visa cards.",
      minOrder: "Minimum order: 25 cards per segment",
      mixSegments: "You can mix multiple segments",
      validity2y: "2 years validity",
      validity3y: "3 years validity",
      segment1: {
        name: "Segment 1",
        limit: "2,500,000 FCFA/month",
        price2y: "6,500",
        price3y: "7,500",
      },
      segment2: {
        name: "Segment 2",
        limit: "4,500,000 FCFA/month",
        price2y: "8,000",
        price3y: "10,000",
      },
      segment3: {
        name: "Segment 3",
        limit: "10,000,000 FCFA/month",
        price3y: "15,000",
      },
      howItWorks: {
        title: "How does it work?",
        step1: {
          title: "Buy your stock",
          description: "Order minimum 25 cards at partner prices. You can mix multiple segments.",
        },
        step2: {
          title: "Resell freely",
          description: "Set your own selling prices. Your margin is entirely yours.",
        },
        step3: {
          title: "Send the info",
          description: "For each sale, send us customer information for card registration.",
        },
      },
      cta: "Become a Partner",
      ctaSubtext: "Contact us to join the program",
    },
    faq: {
      tag: "FAQ",
      title: "Frequently Asked Questions",
      subtitle: "Find answers to the most common questions about our prepaid Visa cards",
      moreQuestions: "Do you have other questions?",
      contactUs: "Contact us on WhatsApp",
      items: [
        {
          question: "How do I get an LTC Visa card?",
          answer: "It's simple! Fill out the order form on our website with your personal information and a copy of your ID. Your card will be ready within 24-48 hours. You can also contact us directly via WhatsApp at 673 20 93 75."
        },
        {
          question: "How do I top up my card?",
          answer: "You can top up your card instantly via Orange Money or MTN Mobile Money. Contact us at 673 20 93 75 with the desired amount and we'll process the top-up within minutes."
        },
        {
          question: "Can I use my card abroad?",
          answer: "Yes! Your Visa card is accepted in over 200 countries and on millions of websites (Netflix, Amazon, Alibaba, etc.). It works for online payments and ATM withdrawals."
        },
        {
          question: "What are the fees associated with the card?",
          answer: "The card price includes activation. There are no monthly maintenance fees. Transaction fees depend on your usage (ATM withdrawal, international payment). Contact us for more details on the fee schedule."
        },
        {
          question: "What is the difference between segments 1, 2 and 3?",
          answer: "The main difference is the monthly spending limit. Segment 1: up to 2.5 million FCFA/month. Segment 2: up to 4.5 million FCFA/month. Segment 3: up to 10 million FCFA/month. Choose according to your needs."
        },
        {
          question: "How long does it take to receive my card?",
          answer: "Once your request is validated and payment is made, your card is usually ready within 24 to 48 hours. Home delivery is available in Yaoundé, Douala and major cities."
        },
        {
          question: "What should I do if I lose my card?",
          answer: "In case of loss or theft, contact us immediately at 673 20 93 75. We will block your card to prevent fraudulent use. A new card can be issued with the remaining balance."
        },
        {
          question: "How do I become a card reseller?",
          answer: "Join our partner program! Order a minimum of 25 cards per segment at preferential prices and resell them freely. Contact us via WhatsApp to learn about reseller rates and terms."
        }
      ]
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
