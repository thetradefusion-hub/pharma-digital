"use client";

import { createApiClient } from "@pharma/api-client";
import type { AuthTokens } from "@pharma/shared-types";

const ACCESS_KEY = "pharma_admin_access";
const REFRESH_KEY = "pharma_admin_refresh";

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresIn: 0 };
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (typeof window === "undefined") return;
  if (!tokens) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    return;
  }
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  getAccessToken: async () => getStoredTokens()?.accessToken ?? null,
  getRefreshToken: async () => getStoredTokens()?.refreshToken ?? null,
  setTokens: async (tokens) => setStoredTokens(tokens),
  onUnauthorized: async () => {
    setStoredTokens(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  },
});
