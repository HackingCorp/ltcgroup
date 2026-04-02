"use client";

import { Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-4 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
          <p className="text-xs text-gray-500">{user?.business_name || "Merchant"}</p>
        </div>
      </div>
    </header>
  );
}
