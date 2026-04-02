import api from "@/lib/api";
import type { Payment, PaginatedResponse } from "@/types";

export interface CreatePaymentData {
  amount: number;
  currency: string;
  description?: string;
  customer_email?: string;
  customer_phone?: string;
  callback_url?: string;
  redirect_url?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentFilters {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export const paymentsService = {
  async create(data: CreatePaymentData): Promise<Payment> {
    const response = await api.post<Payment>("/payments", data);
    return response.data;
  },

  async list(filters: PaymentFilters = {}): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);

    const response = await api.get<PaginatedResponse<Payment>>(
      `/payments?${params.toString()}`
    );
    return response.data;
  },

  async get(id: string): Promise<Payment> {
    const response = await api.get<Payment>(`/payments/${id}`);
    return response.data;
  },

  async cancel(id: string): Promise<Payment> {
    const response = await api.post<Payment>(`/payments/${id}/cancel`);
    return response.data;
  },
};
