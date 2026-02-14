"use client";

import { useState } from "react";

interface CardPreviewProps {
  cardType: "visa_segment1" | "visa_segment2" | "visa_segment3" | "mastercard" | "";
  holderName?: string;
  last4?: string;
  expiryDate?: string;
  showCVV?: boolean;
}

const CARD_STYLES = {
  visa_segment1: {
    gradient: "from-blue-600 to-blue-800",
    logo: "VISA",
    segment: "Segment 1",
  },
  visa_segment2: {
    gradient: "from-blue-700 to-blue-900",
    logo: "VISA",
    segment: "Segment 2",
  },
  visa_segment3: {
    gradient: "from-blue-800 to-indigo-900",
    logo: "VISA",
    segment: "Segment 3",
  },
  mastercard: {
    gradient: "from-orange-600 to-red-600",
    logo: "MASTERCARD",
    segment: "",
  },
};

export default function CardPreview({
  cardType,
  holderName = "VOTRE NOM",
  last4 = "****",
  expiryDate = "MM/YY",
  showCVV = false,
}: CardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cardType) {
    return (
      <div className="w-full max-w-[400px] aspect-[1.586/1] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <span className="material-symbols-outlined text-5xl">credit_card</span>
          <p className="mt-2 text-sm font-medium">Sélectionnez un type de carte</p>
        </div>
      </div>
    );
  }

  const cardStyle = CARD_STYLES[cardType];

  return (
    <div
      className="w-full max-w-[400px] aspect-[1.586/1] perspective-1000"
      onMouseEnter={() => showCVV && setIsFlipped(true)}
      onMouseLeave={() => showCVV && setIsFlipped(false)}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front of card */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cardStyle.gradient} p-6 shadow-2xl backface-hidden`}
        >
          <div className="flex flex-col h-full justify-between text-white">
            {/* Card header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">contactless</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-black tracking-wider">{cardStyle.logo}</p>
                {cardStyle.segment && (
                  <p className="text-xs opacity-80">{cardStyle.segment}</p>
                )}
              </div>
            </div>

            {/* Card number */}
            <div className="flex items-center gap-3 text-2xl font-mono tracking-wider">
              <span>••••</span>
              <span>••••</span>
              <span>••••</span>
              <span className="font-bold">{last4}</span>
            </div>

            {/* Card footer */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs opacity-70 mb-1">Titulaire</p>
                <p className="text-sm font-bold tracking-wide uppercase">
                  {holderName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70 mb-1">Expire</p>
                <p className="text-sm font-bold">{expiryDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        {showCVV && (
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cardStyle.gradient} shadow-2xl backface-hidden rotate-y-180`}
          >
            <div className="h-full flex flex-col">
              <div className="bg-black h-12 mt-6"></div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="bg-white rounded h-10 flex items-center justify-end px-4">
                  <span className="text-black font-mono font-bold">123</span>
                </div>
                <div className="text-white text-xs opacity-70">
                  <p>Carte virtuelle prépayée</p>
                  <p>LTC Finance</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
