import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Lock to landscape while the presentation viewer is mounted.
 * No-ops gracefully on web / Expo Go limitations.
 */
export function useLandscapeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    let active = true;
    (async () => {
      try {
        const ScreenOrientation = await import("expo-screen-orientation");
        if (!active) return;
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
      } catch {
        // Expo Go / missing native module — layout still fills available space
      }
    })();

    return () => {
      active = false;
      void (async () => {
        try {
          const ScreenOrientation = await import("expo-screen-orientation");
          await ScreenOrientation.unlockAsync();
        } catch {
          // ignore
        }
      })();
    };
  }, [enabled]);
}
