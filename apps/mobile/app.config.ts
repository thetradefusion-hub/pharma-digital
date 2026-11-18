import type { ConfigContext, ExpoConfig } from "expo/config";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Pharma Digital",
  slug: "pharma-digital",
  version: "1.0.0",
  // default allows portrait app + landscape lock during presentation
  orientation: "default",
  icon: "./assets/icon.png",
  scheme: "pharma-catalogue",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0B3A6E",
  },
  android: {
    package: "com.pharma.digitalcatalogue",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B3A6E",
    },
    permissions: ["INTERNET", "ACCESS_NETWORK_STATE"],
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.pharma.digitalcatalogue",
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-screen-orientation",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0B3A6E",
        image: "./assets/splash-icon.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl,
    eas: {
      projectId: "pharma-digital-catalogue",
    },
  },
});
