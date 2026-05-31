"use client";

import dynamic from "next/dynamic";
import { LangProvider } from "@/lib/i18n";

/* Dynamically import nav and footer with SSR disabled to prevent hydration mismatch */
const PublicNav = dynamic(() => import("@/components/public/public-nav").then(m => m.PublicNav), { ssr: false });
const Footer = dynamic(() => import("@/components/public/footer").then(m => m.Footer), { ssr: false });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <PublicNav />
      {children}
      <Footer />
    </LangProvider>
  );
}
