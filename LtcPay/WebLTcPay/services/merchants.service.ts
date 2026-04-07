import api from "@/lib/api";
import type { Merchant, MerchantCredentials, MerchantListResponse } from "@/types";

export interface CreateMerchantData {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  callback_url?: string;
  business_type?: string;
  description?: string;
  logo_url?: string;
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
};
