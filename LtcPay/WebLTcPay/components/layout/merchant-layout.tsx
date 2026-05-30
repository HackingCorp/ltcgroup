"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "./merchant-sidebar";
import { Header } from "./header";
import { PageLoading } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { LangProvider } from "@/lib/i18n";

export function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/merchant/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <LangProvider>
      <div className="app">
        <Header context="merchant" />
        <div className="workspace">
          <MerchantSidebar />
          <div className="main-content">{children}</div>
        </div>
      </div>
    </LangProvider>
  );
}
