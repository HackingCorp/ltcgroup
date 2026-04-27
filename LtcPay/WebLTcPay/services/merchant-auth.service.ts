import api from "@/lib/api";
import Cookies from "js-cookie";
import type { AuthTokens, LoginRequest, MerchantPortalUser, MerchantRegisterRequest } from "@/types";

export const merchantAuthService = {
  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>("/merchant-auth/login", data);
    const tokens = response.data;
    Cookies.set("access_token", tokens.access_token, { expires: 7 });
    Cookies.set("user_role", "merchant", { expires: 7 });
    if (tokens.refresh_token) {
      Cookies.set("refresh_token", tokens.refresh_token, { expires: 30 });
    }
    return tokens;
  },

  async register(data: MerchantRegisterRequest) {
    const response = await api.post("/merchant-auth/register", data);
    const result = response.data;
    Cookies.set("access_token", result.access_token, { expires: 7 });
    Cookies.set("user_role", "merchant", { expires: 7 });
    if (result.refresh_token) {
      Cookies.set("refresh_token", result.refresh_token, { expires: 30 });
    }
    return result;
  },

  async getProfile(): Promise<MerchantPortalUser> {
    const response = await api.get<MerchantPortalUser>("/merchant-auth/me");
    return response.data;
  },

  async updateProfile(data: Partial<MerchantPortalUser>): Promise<MerchantPortalUser> {
    const response = await api.patch<MerchantPortalUser>("/merchant-auth/profile", data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/merchant-auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  logout() {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.remove("user_role");
    if (typeof window !== "undefined") {
      window.location.href = "/merchant/login";
    }
  },

  isAuthenticated(): boolean {
    return !!Cookies.get("access_token") && Cookies.get("user_role") === "merchant";
  },
};
