import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../src/components/AppHeader";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingState } from "../../src/components/LoadingState";
import { SearchBar } from "../../src/components/SearchBar";
import {
  useLocalCategories,
  useLocalProductsWithImages,
  useLocalSubCategories,
} from "../../src/hooks/use-local-catalogue";
import { useResponsiveLayout } from "../../src/hooks/use-responsive-layout";
import type { LocalProductRow } from "../../src/lib/db/catalogue-repo";
import { getCategoryTheme } from "../../src/theme/brand";
import { colors, radii, spacing } from "../../src/theme/colors";

type ProductGroup = {
  key: string;
  title: string;
  products: LocalProductRow[];
};

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const categories = useLocalCategories();
  const subCategories = useLocalSubCategories(id);
  const [search, setSearch] = useState("");
  const products = useLocalProductsWithImages({
    categoryId: id,
    search: search.trim() || undefined,
    sortBy: "name",
    sortOrder: "asc",
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const category = useMemo(
    () => (categories.data ?? []).find((c) => c.id === id),
    [categories.data, id],
  );

  const theme = getCategoryTheme(category?.name ?? "", 0);

  const groups = useMemo((): ProductGroup[] => {
    const list = products.data ?? [];
    const subs = subCategories.data ?? [];
    const ordered: ProductGroup[] = [];

    for (const sub of subs) {
      const items = list.filter((p) => p.subCategoryId === sub.id);
      if (items.length) {
        ordered.push({ key: sub.id, title: sub.name, products: items });
      }
    }

    const ungrouped = list.filter(
      (p) => !p.subCategoryId || !subs.some((s) => s.id === p.subCategoryId),
    );
    if (ungrouped.length) {
      ordered.push({
        key: "other",
        title: subs.length ? "Other products" : "All products",
        products: ungrouped,
      });
    }

    return ordered;
  }, [products.data, subCategories.data]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((key) => selected[key]),
    [selected],
  );

  const visibleProducts = useMemo(
    () => groups.flatMap((g) => g.products),
    [groups],
  );

  const cardWidth = useMemo(() => {
    const cols = layout.productColumns;
    const pageWidth = layout.pageWidth;
    const totalGap = layout.gap * (cols - 1);
    return (pageWidth - totalGap) / cols;
  }, [layout.gap, layout.pageWidth, layout.productColumns]);

  const toggle = (productId: string) => {
    setSelected((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = { ...selected };
    for (const product of visibleProducts) next[product.id] = true;
    setSelected(next);
  };

  const clearAll = () => setSelected({});

  const openSlider = () => {
    if (!selectedIds.length) return;
    router.push({
      pathname: "/slider",
      params: { ids: selectedIds.join(",") },
    });
  };

  if (products.isLoading || categories.isLoading || subCategories.isLoading) {
    return <LoadingState message="Loading products…" />;
  }

  return (
    <View style={styles.safe}>
      <AppHeader
        variant="light"
        title={category?.name ?? "Category"}
        subtitle="Select products to open the presentation slider"
        showBack
        bottom={
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search products in this category"
          />
        }
      />

      <View
        style={[
          styles.toolbar,
          { paddingHorizontal: layout.contentPadding },
        ]}
      >
        <View style={[styles.toolbarInner, { maxWidth: layout.contentMaxWidth }]}>
          <View style={[styles.themeChip, { backgroundColor: theme.background }]}>
            <Text style={styles.themeChipText}>
              {visibleProducts.length} products
            </Text>
          </View>
          <Pressable onPress={selectAll} style={styles.toolBtn}>
            <Text style={styles.toolText}>Select all</Text>
          </Pressable>
          <Pressable onPress={clearAll} style={styles.toolBtn}>
            <Text style={styles.toolText}>Clear</Text>
          </Pressable>
          <Text style={styles.count}>{selectedIds.length} selected</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.contentPadding,
            paddingBottom: 110 + insets.bottom,
            alignItems: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.page, { maxWidth: layout.contentMaxWidth }]}>
          {!groups.length ? (
            <EmptyState
              title={search.trim() ? "No matching products" : "No products yet"}
              message={
                search.trim()
                  ? "Try another name or brand."
                  : "Add products in admin, then sync."
              }
            />
          ) : (
            groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <View style={[styles.groupList, { gap: layout.gap }]}>
                  {group.products.map((item) => (
                    <View key={item.id} style={{ width: cardWidth }}>
                      <ProductSelectCard
                        product={item}
                        selected={Boolean(selected[item.id])}
                        onToggle={() => toggle(item.id)}
                        compact={layout.productColumns > 1}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={[styles.footerInner, { maxWidth: layout.contentMaxWidth }]}>
          <Pressable
            onPress={openSlider}
            disabled={!selectedIds.length}
            style={[
              styles.cta,
              !selectedIds.length && styles.ctaDisabled,
            ]}
          >
            <Ionicons name="images-outline" size={18} color="#fff" />
            <Text style={styles.ctaText}>
              {selectedIds.length
                ? `View slider (${selectedIds.length})`
                : "Select products first"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ProductSelectCard({
  product,
  selected,
  onToggle,
  compact,
}: {
  product: LocalProductRow;
  selected: boolean;
  onToggle: () => void;
  compact: boolean;
}) {
  const imageCount = product.images?.length ?? 0;
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.card,
        compact && styles.cardCompact,
        selected && styles.cardSelected,
      ]}
    >
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? (
          <Ionicons name="checkmark" size={14} color={colors.textInverse} />
        ) : null}
      </View>

      {product.primaryLocalUri ? (
        <Image source={{ uri: product.primaryLocalUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Ionicons name="image-outline" size={22} color={colors.primaryLight} />
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brandName}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.images}>
          {imageCount} slide{imageCount === 1 ? "" : "s"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FB" },
  toolbar: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEF5",
    backgroundColor: colors.surface,
  },
  toolbarInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  themeChip: {
    borderRadius: radii.xl,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  themeChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  toolBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: "#EEF4FB",
  },
  toolText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  count: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  list: {},
  page: {
    width: "100%",
    gap: spacing.xl,
    paddingTop: spacing.lg,
  },
  group: { gap: spacing.md },
  groupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
  groupList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E8EEF5",
    padding: spacing.md,
    minHeight: 88,
  },
  cardCompact: {
    minHeight: 108,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: "#F0FDFA",
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#D7DEE8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#EEF2F7",
  },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  brand: {
    fontSize: 11,
    color: colors.accent,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  images: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "#E8EEF5",
    alignItems: "center",
  },
  footerInner: {
    width: "100%",
  },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
