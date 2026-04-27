import api from "@/lib/api";
import type { MerchantDashboardStats, BalanceInfo, Payment, PaginatedResponse } from "@/types";

export const merchantDashboardService = {
  async getStats(): Promise<MerchantDashboardStats> {
    const response = await api.get<MerchantDashboardStats>("/merchant-dashboard/stats");
    return response.data;
  },

  async getPayments(params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Payment>> {
    const response = await api.get<PaginatedResponse<Payment>>("/merchant-dashboard/payments", {
      params,
    });
    return response.data;
  },

  async getPayment(reference: string): Promise<Payment> {
    const response = await api.get<Payment>(`/merchant-dashboard/payments/${reference}`);
    return response.data;
  },

  async getBalance(): Promise<BalanceInfo> {
    const response = await api.get<BalanceInfo>("/merchant-dashboard/balance");
    return response.data;
  },
};
