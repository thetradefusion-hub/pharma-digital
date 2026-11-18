"use client";

import { create } from "zustand";
import type { AuthUser } from "@pharma/shared-types";
import { api, getStoredTokens, setStoredTokens } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  hydrated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  hydrated: false,
  async login(emailOrUsername, password) {
    set({ loading: true });
    try {
      const result = await api.login(emailOrUsername, password);
      if (result.user.role !== "ADMIN") {
        setStoredTokens(null);
        throw new Error("Admin access required");
      }
      set({ user: result.user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  async logout() {
    const tokens = getStoredTokens();
    try {
      if (tokens?.refreshToken) await api.logout(tokens.refreshToken);
    } finally {
      setStoredTokens(null);
      set({ user: null });
    }
  },
  async hydrate() {
    const tokens = getStoredTokens();
    if (!tokens) {
      set({ hydrated: true, user: null });
      return;
    }
    try {
      const user = await api.me();
      if (user.role !== "ADMIN") {
        setStoredTokens(null);
        set({ user: null, hydrated: true });
        return;
      }
      set({ user, hydrated: true });
    } catch {
      setStoredTokens(null);
      set({ user: null, hydrated: true });
    }
  },
}));
