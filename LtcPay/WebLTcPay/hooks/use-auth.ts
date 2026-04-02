"use client";

import { create } from "zustand";
import { authService } from "@/services/auth.service";
import type { User, LoginRequest } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (data: LoginRequest) => {
    await authService.login(data);
    const user = await authService.getProfile();
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      if (!authService.isAuthenticated()) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await authService.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
