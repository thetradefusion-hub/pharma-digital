import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CategoryCard } from "../../src/components/CategoryCard";
import { EmptyState } from "../../src/components/EmptyState";
import { HomeBrandHeader } from "../../src/components/HomeBrandHeader";
import { LoadingState } from "../../src/components/LoadingState";
import {
  useInvalidateCatalogue,
  useLocalCategories,
} from "../../src/hooks/use-local-catalogue";
import { useResponsiveLayout } from "../../src/hooks/use-responsive-layout";
import { useSyncStore } from "../../src/stores/sync-store";
import { brandImages, getCategoryTheme } from "../../src/theme/brand";
import { colors, radii, spacing } from "../../src/theme/colors";

const HERO_SLIDES = [
  {
    title: "Digital Product Catalogue",
    subtitle:
      "A smart and interactive product presentation app for healthcare professionals.",
    image: brandImages.hero,
  },
  {
    title: "Present with Confidence",
    subtitle:
      "Open categories, pick products, and run a fullscreen image slider for doctors.",
    image: brandImages.hero,
  },
  {
    title: "Works Offline",
    subtitle:
      "Sync once and keep your catalogue ready in the field without internet.",
    image: brandImages.hero,
  },
];

const QUICK_ACTIONS = [
  {
    key: "presentations",
    label: "Presentations",
    icon: "desktop-outline" as const,
    bg: "#F3E8FF",
    color: "#7C3AED",
    href: "/(tabs)/catalogue" as const,
  },
  {
    key: "downloads",
    label: "Downloads",
    icon: "download-outline" as const,
    bg: "#E7F8EF",
    color: "#059669",
    href: "/(tabs)/downloads" as const,
  },
  {
    key: "favorites",
    label: "Favorites",
    icon: "star-outline" as const,
    bg: "#FFF1E6",
    color: "#EA580C",
    href: "/(tabs)/downloads" as const,
  },
  {
    key: "recent",
    label: "Recently Viewed",
    icon: "time-outline" as const,
    bg: "#E8F1FB",
    color: "#2563EB",
    href: "/(tabs)/catalogue" as const,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const categories = useLocalCategories();
  const { refreshStatus, runSync } = useSyncStore();
  const invalidate = useInvalidateCatalogue();
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<ScrollView>(null);
  const pageWidth = layout.pageWidth;

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => {
        const next = (prev + 1) % HERO_SLIDES.length;
        heroRef.current?.scrollTo({ x: next * pageWidth, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [pageWidth]);

  const items = categories.data ?? [];
  const gridItems = useMemo(() => {
    const wideIds = new Set(
      items
        .filter((c, i) => getCategoryTheme(c.name, i).wide)
        .map((c) => c.id),
    );
    return {
      normal: items.filter((c) => !wideIds.has(c.id)),
      wide: items.filter((c) => wideIds.has(c.id)),
    };
  }, [items]);

  const itemWidth = useMemo(() => {
    const cols = layout.categoryColumns;
    const totalGap = layout.gap * (cols - 1);
    return (pageWidth - totalGap) / cols;
  }, [layout.categoryColumns, layout.gap, pageWidth]);

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  const syncNow = async () => {
    await runSync();
    invalidate();
  };

  if (categories.isLoading) {
    return <LoadingState message="Loading Pharma Digital…" />;
  }

  return (
    <View style={styles.safe}>
      <HomeBrandHeader
        onPressMenu={() => router.push("/(tabs)/profile")}
        onPressSync={() => void syncNow()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.contentPadding,
            paddingBottom: layout.isTabletUp ? 48 : 36,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.page, { maxWidth: layout.contentMaxWidth }]}>
          <View style={[styles.heroCard, { width: pageWidth }]}>
            <ScrollView
              ref={heroRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onHeroScroll}
              style={{ width: pageWidth }}
            >
              {HERO_SLIDES.map((slide) => (
                <View
                  key={slide.title}
                  style={[
                    styles.heroSlide,
                    {
                      width: pageWidth,
                      minHeight: layout.heroHeight,
                      flexDirection: layout.isLandscape ? "row" : "row",
                    },
                  ]}
                >
                  <View style={styles.heroCopy}>
                    <Text
                      style={[
                        styles.heroTitle,
                        layout.isTabletUp && styles.heroTitleTablet,
                      ]}
                    >
                      {slide.title}
                    </Text>
                    <Text
                      style={[
                        styles.heroSubtitle,
                        layout.isTabletUp && styles.heroSubtitleTablet,
                      ]}
                    >
                      {slide.subtitle}
                    </Text>
                  </View>
                  <Image
                    source={slide.image}
                    style={{
                      width: layout.heroImageSize,
                      height: layout.heroImageSize,
                      borderRadius: 20,
                    }}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.dots}>
              {HERO_SLIDES.map((slide, index) => (
                <View
                  key={slide.title}
                  style={[styles.dot, index === heroIndex && styles.dotActive]}
                />
              ))}
            </View>
          </View>

          <View style={styles.quickRow}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                style={styles.quickItem}
                onPress={() => router.push(action.href)}
              >
                <View
                  style={[
                    styles.quickIcon,
                    {
                      backgroundColor: action.bg,
                      width: layout.quickIconSize,
                      height: layout.quickIconSize,
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon}
                    size={layout.isTabletUp ? 24 : 22}
                    color={action.color}
                  />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                layout.isTabletUp && { fontSize: 22 },
              ]}
            >
              Explore Categories
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/catalogue")}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAll}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </View>

          {!items.length ? (
            <EmptyState
              title="No categories yet"
              message="Sync the published catalogue to download categories."
              actionLabel="Sync now"
              onAction={() => void syncNow()}
            />
          ) : (
            <>
              <View style={[styles.grid, { gap: layout.gap }]}>
                {gridItems.normal.map((category, index) => (
                  <View key={category.id} style={{ width: itemWidth }}>
                    <CategoryCard
                      category={category}
                      index={index}
                      onPress={() =>
                        router.push({
                          pathname: "/category/[id]",
                          params: { id: category.id },
                        })
                      }
                    />
                  </View>
                ))}
              </View>
              {gridItems.wide.map((category, index) => (
                <View key={category.id} style={{ width: pageWidth }}>
                  <CategoryCard
                    category={category}
                    index={index}
                    wide
                    onPress={() =>
                      router.push({
                        pathname: "/category/[id]",
                        params: { id: category.id },
                      })
                    }
                  />
                </View>
              ))}
            </>
          )}

          <View
            style={[
              styles.ctaCard,
              layout.isTabletUp && styles.ctaCardTablet,
            ]}
          >
            <View style={styles.ctaCopy}>
              <Text
                style={[
                  styles.ctaTitle,
                  layout.isTabletUp && { fontSize: 22 },
                ]}
              >
                Start a Product Presentation
              </Text>
              <Text style={styles.ctaSubtitle}>
                Present medicines with interactive and professional slides.
              </Text>
              <Pressable
                style={styles.ctaButton}
                onPress={() => router.push("/(tabs)/catalogue")}
              >
                <Text style={styles.ctaButtonText}>Select Product</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </Pressable>
            </View>
            <Image
              source={brandImages.ctaTablet}
              style={[
                styles.ctaImage,
                layout.isTabletUp && { width: 120, height: 120 },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FB" },
  content: {
    alignItems: "center",
  },
  page: {
    width: "100%",
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  heroCard: {
    alignSelf: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 26,
    overflow: "hidden",
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(11,58,110,0.06)",
  },
  heroSlide: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1.2,
    gap: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 28,
  },
  heroTitleTablet: {
    fontSize: 28,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  heroSubtitleTablet: {
    fontSize: 15,
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#C5D6EA",
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  quickItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  quickIcon: {
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  ctaCard: {
    borderRadius: 26,
    backgroundColor: "#EAF3FF",
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(11,58,110,0.06)",
    marginBottom: spacing.sm,
  },
  ctaCardTablet: {
    padding: spacing.xxl,
  },
  ctaCopy: {
    flex: 1,
    gap: 8,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  ctaSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  ctaButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ctaButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  ctaImage: {
    width: 96,
    height: 96,
    borderRadius: 18,
  },
});
