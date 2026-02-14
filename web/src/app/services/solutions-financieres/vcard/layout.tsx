"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { isAuthenticated, usersAPI, type UserResponse } from "@/lib/vcard-api";

export default function VCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated()) {
        try {
          const user = await usersAPI.getMe();
          setCurrentUser(user);
        } catch (error) {
          console.error("Failed to load user:", error);
        }
      }
    };
    loadUser();
  }, []);

  const navItems = [
    {
      href: "/services/solutions-financieres/vcard",
      label: "Présentation",
      icon: "home",
    },
    {
      href: "/services/solutions-financieres/vcard/dashboard",
      label: "Dashboard",
      icon: "dashboard",
      authRequired: true,
    },
    {
      href: "/services/solutions-financieres/vcard/achat",
      label: "Acheter",
      icon: "add_card",
      authRequired: true,
    },
    {
      href: "/services/solutions-financieres/vcard/recharge",
      label: "Recharger",
      icon: "add_circle",
      authRequired: true,
    },
    {
      href: "/services/solutions-financieres/vcard/retrait",
      label: "Retrait",
      icon: "account_balance",
      authRequired: true,
    },
    {
      href: "/services/solutions-financieres/vcard/kyc",
      label: "KYC",
      icon: "verified_user",
      authRequired: true,
    },
    {
      href: "/services/solutions-financieres/vcard/profile",
      label: "Profil",
      icon: "person",
      authRequired: true,
    },
  ];

  // Add admin link if user is admin
  if (currentUser?.is_admin) {
    navItems.push({
      href: "/services/solutions-financieres/vcard/admin",
      label: "Admin",
      icon: "admin_panel_settings",
      authRequired: true,
    });
  }

  const isAuth = isAuthenticated();
  const visibleNavItems = navItems.filter(
    (item) => !item.authRequired || isAuth
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="px-6 lg:px-20 py-4">
          <nav className="flex items-center gap-2 text-sm text-slate-600">
            <Link href="/" className="hover:text-[#cea427] transition-colors">
              Accueil
            </Link>
            <span className="material-symbols-outlined text-base">
              chevron_right
            </span>
            <Link
              href="/services/solutions-financieres"
              className="hover:text-[#cea427] transition-colors"
            >
              Solutions Financières
            </Link>
            <span className="material-symbols-outlined text-base">
              chevron_right
            </span>
            <span className="font-medium text-slate-900">Cartes Virtuelles</span>
          </nav>
        </div>
      </div>

      {/* Secondary navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-40">
        <div className="px-6 lg:px-20">
          <nav className="flex gap-1 overflow-x-auto">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap font-bold text-sm transition-colors ${
                    isActive
                      ? "border-[#cea427] text-[#cea427]"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 bg-background-light">{children}</main>

      <Footer />
    </div>
  );
}
