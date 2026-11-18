import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export type LayoutBreakpoint = "phone" | "tablet" | "desktop";

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const breakpoint: LayoutBreakpoint =
      width >= 1100 ? "desktop" : width >= 768 ? "tablet" : "phone";

    const contentMaxWidth =
      breakpoint === "desktop" ? 1080 : breakpoint === "tablet" ? 920 : width;

    const contentPadding = breakpoint === "phone" ? 16 : breakpoint === "tablet" ? 24 : 32;

    const categoryColumns =
      breakpoint === "desktop" ? 4 : breakpoint === "tablet" ? 3 : 2;

    const productColumns =
      breakpoint === "desktop" ? 3 : breakpoint === "tablet" ? 2 : 1;

    const heroHeight = breakpoint === "phone" ? 168 : 210;
    const heroImageSize = breakpoint === "phone" ? 118 : 160;
    const quickIconSize = breakpoint === "phone" ? 56 : 64;

    const gap = breakpoint === "phone" ? 12 : 16;
    const isTabletUp = breakpoint !== "phone";

    return {
      width,
      height,
      isLandscape,
      breakpoint,
      isTabletUp,
      contentMaxWidth,
      contentPadding,
      categoryColumns,
      productColumns,
      heroHeight,
      heroImageSize,
      quickIconSize,
      gap,
      pageWidth: Math.min(width - contentPadding * 2, contentMaxWidth),
    };
  }, [width, height]);
}
