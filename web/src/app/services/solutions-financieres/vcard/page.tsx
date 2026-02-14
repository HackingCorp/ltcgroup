"use client";

import Link from "next/link";
import CardPreview from "@/components/vcard/CardPreview";

export default function VCardPresentationPage() {
  const features = [
    {
      icon: "globe",
      title: "Paiements internationaux",
      description: "Achetez sur Amazon, Netflix, Spotify et tous les sites web",
    },
    {
      icon: "security",
      title: "100% sécurisé",
      description: "Technologie de cryptage bancaire et protection anti-fraude",
    },
    {
      icon: "flash_on",
      title: "Activation instantanée",
      description: "Votre carte est prête à l'emploi dès validation du paiement",
    },
    {
      icon: "phone_android",
      title: "Gestion mobile",
      description: "Suivez vos transactions et rechargez depuis votre téléphone",
    },
    {
      icon: "shield_lock",
      title: "Contrôle total",
      description: "Bloquez ou débloquez votre carte à tout moment",
    },
    {
      icon: "savings",
      title: "Sans frais cachés",
      description: "Tarification transparente, pas de frais de maintenance",
    },
  ];

  const cardTypes = [
    {
      type: "visa_segment1" as const,
      name: "Visa Segment 1",
      price: 5000,
      dailyLimit: 100000,
      monthlyLimit: 500000,
      ideal: "Abonnements et achats courants",
    },
    {
      type: "visa_segment2" as const,
      name: "Visa Segment 2",
      price: 10000,
      dailyLimit: 300000,
      monthlyLimit: 1500000,
      ideal: "Shopping et services en ligne",
    },
    {
      type: "visa_segment3" as const,
      name: "Visa Segment 3",
      price: 20000,
      dailyLimit: 1000000,
      monthlyLimit: 5000000,
      ideal: "Professionnels et gros achats",
    },
    {
      type: "mastercard" as const,
      name: "Mastercard Standard",
      price: 15000,
      dailyLimit: 500000,
      monthlyLimit: 2500000,
      ideal: "Polyvalence internationale",
    },
  ];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  return (
    <div className="w-full">
      {/* Hero section */}
      <section className="relative bg-gradient-to-br from-[#10151e] to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

        <div className="relative px-6 lg:px-20 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md mb-6">
                <span className="h-2 w-2 rounded-full bg-[#cea427] animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-widest">
                  Nouveau
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
                Cartes Virtuelles
                <br />
                <span className="text-[#cea427]">Visa & Mastercard</span>
              </h1>

              <p className="text-xl text-slate-200 mb-8 leading-relaxed">
                Achetez en ligne partout dans le monde avec votre carte virtuelle
                prépayée. Activation instantanée, rechargeable à volonté.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/services/solutions-financieres/vcard/achat"
                  className="flex items-center justify-center gap-2 h-12 px-8 bg-[#cea427] hover:bg-[#cea427]-dark text-white font-bold rounded-lg transition-all shadow-xl hover:shadow-2xl"
                >
                  <span className="material-symbols-outlined">add_card</span>
                  <span>Obtenir ma carte</span>
                </Link>
                <Link
                  href="#comparaison"
                  className="flex items-center justify-center gap-2 h-12 px-8 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold rounded-lg transition-all backdrop-blur-sm"
                >
                  <span>Comparer les offres</span>
                </Link>
              </div>
            </div>

            {/* Right - Card preview */}
            <div className="flex justify-center lg:justify-end">
              <CardPreview
                cardType="visa_segment2"
                holderName="VOTRE NOM"
                last4="1234"
                expiryDate="12/28"
                showCVV={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 lg:px-20 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Pourquoi choisir nos cartes virtuelles ?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Une solution moderne, sécurisée et accessible pour vos paiements en
            ligne
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-[#cea427]/10 rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#cea427] text-2xl">
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Card comparison */}
      <section id="comparaison" className="px-6 lg:px-20 py-16 bg-slate-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Choisissez la carte adaptée à vos besoins
          </h2>
          <p className="text-lg text-slate-600">
            Toutes nos cartes sont rechargeables et utilisables immédiatement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cardTypes.map((card) => (
            <div
              key={card.type}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 hover:shadow-xl transition-all"
            >
              {/* Card preview */}
              <div className="p-6 bg-gradient-to-br from-slate-50 to-white">
                <CardPreview
                  cardType={card.type}
                  holderName="VOTRE NOM"
                  last4="****"
                  expiryDate="MM/YY"
                />
              </div>

              {/* Card details */}
              <div className="p-6 border-t border-slate-200">
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  {card.name}
                </h3>
                <p className="text-3xl font-black text-[#cea427] mb-4">
                  {formatAmount(card.price)} FCFA
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="material-symbols-outlined text-green-600 text-base">
                      check_circle
                    </span>
                    <span className="text-slate-600">
                      Limite journalière: {formatAmount(card.dailyLimit)} FCFA
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="material-symbols-outlined text-green-600 text-base">
                      check_circle
                    </span>
                    <span className="text-slate-600">
                      Limite mensuelle: {formatAmount(card.monthlyLimit)} FCFA
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="material-symbols-outlined text-green-600 text-base">
                      check_circle
                    </span>
                    <span className="text-slate-600">
                      Idéal pour: {card.ideal}
                    </span>
                  </div>
                </div>

                <Link
                  href="/services/solutions-financieres/vcard/achat"
                  className="flex items-center justify-center w-full h-10 bg-[#cea427] hover:bg-[#cea427]-dark text-white font-bold rounded-lg transition-all"
                >
                  Choisir cette carte
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 lg:px-20 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-8 text-center">
            Questions fréquentes
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Comment obtenir ma carte virtuelle ?",
                a: "Choisissez votre type de carte, remplissez le formulaire et payez en ligne. Votre carte est activée immédiatement après confirmation du paiement.",
              },
              {
                q: "Où puis-je utiliser ma carte ?",
                a: "Votre carte fonctionne sur tous les sites e-commerce acceptant Visa ou Mastercard : Amazon, Netflix, Spotify, etc.",
              },
              {
                q: "Comment recharger ma carte ?",
                a: "Connectez-vous à votre dashboard et cliquez sur 'Recharger'. Payez par Mobile Money ou E-nkap, le montant est crédité instantanément.",
              },
              {
                q: "Y a-t-il des frais cachés ?",
                a: "Non. Vous payez uniquement le prix de la carte à l'achat. Les recharges ont des frais de 1.5%, affichés clairement avant paiement.",
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden group"
              >
                <summary className="p-5 cursor-pointer font-bold text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <div className="px-5 pb-5 text-slate-600 border-t border-slate-100">
                  <p className="pt-4">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-20 py-16 bg-gradient-to-br from-[#10151e] to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-6">
            Prêt à commencer vos achats en ligne ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Obtenez votre carte virtuelle en moins de 5 minutes
          </p>
          <Link
            href="/services/solutions-financieres/vcard/achat"
            className="inline-flex items-center justify-center gap-2 h-14 px-10 bg-white text-[#cea427] font-black rounded-lg hover:bg-slate-100 transition-all shadow-xl text-lg"
          >
            <span className="material-symbols-outlined">add_card</span>
            <span>Commander ma carte maintenant</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
