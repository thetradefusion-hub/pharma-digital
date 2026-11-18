import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSyncStore } from "../stores/sync-store";
import { colors, radii, spacing } from "../theme/colors";
import { typography } from "../theme/typography";

interface SyncStatusIndicatorProps {
  onPressSync?: () => void;
  compact?: boolean;
}

export function SyncStatusIndicator({
  onPressSync,
  compact = false,
}: SyncStatusIndicatorProps) {
  const status = useSyncStore((s) => s.status);
  const syncing = useSyncStore((s) => s.syncing);
  const progress = useSyncStore((s) => s.progress);

  const version = status?.catalogueVersion;
  const lastStatus = status?.lastSyncStatus;
  const icon =
    syncing
      ? "sync"
      : lastStatus === "error"
        ? "alert-circle"
        : lastStatus === "success"
          ? "checkmark-circle"
          : "cloud-outline";

  const color =
    lastStatus === "error"
      ? colors.danger
      : lastStatus === "success"
        ? colors.success
        : colors.primary;

  const label = syncing
    ? progress?.message ?? "Syncing…"
    : version
      ? `Catalogue v${version}`
      : "Not synced";

  return (
    <Pressable
      onPress={onPressSync}
      disabled={!onPressSync || syncing}
      style={[styles.wrap, compact && styles.compact]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
        {!compact && status?.lastSyncAt ? (
          <Text style={styles.meta}>
            Last sync {new Date(status.lastSyncAt).toLocaleString()}
          </Text>
        ) : null}
      </View>
      {onPressSync ? (
        <Text style={styles.action}>{syncing ? "…" : "Sync"}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  compact: {
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
  },
  meta: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  action: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
});
