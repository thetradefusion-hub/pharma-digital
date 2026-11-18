import { router } from "expo-router";

/**
 * Safe back for Expo Router / web: avoid GO_BACK warning when history is empty.
 */
export function goBackOr(fallbackHref: string = "/(tabs)") {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref as never);
}
