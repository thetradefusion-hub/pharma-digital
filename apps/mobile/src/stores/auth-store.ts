import type { AuthUser } from "@pharma/shared-types";
import { create } from "zustand";
import { api } from "../lib/api";
import {
  cacheAuthUser,
  clearTokens,
  getAccessToken,
  getCachedAuthUser,
  getRefreshToken,
} from "../lib/secure-tokens";
import { useNetworkStore } from "./network-store";

interface AuthState {
  user: AuthUser | null;
  bootstrapped: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  bootstrap: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  bootstrapped: false,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: Boolean(user) }),

  bootstrap: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, bootstrapped: true });
        return;
      }

      const cached = await getCachedAuthUser();
      const online = useNetworkStore.getState().isOnline;

      // Fast path: use cached profile offline (no /auth/me call).
      if (cached && !online) {
        set({ user: cached, isAuthenticated: true, bootstrapped: true });
        return;
      }

      // Online: refresh profile once. On failure, fall back to cache.
      try {
        const user = await api.me();
        await cacheAuthUser(user);
        set({ user, isAuthenticated: true, bootstrapped: true });
      } catch {
        if (cached) {
          set({ user: cached, isAuthenticated: true, bootstrapped: true });
          return;
        }
        await clearTokens();
        set({ user: null, isAuthenticated: false, bootstrapped: true });
      }
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, bootstrapped: true });
    }
  },

  login: async (emailOrUsername, password) => {
    const result = await api.login(emailOrUsername, password);
    if (result.user.role !== "MOBILE_USER") {
      await clearTokens();
      throw new Error("This account is not permitted on the mobile app");
    }
    await cacheAuthUser(result.user);
    set({ user: result.user, isAuthenticated: true, bootstrapped: true });
    return result.user;
  },

  logout: async () => {
    try {
      const refresh = await getRefreshToken();
      if (refresh) {
        await api.logout(refresh);
      } else {
        await clearTokens();
      }
    } catch {
      await clearTokens();
    }
    await cacheAuthUser(null);
    set({ user: null, isAuthenticated: false });
  },
}));
