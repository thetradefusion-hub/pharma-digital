"use client";

import { createApiClient } from "@pharma/api-client";
import type { AuthTokens } from "@pharma/shared-types";

const ACCESS_KEY = "pharma_admin_access";
const REFRESH_KEY = "pharma_admin_refresh";

/**
 * Public browser traffic uses same-origin `/api` (Vercel rewrite → `api` service).
 * Server-side code can use the `API_URL` service binding (runtime only; not build/middleware).
 */
export function resolveApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (publicUrl) return publicUrl;

  if (typeof window === "undefined" && process.env.API_URL) {
    const base = process.env.API_URL.endsWith("/")
      ? process.env.API_URL
      : `${process.env.API_URL}/`;
    return new URL("api", base).toString().replace(/\/$/, "");
  }

  if (typeof window !== "undefined") return "/api";

  return "http://localhost:4000/api";
}

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
  baseUrl: resolveApiBaseUrl(),
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
