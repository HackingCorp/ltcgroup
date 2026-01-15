import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "LTC GROUP SARL - Connecting Africa to the World",
  description: "LTC GROUP SARL est un groupe multisectoriel basé au Cameroun, actif dans le e-commerce, la logistique internationale, le BTP, les services digitaux et financiers. Un groupe, plusieurs solutions pour connecter l'Afrique au monde.",
  keywords: ["LTC Group", "Cameroun", "Logistique", "BTP", "E-commerce", "Afrique", "Import Export", "Construction", "Services digitaux"],
  authors: [{ name: "LTC GROUP SARL" }],
  openGraph: {
    title: "LTC GROUP SARL - Connecting Africa to the World",
    description: "Groupe multisectoriel structuré, orienté innovation, commerce international et solutions digitales",
    url: "https://ltcgroup.site",
    siteName: "LTC GROUP",
    locale: "fr_CM",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${publicSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
