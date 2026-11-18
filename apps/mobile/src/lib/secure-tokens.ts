import { Platform } from "react-native";
import type { AuthTokens, AuthUser } from "@pharma/shared-types";

const ACCESS_KEY = "pharma_access_token";
const REFRESH_KEY = "pharma_refresh_token";
const EXPIRES_KEY = "pharma_token_expires_in";
const USER_KEY = "pharma_cached_user";

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.deleteItemAsync(key);
}

/** Native: SecureStore. Web demo: localStorage. Never SQLite. */
export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_KEY);
}

export async function setTokens(tokens: AuthTokens | null): Promise<void> {
  if (!tokens) {
    await Promise.all([
      deleteItem(ACCESS_KEY),
      deleteItem(REFRESH_KEY),
      deleteItem(EXPIRES_KEY),
    ]);
    return;
  }

  await Promise.all([
    setItem(ACCESS_KEY, tokens.accessToken),
    setItem(REFRESH_KEY, tokens.refreshToken),
    setItem(EXPIRES_KEY, String(tokens.expiresIn)),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteItem(ACCESS_KEY),
    deleteItem(REFRESH_KEY),
    deleteItem(EXPIRES_KEY),
    deleteItem(USER_KEY),
  ]);
}

export async function cacheAuthUser(user: AuthUser | null): Promise<void> {
  if (!user) {
    await deleteItem(USER_KEY);
    return;
  }
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function getCachedAuthUser(): Promise<AuthUser | null> {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
