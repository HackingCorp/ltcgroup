import api from "@/lib/api";
import type { Withdrawal, WithdrawalCreate, WithdrawalListResponse } from "@/types";

export const withdrawalsService = {
  // Merchant endpoints
  async create(data: WithdrawalCreate): Promise<Withdrawal> {
    const response = await api.post<Withdrawal>("/merchant-dashboard/withdrawals", data);
    return response.data;
  },

  async list(params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<WithdrawalListResponse> {
    const response = await api.get<WithdrawalListResponse>("/merchant-dashboard/withdrawals", {
      params,
    });
    return response.data;
  },

  async get(id: string): Promise<Withdrawal> {
    const response = await api.get<Withdrawal>(`/merchant-dashboard/withdrawals/${id}`);
    return response.data;
  },

  // Admin endpoints
  async listAll(params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<WithdrawalListResponse> {
    const response = await api.get<WithdrawalListResponse>("/withdrawals", { params });
    return response.data;
  },

  async getAdmin(id: string): Promise<Withdrawal> {
    const response = await api.get<Withdrawal>(`/withdrawals/${id}`);
    return response.data;
  },

  async approve(id: string, adminNote?: string): Promise<Withdrawal> {
    const response = await api.patch<Withdrawal>(`/withdrawals/${id}/approve`, {
      admin_note: adminNote,
    });
    return response.data;
  },

  async reject(id: string, adminNote?: string): Promise<Withdrawal> {
    const response = await api.patch<Withdrawal>(`/withdrawals/${id}/reject`, {
      admin_note: adminNote,
    });
    return response.data;
  },

  async complete(id: string, adminNote?: string): Promise<Withdrawal> {
    const response = await api.patch<Withdrawal>(`/withdrawals/${id}/complete`, {
      admin_note: adminNote,
    });
    return response.data;
  },
};
