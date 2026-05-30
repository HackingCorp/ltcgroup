import { LangProvider } from "@/lib/i18n";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <LangProvider>{children}</LangProvider>;
}
