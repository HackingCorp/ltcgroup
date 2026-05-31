import { LangProvider } from "@/lib/i18n";
import { PublicNav } from "@/components/public/public-nav";
import { Footer } from "@/components/public/footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <PublicNav />
      {children}
      <Footer />
    </LangProvider>
  );
}
