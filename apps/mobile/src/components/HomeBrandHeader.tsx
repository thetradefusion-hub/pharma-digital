import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../hooks/use-responsive-layout";
import { useSyncStore } from "../stores/sync-store";
import { brandImages, BRAND_NAME, BRAND_TAGLINE } from "../theme/brand";
import { colors, radii, spacing } from "../theme/colors";

interface HomeBrandHeaderProps {
  onPressMenu?: () => void;
  onPressSync?: () => void;
}

export function HomeBrandHeader({
  onPressMenu,
  onPressSync,
}: HomeBrandHeaderProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const status = useSyncStore((s) => s.status);
  const syncing = useSyncStore((s) => s.syncing);
  const offlineReady =
    Boolean(status?.catalogueVersion) || status?.lastSyncStatus === "success";

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: layout.contentPadding,
        },
      ]}
    >
      <View style={[styles.inner, { maxWidth: layout.contentMaxWidth }]}>
        <Pressable
          onPress={onPressMenu}
          style={styles.menuBtn}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <Ionicons name="menu" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.brandRow}>
          <Image
            source={brandImages.logo}
            style={[
              styles.logo,
              layout.isTabletUp && { width: 48, height: 48, borderRadius: 14 },
            ]}
          />
          <View style={styles.brandText}>
            <Text
              style={[styles.name, layout.isTabletUp && { fontSize: 20 }]}
              numberOfLines={1}
            >
              {BRAND_NAME}
            </Text>
            <Text style={styles.tagline} numberOfLines={1}>
              {BRAND_TAGLINE}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onPressSync}
          style={[
            styles.pill,
            offlineReady ? styles.pillReady : styles.pillIdle,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Sync status"
        >
          <Ionicons
            name={
              syncing ? "sync" : offlineReady ? "cloud-done" : "cloud-download"
            }
            size={14}
            color={offlineReady ? "#027A48" : colors.primary}
          />
          <Text
            style={[
              styles.pillText,
              { color: offlineReady ? "#027A48" : colors.primary },
            ]}
            numberOfLines={1}
          >
            {syncing ? "Syncing…" : offlineReady ? "Offline Ready" : "Sync now"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEF5",
    paddingBottom: spacing.md,
  },
  inner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F6FB",
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.1,
  },
  tagline: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: 1,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.xl,
    paddingHorizontal: 11,
    paddingVertical: 8,
    maxWidth: 140,
  },
  pillReady: {
    backgroundColor: "#E8F8EF",
  },
  pillIdle: {
    backgroundColor: "#E8F1FB",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
