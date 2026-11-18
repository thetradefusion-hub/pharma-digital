import { TextStyle } from "react-native";
import { colors } from "./colors";

export const typography = {
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  h1: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  } satisfies TextStyle,
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  } satisfies TextStyle,
  h3: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 22,
  } satisfies TextStyle,
  bodySecondary: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    lineHeight: 20,
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  } satisfies TextStyle,
  button: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textInverse,
  } satisfies TextStyle,
} as const;
