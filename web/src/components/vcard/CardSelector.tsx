"use client";

interface CardOption {
  id: string;
  name: string;
  price: number;
  dailyLimit: number;
  monthlyLimit: number;
  description: string;
  color: string;
}

const CARD_OPTIONS: CardOption[] = [
  {
    id: "visa_segment1",
    name: "Visa Segment 1",
    price: 5000,
    dailyLimit: 100000,
    monthlyLimit: 500000,
    description: "Idéal pour les achats courants et abonnements",
    color: "blue",
  },
  {
    id: "visa_segment2",
    name: "Visa Segment 2",
    price: 10000,
    dailyLimit: 300000,
    monthlyLimit: 1500000,
    description: "Pour vos achats plus importants",
    color: "blue",
  },
  {
    id: "visa_segment3",
    name: "Visa Segment 3",
    price: 20000,
    dailyLimit: 1000000,
    monthlyLimit: 5000000,
    description: "Solution premium sans limites contraignantes",
    color: "indigo",
  },
  {
    id: "mastercard",
    name: "Mastercard Standard",
    price: 15000,
    dailyLimit: 500000,
    monthlyLimit: 2500000,
    description: "Acceptée partout dans le monde",
    color: "orange",
  },
];

interface CardSelectorProps {
  selectedCard: string;
  onSelectCard: (cardId: string) => void;
}

export default function CardSelector({
  selectedCard,
  onSelectCard,
}: CardSelectorProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        Choisissez votre carte virtuelle
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARD_OPTIONS.map((card) => {
          const isSelected = selectedCard === card.id;
          const colorClasses = {
            blue: "border-blue-500 bg-blue-50 ring-blue-500",
            indigo: "border-indigo-500 bg-indigo-50 ring-indigo-500",
            orange: "border-orange-500 bg-orange-50 ring-orange-500",
          };

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCard(card.id)}
              className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `${colorClasses[card.color as keyof typeof colorClasses]} ring-2 ring-offset-2`
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <span className="material-symbols-outlined text-[#cea427]">
                    check_circle
                  </span>
                </div>
              )}

              {/* Card name and price */}
              <div className="mb-3">
                <h4 className="text-base font-black text-slate-900">
                  {card.name}
                </h4>
                <p className="text-2xl font-black text-[#cea427] mt-1">
                  {formatAmount(card.price)} FCFA
                </p>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-3">{card.description}</p>

              {/* Limits */}
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    calendar_today
                  </span>
                  <span>
                    Limite journalière: {formatAmount(card.dailyLimit)} FCFA
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    event_note
                  </span>
                  <span>
                    Limite mensuelle: {formatAmount(card.monthlyLimit)} FCFA
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info message */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-blue-600">info</span>
          <div className="text-sm text-blue-900">
            <p className="font-bold mb-1">Carte virtuelle prépayée</p>
            <p className="text-blue-700">
              Votre carte sera activée immédiatement après paiement. Vous
              recevrez les détails par email et SMS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
