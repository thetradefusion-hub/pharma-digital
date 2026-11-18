import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { EmptyState } from "../src/components/EmptyState";
import { LoadingState } from "../src/components/LoadingState";
import { PresentationSidebar } from "../src/components/PresentationSidebar";
import { useLandscapeLock } from "../src/hooks/use-landscape-lock";
import { useLocalProductsByIds } from "../src/hooks/use-local-catalogue";
import { goBackOr } from "../src/lib/navigation";
import {
  collectSlidesForProducts,
  firstSlideIndexForProduct,
} from "../src/lib/slide-media";
import { colors, spacing } from "../src/theme/colors";
import { typography } from "../src/theme/typography";

function parseIds(raw?: string | string[]): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export default function MultiProductSliderScreen() {
  const { ids: idsParam } = useLocalSearchParams<{ ids?: string }>();
  const ids = useMemo(() => parseIds(idsParam), [idsParam]);
  const { width, height } = useWindowDimensions();
  const isLandscape = width >= height;
  const isTablet = Math.min(width, height) >= 600;

  useLandscapeLock(true);

  const productsQuery = useLocalProductsByIds(ids);
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const products = productsQuery.data ?? [];
  const slides = useMemo(
    () => collectSlidesForProducts(products),
    [products],
  );

  useEffect(() => {
    setIndex(0);
  }, [idsParam]);

  const exit = () => goBackOr("/(tabs)");
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(slides.length - 1, i + 1));
  const openMenu = () => setMenuOpen(true);

  const swipe = Gesture.Pan().onEnd((event) => {
    if (event.translationX < -60) {
      runOnJS(goNext)();
    } else if (event.translationX > 60) {
      runOnJS(goPrev)();
    }
  });
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(openMenu)();
  });
  const gesture = Gesture.Exclusive(swipe, tap);

  if (productsQuery.isLoading) {
    return <LoadingState message="Opening image slider…" />;
  }

  if (!ids.length || !slides.length) {
    return (
      <View style={styles.fallback}>
        <EmptyState
          title="No images to show"
          message="Select products that have images, then open the slider again."
          actionLabel="Go back"
          onAction={exit}
        />
      </View>
    );
  }

  const current = slides[Math.min(index, slides.length - 1)];
  const landscapeHint = !isLandscape && Platform.OS !== "web";

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <Pressable
          style={styles.stage}
          onPress={() => setMenuOpen(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel="Open slider menu"
        >
          <Image
            source={{ uri: current.uri }}
            style={styles.fullImage}
            resizeMode={isTablet ? "cover" : "contain"}
          />
          {!menuOpen ? (
            <View style={styles.hintBar} pointerEvents="none">
              <Text style={styles.hintText}>
                {current.brandName || current.productName || "Slide"} ·{" "}
                {index + 1}/{slides.length}
                {landscapeHint ? " · rotate for landscape" : ""}
                {" · tap for menu"}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </GestureDetector>

      <PresentationSidebar
        visible={menuOpen}
        brandName={current.brandName}
        productName={current.productName}
        slideIndex={index}
        slideCount={slides.length}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          brandName: p.brandName,
        }))}
        currentProductId={current.productId}
        onExit={exit}
        onNext={goNext}
        onPrev={goPrev}
        onSelectProduct={(productId) => {
          setIndex(firstSlideIndexForProduct(slides, productId));
          setMenuOpen(false);
        }}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  fallback: { flex: 1, backgroundColor: colors.background },
  stage: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: { width: "100%", height: "100%" },
  hintBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hintText: {
    ...typography.caption,
    color: colors.textInverse,
    textAlign: "center",
  },
});
