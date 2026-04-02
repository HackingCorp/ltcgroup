"use client";

import { Card, CardContent } from "@/components/ui";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your dashboard preferences</p>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Settings className="mb-3 h-10 w-10 text-gray-300" />
            <p>Settings coming soon</p>
            <p className="text-xs mt-1">Configuration options will be available here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
