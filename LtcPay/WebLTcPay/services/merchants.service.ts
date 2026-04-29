import api from "@/lib/api";
import type { Merchant, MerchantCredentials, MerchantListResponse, BalanceInfo } from "@/types";

export interface MerchantBalanceInfo extends BalanceInfo {
  total_payments: number;
  completed_payments: number;
  touchpay_fees: number;
  ltcpay_margin: number;
}

export interface MerchantPaymentItem {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  description?: string;
  payment_method?: string;
  operator?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantWithdrawalItem {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  currency: string;
  method: string;
  status: string;
  mobile_money_number?: string;
  mobile_money_operator?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  admin_note?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateMerchantData {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  callback_url?: string;
  business_type?: string;
  description?: string;
  logo_url?: string;
  default_payment_mode?: "SDK" | "DIRECT_API";
  fee_rate?: number;
  fee_bearer?: "MERCHANT" | "CLIENT";
}

export interface UpdateMerchantData {
  name?: string;
  phone?: string;
  website?: string;
  callback_url?: string;
  business_type?: string;
  description?: string;
  logo_url?: string;
  is_active?: boolean;
  default_payment_mode?: "SDK" | "DIRECT_API";
  fee_rate?: number;
  fee_bearer?: "MERCHANT" | "CLIENT";
}

export const merchantsService = {
  async list(page = 1, pageSize = 20): Promise<MerchantListResponse> {
    const response = await api.get<MerchantListResponse>(
      `/merchants/?page=${page}&page_size=${pageSize}`
    );
    return response.data;
  },

  async get(id: string): Promise<Merchant> {
    const response = await api.get<Merchant>(`/merchants/${id}`);
    return response.data;
  },

  async create(data: CreateMerchantData): Promise<MerchantCredentials> {
    const response = await api.post<MerchantCredentials>("/merchants/", data);
    return response.data;
  },

  async update(id: string, data: UpdateMerchantData): Promise<Merchant> {
    const response = await api.patch<Merchant>(`/merchants/${id}`, data);
    return response.data;
  },

  async delete(id: string, force = false): Promise<{ detail: string; payments_deleted: number }> {
    const response = await api.delete<{ detail: string; payments_deleted: number }>(
      `/merchants/${id}${force ? "?force=true" : ""}`
    );
    return response.data;
  },

  async regenerateApiSecret(id: string): Promise<MerchantCredentials> {
    const response = await api.post<MerchantCredentials>(
      `/merchants/${id}/regenerate-api-secret`
    );
    return response.data;
  },

  async regenerateWebhookSecret(
    id: string
  ): Promise<{ webhook_secret: string }> {
    const response = await api.post<{ webhook_secret: string }>(
      `/merchants/${id}/regenerate-webhook-secret`
    );
    return response.data;
  },

  async getBalance(id: string): Promise<MerchantBalanceInfo> {
    const response = await api.get<MerchantBalanceInfo>(`/merchants/${id}/balance`);
    return response.data;
  },

  async getAllBalances(): Promise<Record<string, MerchantBalanceInfo>> {
    const response = await api.get<Record<string, MerchantBalanceInfo>>("/merchants/all/balances");
    return response.data;
  },

  async getPayments(
    id: string,
    page = 1,
    perPage = 20,
    status?: string
  ): Promise<PaginatedItems<MerchantPaymentItem>> {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (status) params.set("status", status);
    const response = await api.get<PaginatedItems<MerchantPaymentItem>>(
      `/merchants/${id}/payments?${params}`
    );
    return response.data;
  },

  async getWithdrawals(
    id: string,
    page = 1,
    perPage = 20,
    status?: string
  ): Promise<PaginatedItems<MerchantWithdrawalItem>> {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (status) params.set("status", status);
    const response = await api.get<PaginatedItems<MerchantWithdrawalItem>>(
      `/merchants/${id}/withdrawals?${params}`
    );
    return response.data;
  },
};
