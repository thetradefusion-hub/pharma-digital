import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CategoryWithCounts } from "../lib/db/catalogue-repo";
import { useResponsiveLayout } from "../hooks/use-responsive-layout";
import { getCategoryTheme } from "../theme/brand";
import { colors, spacing } from "../theme/colors";

interface CategoryCardProps {
  category: CategoryWithCounts;
  onPress: () => void;
  index?: number;
  wide?: boolean;
  fullWidth?: boolean;
}

export function CategoryCard({
  category,
  onPress,
  index = 0,
  wide = false,
  fullWidth = false,
}: CategoryCardProps) {
  const layout = useResponsiveLayout();
  const theme = getCategoryTheme(category.name, index);
  const isWide = wide || theme.wide || fullWidth;
  const imageSource = category.imageUrl
    ? { uri: category.imageUrl }
    : theme.image;
  const imageSize = isWide
    ? layout.isTabletUp
      ? 112
      : 96
    : layout.isTabletUp
      ? 84
      : 72;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.background },
        isWide ? styles.cardWide : styles.cardHalf,
        layout.isTabletUp && !isWide && styles.cardHalfTablet,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.imageWrap,
          {
            width: imageSize,
            height: imageSize,
            borderRadius: layout.isTabletUp ? 22 : 18,
            marginBottom: isWide ? 0 : spacing.sm,
          },
        ]}
      >
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
      </View>

      <View style={styles.meta}>
        <Text
          style={[styles.name, layout.isTabletUp && styles.nameTablet]}
          numberOfLines={2}
        >
          {category.name}
        </Text>
        <Text style={styles.counts} numberOfLines={2}>
          {category.subCategoryCount} Subcategor
          {category.subCategoryCount === 1 ? "y" : "ies"} •{" "}
          {category.productCount} Product
          {category.productCount === 1 ? "" : "s"}
        </Text>
      </View>

      <View style={styles.arrow}>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: spacing.lg,
    minHeight: 176,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(18,38,58,0.04)",
    shadowColor: "#0B3A6E",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHalf: {
    width: "100%",
  },
  cardHalfTablet: {
    minHeight: 200,
  },
  cardWide: {
    width: "100%",
    minHeight: 148,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  imageWrap: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  meta: {
    flex: 1,
    paddingRight: 30,
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 21,
  },
  nameTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  counts: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    lineHeight: 17,
  },
  arrow: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(11,58,110,0.08)",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
});
