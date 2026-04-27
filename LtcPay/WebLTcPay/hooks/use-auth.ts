"use client";

import { create } from "zustand";
import Cookies from "js-cookie";
import { authService } from "@/services/auth.service";
import { merchantAuthService } from "@/services/merchant-auth.service";
import type { User, LoginRequest, MerchantPortalUser } from "@/types";

interface AuthState {
  user: User | null;
  merchantUser: MerchantPortalUser | null;
  role: "admin" | "merchant" | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  merchantLogin: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  merchantUser: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (data: LoginRequest) => {
    await authService.login(data);
    const user = await authService.getProfile();
    Cookies.set("user_role", "admin", { expires: 7 });
    set({ user, role: "admin", isAuthenticated: true });
  },

  merchantLogin: async (data: LoginRequest) => {
    await merchantAuthService.login(data);
    const merchantUser = await merchantAuthService.getProfile();
    set({ merchantUser, role: "merchant", isAuthenticated: true });
  },

  logout: () => {
    const role = Cookies.get("user_role");
    if (role === "merchant") {
      merchantAuthService.logout();
    } else {
      authService.logout();
    }
    set({ user: null, merchantUser: null, role: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const role = Cookies.get("user_role");
      if (!authService.isAuthenticated()) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      if (role === "merchant") {
        const merchantUser = await merchantAuthService.getProfile();
        set({ merchantUser, role: "merchant", isAuthenticated: true, isLoading: false });
      } else {
        const user = await authService.getProfile();
        set({ user, role: "admin", isAuthenticated: true, isLoading: false });
      }
    } catch {
      set({ user: null, merchantUser: null, role: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
