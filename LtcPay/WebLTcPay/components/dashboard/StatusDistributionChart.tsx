"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui";
import type { StatusDistributionItem } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  pending: "#eab308",
  failed: "#ef4444",
  expired: "#6b7280",
  cancelled: "#9ca3af",
  refunded: "#3b82f6",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completes",
  pending: "En attente",
  failed: "Echoues",
  expired: "Expirees",
  cancelled: "Annulees",
  refunded: "Remboursees",
};

function getColor(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] || "#94a3b8";
}

function getLabel(status: string): string {
  return STATUS_LABELS[status.toLowerCase()] || status;
}

interface StatusDistributionChartProps {
  data: StatusDistributionItem[];
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Repartition par statut
          </h3>
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Aucune donnee disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: getLabel(item.status),
    value: item.count,
    status: item.status,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Repartition par statut
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-sm text-gray-700">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
