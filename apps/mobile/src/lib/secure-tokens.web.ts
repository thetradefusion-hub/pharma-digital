import type { AuthTokens, AuthUser } from "@pharma/shared-types";

const ACCESS_KEY = "pharma_access_token";
const REFRESH_KEY = "pharma_refresh_token";
const EXPIRES_KEY = "pharma_token_expires_in";
const USER_KEY = "pharma_cached_user";

/** Web demo uses localStorage. Native uses SecureStore (secure-tokens.ts). */
export async function getAccessToken(): Promise<string | null> {
  return localStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return localStorage.getItem(REFRESH_KEY);
}

export async function setTokens(tokens: AuthTokens | null): Promise<void> {
  if (!tokens) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    return;
  }

  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(EXPIRES_KEY, String(tokens.expiresIn));
}

export async function clearTokens(): Promise<void> {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function cacheAuthUser(user: AuthUser | null): Promise<void> {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getCachedAuthUser(): Promise<AuthUser | null> {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
