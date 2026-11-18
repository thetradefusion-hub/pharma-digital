import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { loginSchema, type LoginInput } from "@pharma/validation";
import { PrimaryButton } from "../src/components";
import { useInvalidateCatalogue } from "../src/hooks/use-local-catalogue";
import { useAuthStore } from "../src/stores/auth-store";
import { useNetworkStore } from "../src/stores/network-store";
import { useSyncStore } from "../src/stores/sync-store";
import { colors, radii, spacing } from "../src/theme/colors";
import { typography } from "../src/theme/typography";

export default function LoginScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const runSync = useSyncStore((s) => s.runSync);
  const invalidate = useInvalidateCatalogue();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
    },
  });

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.emailOrUsername, values.password);
      if (isOnline) {
        void runSync().then(() => invalidate());
      }
      router.replace("/(tabs)");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to sign in",
      );
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>Pharma Digital</Text>
        <Text style={styles.subtitle}>
          Product Catalogue & Visual Aid — sign in to sync and present
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email or username</Text>
        <Controller
          control={control}
          name="emailOrUsername"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="mr@pharma.demo"
              placeholderTextColor={colors.textSecondary}
            />
          )}
        />
        {errors.emailOrUsername ? (
          <Text style={styles.error}>{errors.emailOrUsername.message}</Text>
        ) : null}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Password</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
            />
          )}
        />
        {errors.password ? (
          <Text style={styles.error}>{errors.password.message}</Text>
        ) : null}

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {!isOnline ? (
          <Text style={styles.hint}>
            You appear offline. Login requires a network connection.
          </Text>
        ) : null}

        <PrimaryButton
          label="Sign in"
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={!isOnline}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: "center",
    padding: spacing.xl,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  brand: {
    ...typography.brand,
    color: colors.textInverse,
  },
  subtitle: {
    ...typography.bodySecondary,
    color: "rgba(255,255,255,0.85)",
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.md,
  },
});
