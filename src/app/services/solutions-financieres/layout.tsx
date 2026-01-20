import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cartes Bancaires Prépayées Visa & Mastercard",
  description:
    "Obtenez votre carte bancaire prépayée Visa ou Mastercard au Cameroun. Paiements en ligne, abonnements Netflix, Spotify, achats internationaux. Livraison sous 24h.",
  keywords: [
    "carte prépayée Cameroun",
    "carte Visa Cameroun",
    "carte Mastercard Cameroun",
    "paiement en ligne Afrique",
    "carte bancaire sans compte",
    "LTC Finance",
    "UBA Visa",
    "Access Bank Mastercard",
  ],
  openGraph: {
    title: "Cartes Bancaires Prépayées Visa & Mastercard | LTC Finance",
    description:
      "Obtenez votre carte bancaire prépayée au Cameroun. Paiements internationaux, abonnements, achats en ligne. Livraison sous 24h.",
    url: "https://ltcgroup.site/services/solutions-financieres",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "LTC Finance - Cartes Prépayées",
      },
    ],
  },
  alternates: {
    canonical: "/services/solutions-financieres",
  },
};

export default function SolutionsFinancieresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
