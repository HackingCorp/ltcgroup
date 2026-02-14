// vCard API Client - Typed interface to backend API

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Types matching backend API
export type CardType = "VISA" | "MASTERCARD";
export type CardStatus = "ACTIVE" | "FROZEN" | "BLOCKED" | "EXPIRED";
export type TransactionType = "TOPUP" | "WITHDRAW" | "PURCHASE" | "REFUND";
export type KYCStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface RegisterResponse {
  user: UserResponse;
  token: AuthTokenResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  kyc_status: KYCStatus;
  created_at: string;
}

export interface CardPurchaseRequest {
  card_type: CardType;
  initial_balance: number;
}

export interface CardResponse {
  id: string;
  card_type: CardType;
  card_number_masked: string;
  status: CardStatus;
  balance: number;
  currency: string;
  expiry_date: string;
  created_at: string;
}

export interface CardsListResponse {
  cards: CardResponse[];
  total: number;
}

export interface TransactionResponse {
  id: string;
  card_id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface TransactionsListResponse {
  transactions: TransactionResponse[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface TopupRequest {
  card_id: string;
  amount: number;
  currency: string;
}

export interface WithdrawRequest {
  card_id: string;
  amount: number;
  currency: string;
}

export interface ApiError {
  detail: string;
}

// Token management
const TOKEN_KEY = "vcard_auth_token";
const TOKEN_EXPIRY_KEY = "vcard_auth_token_expiry";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // Check if token is expired
  if (Date.now() > parseInt(expiry)) {
    clearAuthToken();
    return null;
  }

  return token;
}

export function setAuthToken(tokenData: AuthTokenResponse): void {
  if (typeof window === "undefined") return;

  const expiryTime = Date.now() + (tokenData.expires_in * 1000);
  localStorage.setItem(TOKEN_KEY, tokenData.access_token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

// API helper function
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add auth token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - token expired or invalid
  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== "undefined") {
      window.location.href = "/services/solutions-financieres/vcard/auth";
    }
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const data = await response.json();

  if (!response.ok) {
    const error = data as ApiError;
    throw new Error(error.detail || "Une erreur est survenue");
  }

  return data as T;
}

// Auth API
export const authAPI = {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiFetch<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    // Auto-save token
    setAuthToken(response.token);

    return response;
  },

  async login(email: string, password: string): Promise<AuthTokenResponse> {
    const params = new URLSearchParams({ email, password });
    const token = await apiFetch<AuthTokenResponse>(
      `/auth/login?${params.toString()}`,
      { method: "POST" }
    );

    // Save token
    setAuthToken(token);

    return token;
  },

  logout(): void {
    clearAuthToken();
    if (typeof window !== "undefined") {
      window.location.href = "/services/solutions-financieres/vcard/auth";
    }
  },
};

// Users API
export const usersAPI = {
  async getMe(): Promise<UserResponse> {
    return apiFetch<UserResponse>("/users/me");
  },
};

// Cards API
export const cardsAPI = {
  async purchase(data: CardPurchaseRequest): Promise<CardResponse> {
    return apiFetch<CardResponse>("/cards/purchase", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async list(): Promise<CardsListResponse> {
    return apiFetch<CardsListResponse>("/cards/");
  },

  async get(cardId: string): Promise<CardResponse> {
    return apiFetch<CardResponse>(`/cards/${cardId}`);
  },

  async freeze(cardId: string): Promise<CardResponse> {
    return apiFetch<CardResponse>(`/cards/${cardId}/freeze`, {
      method: "POST",
    });
  },

  async unfreeze(cardId: string): Promise<CardResponse> {
    return apiFetch<CardResponse>(`/cards/${cardId}/unfreeze`, {
      method: "POST",
    });
  },

  async block(cardId: string): Promise<CardResponse> {
    return apiFetch<CardResponse>(`/cards/${cardId}/block`, {
      method: "POST",
    });
  },
};

// Transactions API
export const transactionsAPI = {
  async list(
    cardId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionsListResponse> {
    return apiFetch<TransactionsListResponse>(
      `/transactions/cards/${cardId}/transactions?limit=${limit}&offset=${offset}`
    );
  },

  async topup(data: TopupRequest): Promise<TransactionResponse> {
    return apiFetch<TransactionResponse>("/transactions/topup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async withdraw(data: WithdrawRequest): Promise<TransactionResponse> {
    return apiFetch<TransactionResponse>("/transactions/withdraw", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
