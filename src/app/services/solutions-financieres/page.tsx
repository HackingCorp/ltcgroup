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
    deliveryOption: "",
    deliveryAddress: "",
    shippingCity: "",
  });

  // Shipping cities with their prices
  const shippingCities = {
    zone1: {
      price: 2000,
      cities: ["BAFOUSSAM", "MBOUDA", "DSCHANG", "BAFANG", "NKONGSAMBA", "KRIBI", "BERTOUA"],
    },
    zone2: {
      price: 3000,
      cities: ["NGAOUNDERE", "GAROUA-BOULAI", "MEIGANGA"],
    },
    zone3: {
      price: 3000,
      label: "Autre ville",
    },
  };

  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const [noNiu, setNoNiu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error" | "payment_pending">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"pay_later" | "mobile_money" | "enkap">("pay_later");
  const [paymentStatus, setPaymentStatus] = useState<{
    ptn?: string;
    trid?: string;
    orderId?: string;
    checking?: boolean;
  }>({});
  const [pendingOrderData, setPendingOrderData] = useState<Record<string, unknown> | null>(null);

  // Price calculation
  const getCardPrice = () => {
    const prices: Record<string, number> = {
      "ACCESS_MASTERCARD_12500": 12500,
      "UBA_SEGMENT1_2ANS_10000": 10000,
      "UBA_SEGMENT1_3ANS_12500": 12500,
      "UBA_SEGMENT2_15000": 15000,
      "UBA_SEGMENT3_25000": 25000,
    };
    return prices[formData.cardType] || 0;
  };

  const getDeliveryFee = () => {
    if (formData.deliveryOption === "delivery_douala" || formData.deliveryOption === "delivery_yaounde") {
      return 1500;
    }
    if (formData.deliveryOption === "shipping" && formData.shippingCity) {
      // Check zone 1 cities (2000 FCFA)
      if (shippingCities.zone1.cities.includes(formData.shippingCity)) {
        return 2000;
      }
      // Check zone 2 cities (3000 FCFA)
      if (shippingCities.zone2.cities.includes(formData.shippingCity)) {
        return 3000;
      }
      // Other cities (3000 FCFA)
      if (formData.shippingCity === "AUTRE") {
        return 3000;
      }
    }
    return 0;
  };

  // Check if shipping requires online payment
  const isShippingSelected = formData.deliveryOption === "shipping";

  // Force payment method when shipping is selected
  const effectivePaymentMethod = isShippingSelected && paymentMethod === "pay_later"
    ? "mobile_money"
    : paymentMethod;

  const getNiuFee = () => noNiu ? 3000 : 0;

  const getTotal = () => getCardPrice() + getDeliveryFee() + getNiuFee();

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

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Generate order reference
  const generateOrderRef = () => `LTC-${Date.now().toString(36).toUpperCase()}`;

  // Send order notification to manager
  const sendOrderNotification = async (orderData: Record<string, unknown>, status: string, method: string) => {
    try {
      const response = await fetch("/api/send-card-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          paymentStatus: status,
          paymentMethod: method,
        }),
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Failed to send order notification:", error);
      return false;
    }
  };

  // Check Mobile Money payment status
  const checkMobileMoneyStatus = async (trid: string) => {
    try {
      const response = await fetch(`/api/payments/initiate?trid=${trid}`);
      const result = await response.json();

      if (!result.success && result.error) {
        // API error during verification
        console.error("Verification error:", result.error);
        setErrorMessage(result.error);
        setSubmitStatus("error");
        setPaymentStatus({});
        return;
      }

      if (result.status === "SUCCESS") {
        // Send order notification with payment status
        if (pendingOrderData) {
          await sendOrderNotification(pendingOrderData, "SUCCESS", "mobile_money");
          setPendingOrderData(null);
        }
        setSubmitStatus("success");
        setPaymentStatus({});
      } else if (result.status === "FAILED" || result.status === "ERRORED") {
        // Send order notification with failed status
        if (pendingOrderData) {
          await sendOrderNotification(pendingOrderData, "FAILED", "mobile_money");
          setPendingOrderData(null);
        }
        setErrorMessage(result.errorMessage || "Le paiement a échoué. Veuillez réessayer.");
        setSubmitStatus("error");
        setPaymentStatus({});
      }
      // If still PENDING, keep checking
    } catch (error) {
      console.error("Status check error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Validate delivery option
      if (!formData.deliveryOption) {
        throw new Error("Veuillez sélectionner un mode de réception de votre carte.");
      }

      // Validate shipping city if shipping is selected
      if (formData.deliveryOption === "shipping" && !formData.shippingCity) {
        throw new Error("Veuillez sélectionner une ville de destination.");
      }

      // Validate delivery address for delivery/shipping options
      const needsAddress = formData.deliveryOption === "delivery_douala" ||
        formData.deliveryOption === "delivery_yaounde" ||
        formData.deliveryOption === "shipping";

      if (needsAddress && !formData.deliveryAddress.trim()) {
        throw new Error("Veuillez entrer votre adresse de livraison complète.");
      }

      // Build price breakdown
      const cardPrice = getCardPrice();
      const deliveryFee = getDeliveryFee();
      const niuFee = getNiuFee();
      const total = getTotal();
      const orderRef = generateOrderRef();

      // Convert files to base64
      let idPhotoBase64 = null;
      let passportPhotoBase64 = null;

      if (idPhotoFile) {
        idPhotoBase64 = await fileToBase64(idPhotoFile);
      }
      if (passportPhotoFile) {
        passportPhotoBase64 = await fileToBase64(passportPhotoFile);
      }

      // Handle payment based on selected method (use effective method for shipping)
      const finalPaymentMethod = isShippingSelected && paymentMethod === "pay_later"
        ? "mobile_money"
        : paymentMethod;

      if (finalPaymentMethod === "mobile_money" || finalPaymentMethod === "enkap") {
        // Initiate payment
        const paymentResponse = await fetch("/api/payments/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: finalPaymentMethod,
            amount: total,
            orderRef,
            phone: formData.phone,
            email: formData.email,
            customerName: `${formData.firstName} ${formData.lastName}`,
            cardType: formData.cardType,
            orderDetails: { cardPrice, deliveryFee, niuFee, deliveryOption: formData.deliveryOption },
          }),
        });

        const paymentResult = await paymentResponse.json();

        if (!paymentResult.success) {
          throw new Error(paymentResult.error || "Payment initiation failed");
        }

        if (finalPaymentMethod === "enkap" && paymentResult.paymentUrl) {
          // Store order data before redirect
          sessionStorage.setItem("pendingOrder", JSON.stringify({
            ...formData,
            noNiu,
            cardPrice,
            deliveryFee,
            niuFee,
            total,
            orderRef,
            idPhoto: idPhotoBase64,
            idPhotoName: idPhotoFile?.name,
            passportPhoto: passportPhotoBase64,
            passportPhotoName: passportPhotoFile?.name,
          }));

          // Redirect to E-nkap payment page
          window.location.href = paymentResult.paymentUrl;
          return;
        }

        if (finalPaymentMethod === "mobile_money" && paymentResult.trid) {
          // Store order data for later notification
          setPendingOrderData({
            ...formData,
            noNiu,
            cardPrice,
            deliveryFee,
            niuFee,
            total,
            idPhoto: idPhotoBase64,
            idPhotoName: idPhotoFile?.name,
            passportPhoto: passportPhotoBase64,
            passportPhotoName: passportPhotoFile?.name,
          });

          // Show Mobile Money confirmation screen
          setPaymentStatus({ ptn: paymentResult.ptn, trid: paymentResult.trid, checking: true });
          setSubmitStatus("payment_pending");

          // Start polling for payment status using TRID (more reliable)
          const pollInterval = setInterval(async () => {
            await checkMobileMoneyStatus(paymentResult.trid);
          }, 5000);

          // Store interval to clear later
          setTimeout(() => {
            clearInterval(pollInterval);
            if (submitStatus === "payment_pending") {
              setPaymentStatus(prev => ({ ...prev, checking: false }));
            }
          }, 120000); // Stop polling after 2 minutes

          return;
        }
      }

      // For "pay_later" method - send order notification only
      const response = await fetch("/api/send-card-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          noNiu,
          cardPrice,
          deliveryFee,
          niuFee,
          total,
          idPhoto: idPhotoBase64,
          idPhotoName: idPhotoFile?.name,
          passportPhoto: passportPhotoBase64,
          passportPhotoName: passportPhotoFile?.name,
          paymentStatus: "NOT_PAID",
          paymentMethod: "pay_later",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send order");
      }

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
        deliveryOption: "",
        deliveryAddress: "",
        shippingCity: "",
      });
      setIdPhotoFile(null);
      setPassportPhotoFile(null);
      setNoNiu(false);
      setPaymentMethod("pay_later");
    } catch (error) {
      console.error("Submit error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue. Veuillez réessayer.");
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
                <a
                  href="#order-form"
                  className="w-full sm:w-auto h-12 px-8 rounded bg-[#cea427] hover:bg-[#b38d1f] text-[#10151e] font-bold text-base transition-all shadow-lg shadow-[#cea427]/20 flex items-center justify-center gap-2"
                >
                  <span>{t.hero.cta1}</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </a>
                <a
                  href="#pricing"
                  className="w-full sm:w-auto h-12 px-8 rounded border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all backdrop-blur-sm flex items-center justify-center"
                >
                  {t.hero.cta2}
                </a>
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
            <div className="flex-1 relative w-full max-w-[450px] lg:max-w-[480px] mx-auto lg:mx-0">
              <div
                className="relative w-full aspect-[1.586/1] rounded-2xl transform transition-transform duration-700 ease-out hover:rotate-2 hover:scale-[1.02] z-20 overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, #232323 0%, #1a1a1a 30%, #0f0f0f 70%, #1a1a1a 100%)",
                  boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(206, 164, 39, 0.08)",
                }}
              >
                {/* Card border */}
                <div className="absolute inset-0 rounded-2xl border border-white/[0.08]"></div>

                {/* Subtle golden glow top right */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(206,164,39,0.12)_0%,transparent_60%)]"></div>

                {/* Card Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  {/* Top Row - Logo and Debit */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#d4af37] via-[#f5d76e] to-[#b8941f] flex items-center justify-center shadow-lg border border-[#f5d76e]/30">
                        <span className="text-[#1a1a1a] font-black text-sm tracking-tight">LTC</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-xs font-semibold tracking-wide">LTC FINANCE</span>
                        <span className="text-[#d4af37] text-[10px] font-medium tracking-widest">GOLD PREMIUM</span>
                      </div>
                    </div>
                    <span className="text-white/30 text-[11px] font-medium tracking-[0.25em]">DEBIT</span>
                  </div>

                  {/* Middle Row - Chip and Contactless */}
                  <div className="flex items-center gap-4 -mt-2">
                    {/* EMV Chip */}
                    <div className="w-[52px] h-[40px] rounded-md overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-[#e8c547] via-[#d4af37] to-[#a08030] relative">
                        <div className="absolute inset-[3px] rounded-sm border border-[#8b7024]/40"></div>
                        <div className="absolute top-1/2 left-[3px] right-[3px] h-[1px] bg-[#8b7024]/50 -translate-y-1/2"></div>
                        <div className="absolute left-1/2 top-[3px] bottom-[3px] w-[1px] bg-[#8b7024]/50 -translate-x-1/2"></div>
                        <div className="absolute top-[25%] left-[25%] w-[50%] h-[50%] border border-[#8b7024]/40 rounded-[2px]"></div>
                      </div>
                    </div>
                    {/* Contactless */}
                    <svg className="w-7 h-7 text-white/50" viewBox="0 0 24 24" fill="none">
                      <path d="M6.5 13.5c0-3.04 2.46-5.5 5.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M8.5 13.5c0-1.93 1.57-3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M10.5 13.5c0-.83.67-1.5 1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>

                  {/* Card Number */}
                  <div className="mt-1">
                    <div className="text-white/95 font-mono text-[22px] sm:text-[26px] tracking-[0.18em] font-medium">
                      4289 •••• •••• 7842
                    </div>
                  </div>

                  {/* Bottom Row - Name, Expiry, Visa */}
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="text-white/30 text-[8px] tracking-[0.15em] mb-0.5">CARD HOLDER</div>
                      <div className="text-white/90 text-[13px] font-medium tracking-wide">JEAN DUPONT</div>
                    </div>
                    <div className="flex-shrink-0 mx-4">
                      <div className="text-white/30 text-[8px] tracking-[0.15em] mb-0.5">VALID THRU</div>
                      <div className="text-white/90 text-[13px] font-medium tracking-wide">12/28</div>
                    </div>
                    {/* Visa Logo */}
                    <div className="flex-shrink-0">
                      <span className="text-white text-3xl font-bold italic tracking-tight" style={{fontFamily: "Arial, sans-serif"}}>VISA</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Ambient shadow below card */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[75%] h-5 bg-black/60 blur-xl rounded-[100%]"></div>
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

            {/* Fees Info */}
            <div className="mt-8 bg-[#1B2233] rounded-xl p-6 border border-white/10 max-w-2xl mx-auto">
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#cea427]">payments</span>
                {t.pricing.ubaFees.title}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="material-symbols-outlined text-gray-500 text-[18px]">calendar_month</span>
                  {t.pricing.ubaFees.monthly}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="material-symbols-outlined text-gray-500 text-[18px]">atm</span>
                  {t.pricing.ubaFees.atm}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="material-symbols-outlined text-gray-500 text-[18px]">lock_reset</span>
                  {t.pricing.ubaFees.pinReset}
                </div>
              </div>
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
            ) : submitStatus === "payment_pending" ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-6">
                  {paymentStatus.checking ? (
                    <span className="material-symbols-outlined text-orange-500 text-4xl animate-pulse">smartphone</span>
                  ) : (
                    <span className="material-symbols-outlined text-orange-500 text-4xl">hourglass_top</span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {language === "fr" ? "Confirmez le paiement" : "Confirm payment"}
                </h3>
                <p className="text-gray-400 mb-4">
                  {language === "fr"
                    ? "Une demande de paiement a été envoyée sur votre téléphone."
                    : "A payment request has been sent to your phone."
                  }
                </p>
                <div className="bg-[#10151e] rounded-xl p-4 mb-6 max-w-sm mx-auto">
                  <p className="text-sm text-gray-400 mb-2">
                    {language === "fr" ? "Composez sur votre téléphone :" : "Dial on your phone:"}
                  </p>
                  <p className="text-xl font-mono text-[#cea427]">*126# (MTN) / #150# (Orange)</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {language === "fr"
                      ? "Puis confirmez le paiement avec votre code PIN"
                      : "Then confirm the payment with your PIN code"
                    }
                  </p>
                </div>
                {paymentStatus.checking ? (
                  <div className="flex items-center justify-center gap-2 text-orange-400">
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span className="text-sm">
                      {language === "fr" ? "Vérification en cours..." : "Checking status..."}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      {language === "fr"
                        ? "Le délai de vérification a expiré. Votre paiement a peut-être été traité."
                        : "Verification timeout. Your payment may have been processed."
                      }
                    </p>
                    <button
                      onClick={() => {
                        setSubmitStatus("idle");
                        setPaymentStatus({});
                      }}
                      className="px-6 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors"
                    >
                      {language === "fr" ? "Réessayer" : "Try again"}
                    </button>
                  </div>
                )}
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
                    <option value="UBA_SEGMENT1_2ANS_10000">UBA Visa Segment 1 - 10 000 FCFA (2 ans - Plafond 2.5M)</option>
                    <option value="UBA_SEGMENT1_3ANS_12500">UBA Visa Segment 1 - 12 500 FCFA (3 ans - Plafond 2.5M)</option>
                    <option value="UBA_SEGMENT2_15000">UBA Visa Segment 2 - 15 000 FCFA (Plafond 4M)</option>
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
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        {t.orderForm.registrationNumber} {!noNiu && <span className="text-[#cea427]">*</span>}
                      </label>
                      {/* Info tooltip */}
                      <div className="group relative">
                        <span className="material-symbols-outlined text-[#cea427] text-[16px] cursor-help">info</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-[#1B2233] border border-white/10 rounded-lg shadow-xl z-50">
                          <p className="text-xs text-gray-300 leading-relaxed">{t.orderForm.niuExplanation}</p>
                        </div>
                      </div>
                    </div>

                    {!noNiu && (
                      <div className="mb-3">
                        <input
                          type="text"
                          name="registrationNumber"
                          value={formData.registrationNumber}
                          onChange={handleInputChange}
                          required
                          minLength={14}
                          maxLength={14}
                          pattern="[A-Za-z0-9]{14}"
                          placeholder="XXXXXXXXXXXXXX (14 caractères)"
                          className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">Le NIU doit contenir exactement 14 caractères</p>
                      </div>
                    )}

                    {/* No NIU checkbox */}
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-[#10151e] border border-white/10 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={noNiu}
                        onChange={(e) => {
                          setNoNiu(e.target.checked);
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, registrationNumber: "" }));
                          }
                        }}
                        className="w-4 h-4 text-[#cea427] bg-[#10151e] border-white/20 rounded focus:ring-[#cea427]"
                      />
                      <div className="flex-1">
                        <span className="text-white text-sm">{t.orderForm.noNiu}</span>
                        <span className="ml-2 text-[#cea427] text-sm font-medium">+3 000 FCFA</span>
                      </div>
                    </label>
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

                {/* Delivery Options */}
                <div className="bg-[#10151e] rounded-xl p-6 border border-white/10">
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    {t.orderForm.deliveryOption} <span className="text-[#cea427]">*</span>
                  </label>

                  <div className="space-y-3">
                    {/* Pickup Options */}
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t.orderForm.pickupTitle}</div>
                    <label className="flex items-start gap-3 p-3 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="pickup_douala"
                        checked={formData.deliveryOption === "pickup_douala"}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryOption: e.target.value, deliveryAddress: "" }))}
                        className="w-4 h-4 mt-1 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#cea427] text-[20px]">store</span>
                          <span className="text-white font-medium">{t.orderForm.pickupDouala}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ml-7">{t.orderForm.addressDouala}</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="pickup_yaounde"
                        checked={formData.deliveryOption === "pickup_yaounde"}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryOption: e.target.value, deliveryAddress: "" }))}
                        className="w-4 h-4 mt-1 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#cea427] text-[20px]">store</span>
                          <span className="text-white font-medium">{t.orderForm.pickupYaounde}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ml-7">{t.orderForm.addressYaounde}</p>
                      </div>
                    </label>

                    {/* Delivery Options */}
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-4">{t.orderForm.deliveryTitle}</div>
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="delivery_douala"
                        checked={formData.deliveryOption === "delivery_douala"}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryOption: e.target.value }))}
                        className="w-4 h-4 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="material-symbols-outlined text-[#cea427] text-[20px]">local_shipping</span>
                        <span className="text-white">{t.orderForm.deliveryDouala}</span>
                        <span className="ml-auto text-[#cea427] text-sm font-medium">+1 500 FCFA</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="delivery_yaounde"
                        checked={formData.deliveryOption === "delivery_yaounde"}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryOption: e.target.value }))}
                        className="w-4 h-4 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="material-symbols-outlined text-[#cea427] text-[20px]">local_shipping</span>
                        <span className="text-white">{t.orderForm.deliveryYaounde}</span>
                        <span className="ml-auto text-[#cea427] text-sm font-medium">+1 500 FCFA</span>
                      </div>
                    </label>

                    {/* Shipping Option */}
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-4">{t.orderForm.shippingTitle}</div>
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="shipping"
                        checked={formData.deliveryOption === "shipping"}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryOption: e.target.value, shippingCity: "" }))}
                        className="w-4 h-4 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#cea427] text-[20px]">flight</span>
                          <span className="text-white">{t.orderForm.shipping}</span>
                        </div>
                        <p className="text-xs text-orange-400 mt-1 ml-7 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          {language === "fr" ? "Paiement en ligne obligatoire" : "Online payment required"}
                        </p>
                      </div>
                      <span className="text-[#cea427] text-sm font-medium">+2 000 - 3 000 FCFA</span>
                    </label>

                    {/* City Selection for Shipping */}
                    {formData.deliveryOption === "shipping" && (
                      <div className="mt-4 ml-7 p-4 bg-[#1B2233] rounded-lg border border-white/10">
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          {language === "fr" ? "Ville de destination" : "Destination city"} <span className="text-[#cea427]">*</span>
                        </label>
                        <select
                          name="shippingCity"
                          value={formData.shippingCity}
                          onChange={(e) => setFormData(prev => ({ ...prev, shippingCity: e.target.value }))}
                          required
                          className="w-full bg-[#10151e] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                        >
                          <option value="">{language === "fr" ? "Sélectionnez une ville" : "Select a city"}</option>
                          <optgroup label={language === "fr" ? "Zone 1 - 2 000 FCFA" : "Zone 1 - 2,000 FCFA"}>
                            {shippingCities.zone1.cities.map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </optgroup>
                          <optgroup label={language === "fr" ? "Zone 2 - 3 000 FCFA" : "Zone 2 - 3,000 FCFA"}>
                            {shippingCities.zone2.cities.map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </optgroup>
                          <optgroup label={language === "fr" ? "Autres villes - 3 000 FCFA" : "Other cities - 3,000 FCFA"}>
                            <option value="AUTRE">{language === "fr" ? "Autre ville (préciser)" : "Other city (specify)"}</option>
                          </optgroup>
                        </select>
                        {formData.shippingCity && (
                          <p className="mt-2 text-sm text-[#cea427] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                            {language === "fr" ? "Frais d'expédition" : "Shipping fee"}: {getDeliveryFee().toLocaleString()} FCFA
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delivery Address (shown when delivery or shipping is selected) */}
                  {(formData.deliveryOption === "delivery_douala" ||
                    formData.deliveryOption === "delivery_yaounde" ||
                    (formData.deliveryOption === "shipping" && formData.shippingCity)) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {formData.deliveryOption === "shipping"
                          ? (language === "fr" ? "Adresse de livraison complète" : "Full delivery address")
                          : t.orderForm.deliveryAddress
                        } <span className="text-[#cea427]">*</span>
                      </label>
                      <input
                        type="text"
                        name="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={handleInputChange}
                        required
                        placeholder={formData.shippingCity === "AUTRE"
                          ? (language === "fr" ? "Ex: GAROUA, QUARTIER YELWA, RUE..." : "Ex: GAROUA, YELWA DISTRICT, STREET...")
                          : t.orderForm.deliveryAddressPlaceholder
                        }
                        className="w-full bg-[#1B2233] border border-white/10 rounded-lg px-4 py-3 text-white uppercase placeholder:text-gray-500 focus:ring-2 focus:ring-[#cea427] focus:border-transparent transition-all"
                      />
                      {formData.shippingCity === "AUTRE" && (
                        <p className="mt-2 text-xs text-gray-400">
                          {language === "fr"
                            ? "Veuillez inclure le nom de la ville dans l'adresse"
                            : "Please include the city name in the address"
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Required Fields Notice */}
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="text-[#cea427]">*</span> {t.orderForm.required}
                </p>

                {/* Error Message */}
                {submitStatus === "error" && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
                      <div className="flex-1">
                        <p className="text-red-500 font-medium">{t.orderForm.errorTitle}</p>
                        <p className="text-sm text-red-400 mt-1">{errorMessage || t.orderForm.errorMessage}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitStatus("idle");
                          setErrorMessage("");
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                {formData.cardType && (
                  <div className="bg-[#10151e] rounded-xl p-5 border border-[#cea427]/30">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#cea427]">receipt_long</span>
                      {t.orderForm.priceSummary}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-300">
                        <span>{t.orderForm.cardPrice}</span>
                        <span>{getCardPrice().toLocaleString()} FCFA</span>
                      </div>
                      {getDeliveryFee() > 0 && (
                        <div className="flex justify-between text-gray-300">
                          <span>{t.orderForm.deliveryFee}</span>
                          <span>{getDeliveryFee().toLocaleString()} FCFA</span>
                        </div>
                      )}
                      {getNiuFee() > 0 && (
                        <div className="flex justify-between text-gray-300">
                          <span>{t.orderForm.niuService}</span>
                          <span>{getNiuFee().toLocaleString()} FCFA</span>
                        </div>
                      )}
                      <div className="border-t border-white/10 pt-3 mt-3">
                        <div className="flex justify-between text-white font-bold text-lg">
                          <span>{t.orderForm.total}</span>
                          <span className="text-[#cea427]">{getTotal().toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method Selection */}
                {formData.cardType && (
                  <div className="bg-[#10151e] rounded-xl p-5 border border-white/10">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#cea427]">payments</span>
                      {language === "fr" ? "Mode de paiement" : "Payment method"}
                    </h4>

                    {/* Notice for shipping - online payment required */}
                    {isShippingSelected && (
                      <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-2">
                        <span className="material-symbols-outlined text-orange-500 text-[20px]">info</span>
                        <div>
                          <p className="text-sm text-orange-400 font-medium">
                            {language === "fr" ? "Paiement en ligne obligatoire" : "Online payment required"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {language === "fr"
                              ? "Pour les expéditions hors Douala/Yaoundé, le paiement doit être effectué en ligne avant l'envoi."
                              : "For shipments outside Douala/Yaoundé, payment must be made online before shipping."
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Pay Later Option - disabled for shipping */}
                      {!isShippingSelected && (
                        <label className="flex items-center gap-3 p-4 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="pay_later"
                            checked={paymentMethod === "pay_later"}
                            onChange={() => setPaymentMethod("pay_later")}
                            className="w-4 h-4 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-gray-400 text-[20px]">schedule</span>
                              <span className="text-white font-medium">
                                {language === "fr" ? "Payer plus tard" : "Pay later"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 ml-7">
                              {language === "fr"
                                ? "Notre équipe vous contactera pour organiser le paiement"
                                : "Our team will contact you to arrange payment"
                              }
                            </p>
                          </div>
                        </label>
                      )}

                      {/* Mobile Money Option */}
                      <label className={`flex items-center gap-3 p-4 rounded-lg bg-[#1B2233] border cursor-pointer transition-colors ${
                        (isShippingSelected && (paymentMethod === "pay_later" || paymentMethod === "mobile_money"))
                          ? "border-orange-500/50 bg-orange-500/5"
                          : "border-white/5 hover:border-[#cea427]/30"
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="mobile_money"
                          checked={paymentMethod === "mobile_money" || (isShippingSelected && paymentMethod === "pay_later")}
                          onChange={() => setPaymentMethod("mobile_money")}
                          className="w-4 h-4 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500 text-[20px]">smartphone</span>
                            <span className="text-white font-medium">Mobile Money</span>
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                              {language === "fr" ? "Instantané" : "Instant"}
                            </span>
                            {isShippingSelected && (
                              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                                {language === "fr" ? "Recommandé" : "Recommended"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 ml-7">
                            MTN Mobile Money, Orange Money
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-5 bg-yellow-500 rounded flex items-center justify-center text-[8px] font-bold text-black">MTN</div>
                          <div className="w-8 h-5 bg-orange-500 rounded flex items-center justify-center text-[8px] font-bold text-white">OM</div>
                        </div>
                      </label>

                      {/* E-nkap Option (Card/Multi-channel) */}
                      <label className="flex items-center gap-3 p-4 rounded-lg bg-[#1B2233] border border-white/5 hover:border-[#cea427]/30 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="enkap"
                          checked={paymentMethod === "enkap"}
                          onChange={() => setPaymentMethod("enkap")}
                          className="w-4 h-4 text-[#cea427] bg-[#10151e] border-white/20 focus:ring-[#cea427]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500 text-[20px]">credit_card</span>
                            <span className="text-white font-medium">
                              {language === "fr" ? "Carte bancaire / E-nkap" : "Bank card / E-nkap"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 ml-7">
                            Visa, Mastercard, {language === "fr" ? "et autres moyens" : "and other methods"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center text-[8px] font-bold text-white">VISA</div>
                          <div className="w-8 h-5 bg-red-500 rounded flex items-center justify-center text-[8px] font-bold text-white">MC</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                    effectivePaymentMethod === "pay_later"
                      ? "bg-[#cea427] hover:bg-[#b38d1f] text-[#10151e] shadow-[#cea427]/20"
                      : effectivePaymentMethod === "mobile_money"
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-orange-500/20"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/20"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      {effectivePaymentMethod === "pay_later"
                        ? t.orderForm.submitting
                        : language === "fr" ? "Traitement en cours..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">
                        {effectivePaymentMethod === "pay_later" ? "send" : effectivePaymentMethod === "mobile_money" ? "smartphone" : "credit_card"}
                      </span>
                      {effectivePaymentMethod === "pay_later"
                        ? t.orderForm.submit
                        : effectivePaymentMethod === "mobile_money"
                        ? (language === "fr" ? "Payer par Mobile Money" : "Pay with Mobile Money")
                        : (language === "fr" ? "Payer par carte" : "Pay by card")}
                    </>
                  )}
                </button>

                {/* Note based on payment method */}
                <p className="text-center text-sm text-gray-400">
                  {effectivePaymentMethod === "pay_later" ? (
                    <>
                      <span className="material-symbols-outlined text-green-500 text-[16px] align-middle mr-1">verified</span>
                      {language === "fr"
                        ? "Votre demande sera envoyée automatiquement à notre équipe"
                        : "Your request will be automatically sent to our team"
                      }
                    </>
                  ) : effectivePaymentMethod === "mobile_money" ? (
                    <>
                      <span className="material-symbols-outlined text-orange-500 text-[16px] align-middle mr-1">lock</span>
                      {language === "fr"
                        ? "Paiement sécurisé via MTN MoMo ou Orange Money"
                        : "Secure payment via MTN MoMo or Orange Money"
                      }
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-blue-500 text-[16px] align-middle mr-1">lock</span>
                      {language === "fr"
                        ? "Vous serez redirigé vers une page de paiement sécurisée"
                        : "You will be redirected to a secure payment page"
                      }
                    </>
                  )}
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
                <li><a className="hover:text-[#cea427] transition-colors" href="#pricing">{t.footer.productLinks[0]}</a></li>
                <li><a className="hover:text-[#cea427] transition-colors" href="#pricing">{t.footer.productLinks[1]}</a></li>
                <li><a className="hover:text-[#cea427] transition-colors" href="#pricing">{t.footer.productLinks[2]}</a></li>
                <li><a className="hover:text-[#cea427] transition-colors" href="#resellers">{t.footer.productLinks[3]}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">{t.footer.support}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a className="hover:text-[#cea427] transition-colors" href="#faq">{t.footer.supportLinks[0]}</a></li>
                <li><a className="hover:text-[#cea427] transition-colors" href="#faq">{t.footer.supportLinks[1]}</a></li>
                <li><a className="hover:text-[#cea427] transition-colors" href="#pricing">{t.footer.supportLinks[2]}</a></li>
                <li>
                  <a
                    className="hover:text-[#cea427] transition-colors"
                    href="https://wa.me/237673209375?text=Bonjour%2C%20j'ai%20une%20question."
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.footer.supportLinks[3]}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">{t.footer.legal}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><span className="text-gray-500 cursor-default">{t.footer.legalLinks[0]}</span></li>
                <li><span className="text-gray-500 cursor-default">{t.footer.legalLinks[1]}</span></li>
                <li><span className="text-gray-500 cursor-default">{t.footer.legalLinks[2]}</span></li>
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
      delivery: "Disponible sous 24h",
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
        { name: "Segment 2", limit: "4 000 000 FCFA", price: "15 000", oldPrice: "17 500" },
        { name: "Segment 3", limit: "10 000 000 FCFA", price: "25 000", oldPrice: "30 000" },
      ],
      ubaFeatures: [
        "Utilisable à l'internationale",
        "Achats en ligne",
        "Disponible immédiatement",
        "Sécurité renforcée",
        "Validité 2 ans",
      ],
      ubaFees: {
        title: "Frais d'utilisation",
        monthly: "Frais mensuels: 84 FCFA",
        atm: "Retrait DAB local: 400 FCFA",
        pinReset: "Reset PIN: 1 000 - 5 000 FCFA",
      },
    },
    documents: {
      title: "Documents Requis",
      subtitle: "Pour obtenir votre carte prépayée, veuillez fournir les documents suivants:",
      processingTime: "Traitement le jour même ou sous 24h max",
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
      successMessage: "Votre demande de carte a bien été enregistrée. Nous vous contacterons dans les plus brefs délais.",
      errorTitle: "Erreur",
      errorMessage: "Une erreur est survenue. Veuillez réessayer ou nous contacter directement.",
      deliveryOption: "Mode de réception de votre carte",
      pickupTitle: "Retrait en agence (gratuit)",
      pickupDouala: "Retrait en agence - Douala",
      pickupYaounde: "Retrait en agence - Yaoundé",
      addressDouala: "Immeuble Saker CCC Ndokotti, 2ème étage (plaque LTC Group)",
      addressYaounde: "Mvan, descente entrée complexe BEAC - Immeuble carrelé à droite avec plaque LTC Group au balcon",
      deliveryTitle: "Livraison à domicile (Douala/Yaoundé)",
      deliveryDouala: "Livraison à domicile - Douala",
      deliveryYaounde: "Livraison à domicile - Yaoundé",
      shippingTitle: "Expédition (autres villes)",
      shipping: "Expédition vers une autre ville du Cameroun",
      deliveryAddress: "Adresse de livraison complète",
      deliveryAddressPlaceholder: "Ex: AKWA, RUE DE LA JOIE, IMMEUBLE ROSE...",
      niuExplanation: "Le NIU (Numéro d'Identification Unique) est un identifiant fiscal délivré par l'administration camerounaise. Il est requis pour ouvrir un compte bancaire ou acheter une carte prépayée. Si vous n'en avez pas, nous pouvons vous aider à l'obtenir moyennant 3 000 FCFA.",
      noNiu: "Je n'ai pas de NIU",
      priceSummary: "Récapitulatif",
      cardPrice: "Carte",
      deliveryFee: "Frais de livraison",
      niuService: "Service NIU",
      total: "TOTAL À PAYER",
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
        limit: "4 000 000 FCFA/mois",
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
          answer: "C'est simple ! Remplissez le formulaire de commande sur notre site avec vos informations personnelles et une copie de votre CNI. Votre carte sera prête le jour même ou sous 24h max. Vous pouvez également nous contacter directement via WhatsApp au 673 20 93 75."
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
          answer: "La différence principale est le plafond mensuel de dépenses. Segment 1: jusqu'à 2,5 millions FCFA/mois. Segment 2: jusqu'à 4 millions FCFA/mois. Segment 3: jusqu'à 10 millions FCFA/mois. Choisissez selon vos besoins."
        },
        {
          question: "Combien de temps faut-il pour recevoir ma carte ?",
          answer: "Une fois votre demande validée et le paiement effectué, votre carte est généralement prête le jour même ou sous 24h maximum. La livraison à domicile est disponible à Yaoundé et Douala."
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
      delivery: "Available within 24h",
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
        { name: "Segment 2", limit: "4,000,000 FCFA", price: "15,000", oldPrice: "17,500" },
        { name: "Segment 3", limit: "10,000,000 FCFA", price: "25,000", oldPrice: "30,000" },
      ],
      ubaFeatures: [
        "International use",
        "Online shopping",
        "Immediately available",
        "Enhanced security",
        "2 years validity",
      ],
      ubaFees: {
        title: "Usage fees",
        monthly: "Monthly fee: 84 FCFA",
        atm: "Local ATM withdrawal: 400 FCFA",
        pinReset: "PIN reset: 1,000 - 5,000 FCFA",
      },
    },
    documents: {
      title: "Required Documents",
      subtitle: "To obtain your prepaid card, please provide the following documents:",
      processingTime: "Same day or within 24h max processing",
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
      successMessage: "Your card request has been registered. We will contact you as soon as possible.",
      errorTitle: "Error",
      errorMessage: "An error occurred. Please try again or contact us directly.",
      deliveryOption: "How would you like to receive your card?",
      pickupTitle: "Agency pickup (free)",
      pickupDouala: "Pickup at agency - Douala",
      pickupYaounde: "Pickup at agency - Yaoundé",
      addressDouala: "Saker CCC Building Ndokotti, 2nd floor (LTC Group sign)",
      addressYaounde: "Mvan, BEAC complex entrance descent - Tiled building on the right with LTC Group sign on balcony",
      deliveryTitle: "Home delivery (Douala/Yaoundé)",
      deliveryDouala: "Home delivery - Douala",
      deliveryYaounde: "Home delivery - Yaoundé",
      shippingTitle: "Shipping (other cities)",
      shipping: "Ship to another city in Cameroon",
      deliveryAddress: "Full delivery address",
      deliveryAddressPlaceholder: "Ex: AKWA, JOY STREET, PINK BUILDING...",
      niuExplanation: "The NIU (Unique Identification Number) is a tax identifier issued by the Cameroonian administration. It is required to open a bank account or purchase a prepaid card. If you don't have one, we can help you get it for 3,000 FCFA.",
      noNiu: "I don't have a NIU",
      priceSummary: "Summary",
      cardPrice: "Card",
      deliveryFee: "Delivery fee",
      niuService: "NIU Service",
      total: "TOTAL TO PAY",
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
        limit: "4,000,000 FCFA/month",
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
          answer: "It's simple! Fill out the order form on our website with your personal information and a copy of your ID. Your card will be ready the same day or within 24 hours max. You can also contact us directly via WhatsApp at 673 20 93 75."
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
          answer: "The main difference is the monthly spending limit. Segment 1: up to 2.5 million FCFA/month. Segment 2: up to 4 million FCFA/month. Segment 3: up to 10 million FCFA/month. Choose according to your needs."
        },
        {
          question: "How long does it take to receive my card?",
          answer: "Once your request is validated and payment is made, your card is usually ready the same day or within 24 hours max. Home delivery is available in Yaoundé and Douala."
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
