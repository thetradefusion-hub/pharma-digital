import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../hooks/use-responsive-layout";
import { goBackOr } from "../lib/navigation";
import { colors, spacing } from "../theme/colors";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
  bottom?: React.ReactNode;
  /** Light surface header — preferred for Products / Profile */
  variant?: "brand" | "light";
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  rightSlot,
  bottom,
  variant = "brand",
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const light = variant === "light";

  return (
    <View
      style={[
        styles.wrap,
        light ? styles.wrapLight : styles.wrapBrand,
        {
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: layout.contentPadding,
        },
      ]}
    >
      <View style={[styles.inner, { maxWidth: layout.contentMaxWidth }]}>
        <View style={styles.row}>
          {showBack ? (
            <Pressable
              onPress={() => goBackOr("/(tabs)")}
              style={[styles.backBtn, light && styles.backBtnLight]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={light ? colors.primary : colors.textInverse}
              />
            </Pressable>
          ) : null}
          <View style={styles.titles}>
            <Text
              style={[styles.title, light ? styles.titleLight : styles.titleBrand]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  light ? styles.subtitleLight : styles.subtitleBrand,
                ]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.right}>{rightSlot}</View>
        </View>
        {bottom ? <View style={styles.bottom}>{bottom}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.lg,
  },
  wrapBrand: {
    backgroundColor: colors.primary,
  },
  wrapLight: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEF5",
  },
  inner: {
    width: "100%",
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  backBtnLight: {
    backgroundColor: "#EEF4FB",
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  titleBrand: {
    color: colors.textInverse,
  },
  titleLight: {
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
    lineHeight: 18,
  },
  subtitleBrand: {
    color: "rgba(255,255,255,0.82)",
  },
  subtitleLight: {
    color: colors.textSecondary,
  },
  right: {
    marginLeft: spacing.sm,
    minWidth: 36,
    alignItems: "flex-end",
  },
  bottom: {
    marginTop: spacing.md,
  },
});
