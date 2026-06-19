import api from "@/lib/api";

/* ── Types ────────────────────────────────────────────────── */

export interface CountryOperator {
  id: string;
  country_code: string;
  operator_code: string;
  operator_name: string;
  service_code: string;
  color: string;
  logo_url: string;
  min_amount: number;
  max_amount: number;
  ussd_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  phone_prefix: string;
  phone_digits: number;
  phone_pattern: string;
  flag_emoji: string;
  default_city: string;
  min_amount: number;
  max_amount: number;
  credentials_configured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  operators?: CountryOperator[];
}

export interface CountryCredentials {
  agency_code?: string;
  login?: string;
  password?: string;
  secret?: string;
  merchant_id?: string;
  secure_code?: string;
  merchant_website?: string;
  sdk_url?: string;
  direct_api_url?: string;
}

export interface CreateCountryData {
  code: string;
  name: string;
  currency: string;
  phone_prefix: string;
  phone_digits?: number;
  phone_pattern?: string;
  flag_emoji?: string;
  default_city?: string;
  min_amount?: number;
  max_amount?: number;
  credentials?: CountryCredentials;
  is_active?: boolean;
}

export interface UpdateCountryData {
  name?: string;
  currency?: string;
  phone_prefix?: string;
  phone_digits?: number;
  phone_pattern?: string;
  flag_emoji?: string;
  default_city?: string;
  min_amount?: number;
  max_amount?: number;
  credentials?: CountryCredentials;
  is_active?: boolean;
}

export interface CreateOperatorData {
  operator_code: string;
  operator_name: string;
  service_code: string;
  color?: string;
  logo_url?: string;
  min_amount?: number;
  max_amount?: number;
  ussd_code?: string;
  is_active?: boolean;
}

export interface UpdateOperatorData {
  operator_code?: string;
  operator_name?: string;
  service_code?: string;
  color?: string;
  logo_url?: string;
  min_amount?: number;
  max_amount?: number;
  ussd_code?: string;
  is_active?: boolean;
}

export interface MerchantCountryInfo {
  country_code: string;
  country_name: string;
  is_active: boolean;
}

export interface CountryTestCheck {
  name: string;
  status: "pass" | "fail";
  message: string;
  latency_ms: number | null;
}

export interface CountryTestResult {
  country_code: string;
  overall_status: "pass" | "partial" | "fail";
  checks: CountryTestCheck[];
  tested_at: string;
}

/* ── Service ──────────────────────────────────────────────── */

export const countriesService = {
  /* Countries */
  async list(): Promise<Country[]> {
    const r = await api.get<Country[]>("/admin/countries");
    return r.data;
  },

  async get(code: string): Promise<Country> {
    const r = await api.get<Country>(`/admin/countries/${code}`);
    return r.data;
  },

  async create(data: CreateCountryData): Promise<Country> {
    const r = await api.post<Country>("/admin/countries", data);
    return r.data;
  },

  async update(code: string, data: UpdateCountryData): Promise<Country> {
    const r = await api.patch<Country>(`/admin/countries/${code}`, data);
    return r.data;
  },

  async remove(code: string): Promise<void> {
    await api.delete(`/admin/countries/${code}`);
  },

  /* Operators */
  async listOperators(countryCode: string): Promise<CountryOperator[]> {
    const r = await api.get<CountryOperator[]>(`/admin/countries/${countryCode}/operators`);
    return r.data;
  },

  async createOperator(countryCode: string, data: CreateOperatorData): Promise<CountryOperator> {
    const r = await api.post<CountryOperator>(`/admin/countries/${countryCode}/operators`, data);
    return r.data;
  },

  async updateOperator(countryCode: string, opId: string, data: UpdateOperatorData): Promise<CountryOperator> {
    const r = await api.patch<CountryOperator>(`/admin/countries/${countryCode}/operators/${opId}`, data);
    return r.data;
  },

  async removeOperator(countryCode: string, opId: string): Promise<void> {
    await api.delete(`/admin/countries/${countryCode}/operators/${opId}`);
  },

  async uploadOperatorLogo(countryCode: string, opId: string, file: File): Promise<CountryOperator> {
    const form = new FormData();
    form.append("file", file);
    const r = await api.post<CountryOperator>(
      `/admin/countries/${countryCode}/operators/${opId}/logo`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return r.data;
  },

  /* Integration test */
  async testIntegration(code: string): Promise<CountryTestResult> {
    const r = await api.post<CountryTestResult>(`/admin/countries/${code}/test`);
    return r.data;
  },

  /* Merchant country restrictions */
  async listMerchantCountries(merchantId: string): Promise<MerchantCountryInfo[]> {
    const r = await api.get<MerchantCountryInfo[]>(`/admin/merchants/${merchantId}/countries`);
    return r.data;
  },

  async setMerchantCountry(merchantId: string, countryCode: string, isActive: boolean): Promise<MerchantCountryInfo> {
    const r = await api.put<MerchantCountryInfo>(`/admin/merchants/${merchantId}/countries/${countryCode}`, { is_active: isActive });
    return r.data;
  },

  async removeMerchantCountry(merchantId: string, countryCode: string): Promise<void> {
    await api.delete(`/admin/merchants/${merchantId}/countries/${countryCode}`);
  },
};
