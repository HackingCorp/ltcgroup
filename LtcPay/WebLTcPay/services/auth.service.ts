import api from "@/lib/api";
import Cookies from "js-cookie";
import type { AuthTokens, LoginRequest, RegisterRequest, User } from "@/types";

export const authService = {
  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>("/auth/login", data);
    const tokens = response.data;
    Cookies.set("access_token", tokens.access_token, { expires: 7 });
    if (tokens.refresh_token) {
      Cookies.set("refresh_token", tokens.refresh_token, { expires: 30 });
    }
    return tokens;
  },

  async register(data: RegisterRequest): Promise<User> {
    const response = await api.post<User>("/auth/register", data);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post("/auth/forgot-password", { email });
  },

  logout() {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  },

  isAuthenticated(): boolean {
    return !!Cookies.get("access_token");
  },
};
