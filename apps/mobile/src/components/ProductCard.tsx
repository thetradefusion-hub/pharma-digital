import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { LocalProductRow } from "../lib/db/catalogue-repo";
import { colors, radii, spacing } from "../theme/colors";
import { typography } from "../theme/typography";

interface ProductCardProps {
  product: LocalProductRow;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.thumbWrap}>
        {product.primaryLocalUri ? (
          <Image
            source={{ uri: product.primaryLocalUri }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="medkit-outline" size={28} color={colors.primaryLight} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brandName}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[product.strength, product.dosageForm, product.categoryName]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  brand: {
    ...typography.caption,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  name: {
    ...typography.h3,
    fontSize: 16,
  },
  meta: {
    ...typography.caption,
  },
});
