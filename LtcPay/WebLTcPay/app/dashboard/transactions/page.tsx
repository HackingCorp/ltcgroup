"use client";

import { Card, CardContent } from "@/components/ui";
import { ArrowLeftRight } from "lucide-react";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500">View transaction history and details</p>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <ArrowLeftRight className="mb-3 h-10 w-10 text-gray-300" />
            <p>No transactions yet</p>
            <p className="text-xs mt-1">Transactions will appear here once payments are processed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
