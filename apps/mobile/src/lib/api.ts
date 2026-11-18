import { createApiClient } from "@pharma/api-client";
import Constants from "expo-constants";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./secure-tokens";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  "http://localhost:4000/api";

let onUnauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorizedHandler = handler;
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  setTokens,
  onUnauthorized: async () => {
    await clearTokens();
    onUnauthorizedHandler?.();
  },
});
