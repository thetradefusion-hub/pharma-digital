import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme/colors";
import { typography } from "../theme/typography";

interface PresentationControlsProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

export function PresentationControls({
  current,
  total,
  onPrev,
  onNext,
  onExit,
}: PresentationControlsProps) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onExit} style={styles.exitBtn} accessibilityLabel="Exit presentation">
        <Ionicons name="close" size={22} color={colors.textInverse} />
      </Pressable>

      <Pressable
        onPress={onPrev}
        disabled={current <= 0}
        style={[styles.navBtn, current <= 0 && styles.disabled]}
        accessibilityLabel="Previous slide"
      >
        <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
      </Pressable>

      <Text style={styles.counter}>
        {current + 1} / {total}
      </Text>

      <Pressable
        onPress={onNext}
        disabled={current >= total - 1}
        style={[styles.navBtn, current >= total - 1 && styles.disabled]}
        accessibilityLabel="Next slide"
      >
        <Ionicons name="chevron-forward" size={22} color={colors.textInverse} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(7, 40, 73, 0.88)",
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  disabled: {
    opacity: 0.35,
  },
  counter: {
    ...typography.h3,
    color: colors.textInverse,
    minWidth: 72,
    textAlign: "center",
  },
});
