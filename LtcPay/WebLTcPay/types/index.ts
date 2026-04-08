export interface User {
  id: string;
  email: string;
  full_name: string;
  business_name?: string;
  role: "merchant" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  business_name?: string;
}

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "expired" | "cancelled";
  description?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  callback_url?: string;
  redirect_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  payment_id: string;
  reference: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  provider: string;
  provider_reference?: string;
  created_at: string;
}

export interface DashboardStats {
  total_payments: number;
  total_revenue: number;
  total_transactions: number;
  success_rate: number;
  recent_payments: Payment[];
  revenue_chart: { date: string; amount: number }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
}

export interface MerchantProfile {
  id: string;
  business_name: string;
  api_key: string;
  webhook_config?: WebhookConfig;
  is_active: boolean;
  created_at: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  api_key_live: string;
  api_key_test: string;
  webhook_secret?: string;
  callback_url?: string;
  is_active: boolean;
  is_verified: boolean;
  is_test_mode: boolean;
  business_type?: string;
  description?: string;
  logo_url?: string;
  default_payment_mode: "SDK" | "DIRECT_API";
  created_at: string;
  updated_at: string;
}

export interface MerchantCredentials {
  id: string;
  name: string;
  api_key_live: string;
  api_key_test: string;
  api_secret: string;
  webhook_secret: string;
  message: string;
}

export interface MerchantListResponse {
  merchants: Merchant[];
  total_count: number;
  page: number;
  page_size: number;
}
