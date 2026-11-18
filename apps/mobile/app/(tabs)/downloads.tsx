import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppHeader } from "../../src/components/AppHeader";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingState } from "../../src/components/LoadingState";
import {
  useDownloads,
  useInvalidateCatalogue,
  useLocalCategories,
} from "../../src/hooks/use-local-catalogue";
import { useResponsiveLayout } from "../../src/hooks/use-responsive-layout";
import {
  removeDownloadRecord,
  type LocalDownload,
} from "../../src/lib/db/catalogue-repo";
import { formatDateLike } from "../../src/lib/format";
import { useNetworkStore } from "../../src/stores/network-store";
import { useSyncStore } from "../../src/stores/sync-store";
import { colors, radii, spacing } from "../../src/theme/colors";

export default function DownloadsScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const downloads = useDownloads();
  const categories = useLocalCategories();
  const invalidate = useInvalidateCatalogue();
  const { status, syncing, runSync, progress } = useSyncStore();
  const [busy, setBusy] = useState(false);

  const offlineReady =
    Boolean(status?.catalogueVersion) && (status?.productCount ?? 0) > 0;
  const progressPct = Math.round((progress?.progress ?? 0) * 100);

  const history = useMemo(() => {
    const items = downloads.data ?? [];
    return [...items].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [downloads.data]);

  const totalProducts = status?.productCount ?? 0;
  const totalCategories =
    status?.categoryCount ?? (categories.data ?? []).length;
  const subCategoryCount = useMemo(
    () =>
      (categories.data ?? []).reduce((sum, c) => sum + c.subCategoryCount, 0),
    [categories.data],
  );

  const refresh = async () => {
    await downloads.refetch();
    await categories.refetch();
    invalidate();
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert("Offline", "Internet chahiye catalogue sync ke liye.");
      return;
    }
    setBusy(true);
    try {
      const ok = await runSync();
      await refresh();
      if (!ok) {
        Alert.alert(
          "Sync failed",
          "Purana offline data safe hai. Thodi der baad try karein.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = (item: LocalDownload) => {
    Alert.alert(
      "Remove from history",
      `“${item.label}” history se hataayein? Offline catalogue data rehta hai.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeDownloadRecord(item.entityType, item.entityId);
            await refresh();
          },
        },
      ],
    );
  };

  const handleOpenItem = (item: LocalDownload) => {
    if (item.entityType === "product") {
      router.push({
        pathname: "/product/[id]",
        params: { id: item.entityId },
      });
      return;
    }
    router.push("/(tabs)/catalogue");
  };

  if (downloads.isLoading && !status) {
    return <LoadingState message="Loading saved content…" />;
  }

  const syncingNow = syncing || busy;

  return (
    <View style={styles.safe}>
      <AppHeader
        variant="light"
        title="Saved"
        subtitle="Offline catalogue sync & download history"
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
        refreshControl={
          <RefreshControl
            refreshing={syncingNow}
            onRefresh={() => void handleSync()}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.page, { maxWidth: layout.contentMaxWidth }]}>
          <View
            style={[
              styles.heroCard,
              offlineReady ? styles.heroReady : styles.heroIdle,
            ]}
          >
            <View style={styles.heroTop}>
              <View
                style={[
                  styles.heroIcon,
                  {
                    backgroundColor: offlineReady
                      ? "rgba(2,122,72,0.12)"
                      : "rgba(11,58,110,0.1)",
                  },
                ]}
              >
                <Ionicons
                  name={
                    syncingNow
                      ? "sync"
                      : offlineReady
                        ? "cloud-done"
                        : "cloud-download-outline"
                  }
                  size={26}
                  color={offlineReady ? "#027A48" : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>
                  {syncingNow
                    ? "Syncing catalogue…"
                    : offlineReady
                      ? "Offline Ready"
                      : "Catalogue not synced"}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {syncingNow
                    ? progress?.message ?? "Downloading offline content…"
                    : offlineReady
                      ? `Last sync ${formatDateLike(status?.lastSyncAt)}`
                      : "Ek baar sync karein — phir bina internet ke present karein."}
                </Text>
              </View>
              <View
                style={[
                  styles.networkPill,
                  isOnline ? styles.onlinePill : styles.offlinePill,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isOnline ? "#027A48" : "#667085" },
                  ]}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isOnline ? "#027A48" : "#667085",
                  }}
                >
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>

            {syncingNow ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(progressPct, 6)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{progressPct}%</Text>
              </View>
            ) : null}

            {status?.lastSyncError && !syncingNow ? (
              <Text style={styles.errorBanner}>{status.lastSyncError}</Text>
            ) : null}

            <View style={styles.heroActions}>
              <Pressable
                onPress={() => void handleSync()}
                disabled={!isOnline || syncingNow}
                style={[
                  styles.primaryBtn,
                  (!isOnline || syncingNow) && styles.btnDisabled,
                ]}
              >
                <Ionicons name="sync" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {syncingNow
                    ? "Syncing…"
                    : offlineReady
                      ? "Refresh catalogue"
                      : "Sync for offline"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(tabs)/catalogue")}
                style={styles.secondaryBtn}
              >
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Browse products</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <Metric
              icon="cube-outline"
              label="Products"
              value={String(totalProducts)}
              color="#0B3A6E"
              bg="#EAF3FF"
            />
            <Metric
              icon="grid-outline"
              label="Categories"
              value={String(totalCategories)}
              color="#059669"
              bg="#E8F8EF"
            />
            <Metric
              icon="layers-outline"
              label="Subcats"
              value={String(subCategoryCount)}
              color="#7C3AED"
              bg="#F3E8FF"
            />
            <Metric
              icon="pricetag-outline"
              label="Version"
              value={
                status?.catalogueVersion ? `v${status.catalogueVersion}` : "—"
              }
              color="#EA580C"
              bg="#FFF1E6"
            />
          </View>

          <View style={styles.tipsCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>How offline works</Text>
              <Text style={styles.tipText}>
                Sync once while online. Categories, products aur slide images
                device pe save ho jati hain — field me bina net ke presentation
                chalao.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.sectionMeta}>{history.length} records</Text>
          </View>

          {!history.length ? (
            <View style={styles.emptyCard}>
              <EmptyState
                icon="cloud-download-outline"
                title="No sync history yet"
                message="“Sync for offline” dabao — catalogue download ho jayega."
                actionLabel={isOnline ? "Sync now" : undefined}
                onAction={isOnline ? () => void handleSync() : undefined}
              />
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  onOpen={() => handleOpenItem(item)}
                  onRetry={() => {
                    if (item.entityType === "catalogue") {
                      void handleSync();
                      return;
                    }
                    void handleSync();
                  }}
                  onRemove={() => handleRemove(item)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.metric, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function HistoryRow({
  item,
  onOpen,
  onRetry,
  onRemove,
}: {
  item: LocalDownload;
  onOpen: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const statusMeta = getStatusMeta(item.status);
  const isCatalogue = item.entityType === "catalogue";

  return (
    <View style={styles.historyCard}>
      <View
        style={[
          styles.historyIcon,
          { backgroundColor: statusMeta.bg },
        ]}
      >
        <Ionicons
          name={isCatalogue ? "library-outline" : "document-outline"}
          size={18}
          color={statusMeta.color}
        />
      </View>

      <View style={styles.historyBody}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={styles.historyMeta} numberOfLines={1}>
          {isCatalogue ? "Full catalogue" : "Product package"} ·{" "}
          {formatDateLike(item.updatedAt)}
        </Text>
        {item.errorMessage ? (
          <Text style={styles.historyError} numberOfLines={2}>
            {item.errorMessage}
          </Text>
        ) : null}
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusText, { color: statusMeta.color }]}>
            {statusMeta.label}
            {item.status === "downloading"
              ? ` · ${Math.round(item.progress * 100)}%`
              : ""}
          </Text>
        </View>
      </View>

      <View style={styles.historyActions}>
        {item.status === "failed" ? (
          <Pressable onPress={onRetry} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </Pressable>
        ) : (
          <Pressable onPress={onOpen} style={styles.iconBtn}>
            <Ionicons name="open-outline" size={18} color={colors.primary} />
          </Pressable>
        )}
        <Pressable onPress={onRemove} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

function getStatusMeta(status: LocalDownload["status"]) {
  switch (status) {
    case "completed":
      return { label: "Completed", color: "#027A48", bg: "#E8F8EF" };
    case "failed":
      return { label: "Failed", color: colors.danger, bg: "#FEE4E2" };
    case "downloading":
      return { label: "Downloading", color: "#2563EB", bg: "#E8F1FB" };
    case "queued":
      return { label: "Queued", color: "#B54708", bg: "#FFFAEB" };
    default:
      return { label: status, color: colors.textSecondary, bg: "#EEF2F7" };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FB" },
  content: {},
  page: {
    width: "100%",
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroCard: {
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
  },
  heroReady: {
    backgroundColor: "#F3FBF7",
    borderColor: "rgba(2,122,72,0.12)",
  },
  heroIdle: {
    backgroundColor: "#EAF3FF",
    borderColor: "rgba(11,58,110,0.1)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
  networkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.xl,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  onlinePill: { backgroundColor: "#E8F8EF" },
  offlinePill: { backgroundColor: "#EEF2F7" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  progressBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    backgroundColor: "rgba(11,58,110,0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    minWidth: 36,
    textAlign: "right",
  },
  errorBanner: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
    backgroundColor: "#FEE4E2",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D7E3F2",
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  btnDisabled: { opacity: 0.5 },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metric: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 72,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tipsCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E8EEF5",
    alignItems: "flex-start",
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8EEF5",
  },
  historyList: { gap: spacing.sm },
  historyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8EEF5",
    padding: spacing.md,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  historyMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  historyError: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "600",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: radii.xl,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  historyActions: {
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F6FB",
  },
});
