import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppHeader } from "../../src/components/AppHeader";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useInvalidateCatalogue } from "../../src/hooks/use-local-catalogue";
import { useResponsiveLayout } from "../../src/hooks/use-responsive-layout";
import { formatDateLike } from "../../src/lib/format";
import { useAuthStore } from "../../src/stores/auth-store";
import { useNetworkStore } from "../../src/stores/network-store";
import { useSyncStore } from "../../src/stores/sync-store";
import { BRAND_NAME } from "../../src/theme/brand";
import { colors, radii, spacing } from "../../src/theme/colors";

export default function ProfileScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const { status, runSync, syncing, refreshStatus } = useSyncStore();
  const invalidate = useInvalidateCatalogue();

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert("Offline", "Connect to sync catalogue updates.");
      return;
    }
    const ok = await runSync();
    invalidate();
    if (!ok) {
      Alert.alert(
        "Sync failed",
        "Your previous local catalogue was kept intact.",
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "You will need network access to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const initials =
    user?.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "MR";

  const offlineReady =
    Boolean(status?.catalogueVersion) || status?.lastSyncStatus === "success";

  return (
    <View style={styles.safe}>
      <AppHeader
        variant="light"
        title="Profile"
        subtitle="Account, sync and offline access"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.contentPadding,
            paddingBottom: 40,
            alignItems: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.page,
            {
              maxWidth: layout.contentMaxWidth,
              flexDirection: layout.isTabletUp ? "row" : "column",
              alignItems: layout.isTabletUp ? "flex-start" : "stretch",
              gap: layout.gap + 4,
            },
          ]}
        >
          <View
            style={[
              styles.column,
              layout.isTabletUp && { flex: 1.1, maxWidth: 420 },
            ]}
          >
            <View style={styles.heroCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.heroMeta}>
                <Text style={styles.name}>{user?.fullName ?? "Medical Rep"}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {user?.role === "MOBILE_USER" ? "Field MR" : user?.role}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      isOnline ? styles.onlineBadge : styles.offlineBadge,
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: isOnline ? "#027A48" : "#667085" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: isOnline ? "#027A48" : "#667085" },
                      ]}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account</Text>
              <InfoRow icon="person-outline" label="Username" value={`@${user?.username ?? "—"}`} />
              <InfoRow
                icon="time-outline"
                label="Last login"
                value={formatDateLike(user?.lastLoginAt)}
              />
              <InfoRow icon="business-outline" label="App" value={BRAND_NAME} />
            </View>
          </View>

          <View style={[styles.column, layout.isTabletUp && { flex: 1 }]}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Catalogue sync</Text>
                <View
                  style={[
                    styles.statusPill,
                    offlineReady ? styles.statusReady : styles.statusIdle,
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: offlineReady ? "#027A48" : colors.primary,
                    }}
                  >
                    {offlineReady ? "Offline Ready" : "Needs sync"}
                  </Text>
                </View>
              </View>

              <View style={styles.metrics}>
                <Metric
                  label="Products"
                  value={String(status?.productCount ?? 0)}
                  color="#0B3A6E"
                />
                <Metric
                  label="Categories"
                  value={String(status?.categoryCount ?? 0)}
                  color="#059669"
                />
                <Metric
                  label="Version"
                  value={status?.catalogueVersion ? `v${status.catalogueVersion}` : "—"}
                  color="#7C3AED"
                />
              </View>

              {status?.lastSyncAt ? (
                <Text style={styles.metaLine}>
                  Last sync {formatDateLike(status.lastSyncAt)}
                </Text>
              ) : (
                <Text style={styles.metaLine}>No successful sync yet</Text>
              )}
              {status?.lastSyncError ? (
                <Text style={styles.error}>{status.lastSyncError}</Text>
              ) : null}

              <PrimaryButton
                label={syncing ? "Syncing…" : "Sync catalogue now"}
                onPress={() => void handleSync()}
                loading={syncing}
                disabled={!isOnline}
                style={{ marginTop: spacing.md }}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick links</Text>
              <QuickLink
                icon="cube-outline"
                label="Browse products"
                onPress={() => router.push("/(tabs)/catalogue")}
              />
              <QuickLink
                icon="bookmark-outline"
                label="Saved / downloads"
                onPress={() => router.push("/(tabs)/downloads")}
              />
              <QuickLink
                icon="home-outline"
                label="Back to home"
                onPress={() => router.push("/(tabs)")}
              />
            </View>

            <PrimaryButton
              label="Logout"
              variant="danger"
              onPress={handleLogout}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickLink}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FB" },
  content: {},
  page: {
    width: "100%",
    paddingTop: spacing.lg,
  },
  column: {
    gap: spacing.md,
    width: "100%",
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EEF5",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF3FF",
    borderRadius: radii.xl,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  onlineBadge: {
    backgroundColor: "#E8F8EF",
  },
  offlineBadge: {
    backgroundColor: "#EEF2F7",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#E8EEF5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  statusPill: {
    borderRadius: radii.xl,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusReady: {
    backgroundColor: "#E8F8EF",
  },
  statusIdle: {
    backgroundColor: "#EAF3FF",
  },
  metrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  metaLine: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 1,
  },
  quickLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 4,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F3F6FB",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
});
