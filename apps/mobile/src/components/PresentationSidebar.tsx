import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SlideVisual } from "../lib/slide-media";
import { colors, radii, spacing } from "../theme/colors";
import { typography } from "../theme/typography";

export type SidebarProductChip = {
  id: string;
  name: string;
  brandName: string;
};

interface PresentationSidebarProps {
  visible: boolean;
  brandName?: string | null;
  productName?: string | null;
  slideIndex: number;
  slideCount: number;
  products: SidebarProductChip[];
  currentProductId?: string | null;
  onExit: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectProduct: (productId: string) => void;
  onClose: () => void;
}

export function PresentationSidebar({
  visible,
  brandName,
  productName,
  slideIndex,
  slideCount,
  products,
  currentProductId,
  onExit,
  onNext,
  onPrev,
  onSelectProduct,
  onClose,
}: PresentationSidebarProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={styles.dim}
        onPress={onClose}
        accessibilityLabel="Close menu"
      />

      {/* Side controls: Exit / Prev / Next */}
      <View
        style={[
          styles.sidePanel,
          {
            paddingTop: Math.max(insets.top, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
          },
        ]}
      >
        <Pressable
          onPress={onExit}
          style={[styles.actionBtn, styles.exitBtn]}
          accessibilityLabel="Exit"
        >
          <Ionicons name="close" size={20} color={colors.textInverse} />
          <Text style={styles.actionLabel}>Exit</Text>
        </Pressable>
        <Pressable
          onPress={onPrev}
          disabled={slideIndex <= 0}
          style={[styles.actionBtn, slideIndex <= 0 && styles.disabled]}
          accessibilityLabel="Previous"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textInverse} />
          <Text style={styles.actionLabel}>Prev</Text>
        </Pressable>
        <Pressable
          onPress={onNext}
          disabled={slideIndex >= slideCount - 1}
          style={[
            styles.actionBtn,
            styles.nextBtn,
            slideIndex >= slideCount - 1 && styles.disabled,
          ]}
          accessibilityLabel="Next"
        >
          <Text style={styles.actionLabel}>Next</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textInverse}
          />
        </Pressable>

        <Text style={styles.meta}>
          {(brandName || productName || "Slide") +
            ` · ${slideIndex + 1}/${slideCount}`}
        </Text>
        {productName ? (
          <Text style={styles.productSub} numberOfLines={2}>
            {productName}
          </Text>
        ) : null}
      </View>

      {/* Bottom product names — tap jumps to that product's slides */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Text style={styles.bottomTitle}>Products</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productChips}
        >
          {products.map((product) => {
            const active = product.id === currentProductId;
            return (
              <Pressable
                key={product.id}
                onPress={() => onSelectProduct(product.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipBrand, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {product.brandName}
                </Text>
                <Text
                  style={[styles.chipName, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {product.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sidePanel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 168,
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: "rgba(7, 40, 73, 0.94)",
    borderBottomLeftRadius: radii.lg,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  exitBtn: {
    backgroundColor: "rgba(180, 35, 24, 0.9)",
  },
  nextBtn: {
    backgroundColor: colors.accent,
  },
  disabled: {
    opacity: 0.35,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: "700",
  },
  meta: {
    ...typography.caption,
    color: "rgba(255,255,255,0.75)",
    marginTop: spacing.sm,
  },
  productSub: {
    ...typography.body,
    color: colors.textInverse,
    fontSize: 13,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(7, 40, 73, 0.96)",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  bottomTitle: {
    ...typography.caption,
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  productChips: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    maxWidth: 160,
    minWidth: 110,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(13, 148, 136, 0.35)",
  },
  chipBrand: {
    ...typography.caption,
    color: colors.accentSoft,
    fontWeight: "700",
  },
  chipName: {
    ...typography.body,
    color: colors.textInverse,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.textInverse,
  },
});
