import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AppHeader } from "../../src/components/AppHeader";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingState } from "../../src/components/LoadingState";
import { OfflineIndicator } from "../../src/components/OfflineIndicator";
import { useLocalProduct } from "../../src/hooks/use-local-catalogue";
import { collectVisualAidSlides } from "../../src/lib/slide-media";
import { useSyncStore } from "../../src/stores/sync-store";
import { colors, radii, spacing } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const product = useLocalProduct(id);
  const runSync = useSyncStore((s) => s.runSync);

  if (product.isLoading) {
    return <LoadingState message="Loading product…" />;
  }

  if (!product.data) {
    return (
      <View style={styles.safe}>
        <AppHeader title="Product" showBack />
        <EmptyState
          title="Product not available offline"
          message="Sync the catalogue or download this product first."
          actionLabel="Sync catalogue"
          onAction={() => void runSync()}
        />
      </View>
    );
  }

  const p = product.data;
  const slides = collectVisualAidSlides({ images: p.images });
  const heroHeight = Math.min(Math.round(width * 0.62), 420);

  const openSlide = (_index = 0) => {
    router.push(`/slider?ids=${p.id}`);
  };

  return (
    <View style={styles.safe}>
      <AppHeader title={p.brandName} subtitle={p.name} showBack />
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>{p.brandName}</Text>
        <Text style={styles.name}>{p.name}</Text>
        {p.categoryName ? (
          <Text style={styles.category}>{p.categoryName}</Text>
        ) : null}

        {slides.length === 0 ? (
          <EmptyState
            title="No images yet"
            message="Sync the catalogue after adding product images in admin."
            actionLabel="Sync catalogue"
            onAction={() => void runSync()}
          />
        ) : (
          <View style={styles.gallery}>
            <Pressable
              onPress={() => openSlide(0)}
              style={[styles.hero, { height: heroHeight }]}
              accessibilityRole="button"
              accessibilityLabel="Open fullscreen slides"
            >
              <Image
                source={{ uri: slides[0].uri }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  {slides.length} slide{slides.length === 1 ? "" : "s"} · tap for fullscreen
                </Text>
              </View>
            </Pressable>

            {slides.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}
              >
                {slides.map((slide, index) => (
                  <Pressable
                    key={slide.slideId}
                    onPress={() => openSlide(index)}
                    style={styles.thumbWrap}
                  >
                    <Image
                      source={{ uri: slide.uri }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                    <Text style={styles.thumbLabel} numberOfLines={1}>
                      {index + 1}. {slide.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
    gap: spacing.sm,
  },
  brand: {
    ...typography.caption,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  name: {
    ...typography.h1,
    fontSize: 28,
  },
  category: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  gallery: {
    gap: spacing.md,
  },
  hero: {
    width: "100%",
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroBadge: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: "rgba(7, 40, 73, 0.82)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroBadgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: "600",
    textAlign: "center",
  },
  thumbRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumbWrap: {
    width: 140,
    gap: 6,
  },
  thumb: {
    width: 140,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  thumbLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
