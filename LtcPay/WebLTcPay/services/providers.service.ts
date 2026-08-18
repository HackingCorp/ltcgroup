import api from "@/lib/api";

export interface CountryLink {
  country_code: string;
  priority: number;
  is_active: boolean;
}

export interface Provider {
  code: string;
  name: string;
  provider_group: "MOBILE" | "CARD";
  is_active: boolean;
  config_keys: string[];
  countries: CountryLink[];
}

export interface ProviderUpdateData {
  name?: string;
  is_active?: boolean;
  config?: Record<string, string | null>;
}

export type MerchantProviderPrefs = Record<string, Record<string, string[]>>;

export const providersService = {
  async list(): Promise<Provider[]> {
    const r = await api.get<Provider[]>("/admin/providers");
    return r.data;
  },

  async update(code: string, data: ProviderUpdateData): Promise<Provider> {
    const r = await api.patch<Provider>(`/admin/providers/${code}`, data);
    return r.data;
  },

  async setCountryLink(
    code: string,
    countryCode: string,
    priority: number,
    isActive: boolean,
  ): Promise<CountryLink> {
    const r = await api.put<CountryLink>(
      `/admin/providers/${code}/countries/${countryCode}`,
      { priority, is_active: isActive },
    );
    return r.data;
  },

  async removeCountryLink(code: string, countryCode: string): Promise<void> {
    await api.delete(`/admin/providers/${code}/countries/${countryCode}`);
  },

  async getMerchantPrefs(merchantId: string): Promise<MerchantProviderPrefs> {
    const r = await api.get<{ provider_prefs: MerchantProviderPrefs }>(
      `/admin/merchants/${merchantId}/provider-prefs`,
    );
    return r.data.provider_prefs || {};
  },

  async setMerchantPrefs(
    merchantId: string,
    prefs: MerchantProviderPrefs | null,
  ): Promise<void> {
    await api.put(`/admin/merchants/${merchantId}/provider-prefs`, {
      provider_prefs: prefs,
    });
  },
};
