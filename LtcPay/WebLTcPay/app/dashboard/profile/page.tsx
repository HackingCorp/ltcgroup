"use client";

import { Card, CardContent } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Your account information</p>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-500 text-white text-xl font-medium">
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user?.full_name || "User"}</h2>
              <p className="text-sm text-gray-500">{user?.email || ""}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-100 pb-3">
              <span className="text-sm text-gray-500">Full Name</span>
              <span className="text-sm font-medium text-gray-900">{user?.full_name || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-3">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-900">{user?.email || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-3">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{user?.role || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user?.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {user?.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
