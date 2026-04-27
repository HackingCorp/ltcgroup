"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Key,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/merchant/dashboard", icon: LayoutDashboard },
  { name: "Payments", href: "/merchant/dashboard/payments", icon: CreditCard },
  { name: "Withdrawals", href: "/merchant/dashboard/withdrawals", icon: Wallet },
  { name: "API Keys", href: "/merchant/dashboard/api-keys", icon: Key },
  { name: "Profile", href: "/merchant/dashboard/profile", icon: User },
] as const;

export function MerchantSidebar() {
  const pathname = usePathname();
  const { logout, merchantUser } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400">
          <span className="text-sm font-bold text-navy-800">LP</span>
        </div>
        <span className="text-lg font-bold text-navy-500">LTCPay</span>
        <span className="ml-auto rounded bg-gold-100 px-1.5 py-0.5 text-xs font-medium text-gold-700">
          Merchant
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/merchant/dashboard"
              ? pathname === "/merchant/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold-50 text-gold-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-500 text-white text-xs font-medium">
            {merchantUser?.name?.charAt(0)?.toUpperCase() || "M"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {merchantUser?.name || "Merchant"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {merchantUser?.email || ""}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
