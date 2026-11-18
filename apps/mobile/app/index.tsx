import { Redirect } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LoadingState } from "../src/components";
import { useAuthStore } from "../src/stores/auth-store";
import { colors, spacing } from "../src/theme/colors";
import { typography } from "../src/theme/typography";

export default function SplashScreen() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    if (!bootstrapped) {
      void bootstrap();
    }
  }, [bootstrapped, bootstrap]);

  if (!bootstrapped) {
    return (
      <View style={styles.splash}>
        <View style={styles.brandMark}>
          <Text style={styles.markText}>PDC</Text>
        </View>
        <Text style={styles.brand}>Pharma Digital Catalogue</Text>
        <Text style={styles.tagline}>Offline visual aid for Medical Representatives</Text>
        <View style={{ height: spacing.xxl }} />
        <LoadingState message="Preparing app…" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  brandMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  markText: {
    ...typography.h1,
    color: colors.textInverse,
    letterSpacing: 1,
  },
  brand: {
    ...typography.h1,
    color: colors.textInverse,
    textAlign: "center",
  },
  tagline: {
    ...typography.bodySecondary,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
