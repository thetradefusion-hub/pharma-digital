import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { colors, spacing } from "../../src/theme/colors";

type ProductGroup = {
  key: string;
  title: string;
  products: LocalProductRow[];
};

export default function CatalogueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const categories = useLocalCategories();
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const categoryList = categories.data ?? [];

  useEffect(() => {
    if (!categoryList.length) {
      setActiveCategoryId("");
      return;
    }
    if (!activeCategoryId || !categoryList.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(categoryList[0].id);
    }
  }, [categoryList, activeCategoryId]);

  useEffect(() => {
    setSelected({});
    setSearch("");
  }, [activeCategoryId]);

  const subCategories = useLocalSubCategories(activeCategoryId);
  const products = useLocalProductsWithImages({
    categoryId: activeCategoryId || undefined,
    search: search.trim() || undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const activeCategory = useMemo(
    () => categoryList.find((c) => c.id === activeCategoryId),
    [categoryList, activeCategoryId],
  );

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

  if (categories.isLoading) {
    return <LoadingState message="Loading products…" />;
  }

  return (
    <View style={styles.safe}>
      <AppHeader
        variant="light"
        title="Products"
        subtitle="Pick a category, select products, open slides"
        bottom={
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search products…"
          />
        }
      />

      {!categoryList.length ? (
        <EmptyState
          title="No categories"
          message="Sync the catalogue to download categories and products."
        />
      ) : (
        <>
          <View style={styles.categoryBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.categoryScroll,
                { paddingHorizontal: layout.contentPadding },
              ]}
            >
              {categoryList.map((category, index) => {
                const theme = getCategoryTheme(category.name, index);
                const active = category.id === activeCategoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setActiveCategoryId(category.id)}
                    style={[
                      styles.catChip,
                      { backgroundColor: theme.background },
                      active && styles.catChipActive,
                    ]}
                  >
                    <Image
                      source={
                        category.imageUrl
                          ? { uri: category.imageUrl }
                          : theme.image
                      }
                      style={styles.catThumb}
                    />
                    <View style={styles.catMeta}>
                      <Text
                        style={[styles.catName, active && styles.catNameActive]}
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                      <Text style={styles.catCount} numberOfLines={1}>
                        {category.productCount} products
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View
            style={[
              styles.toolbar,
              { paddingHorizontal: layout.contentPadding },
            ]}
          >
            <View
              style={[styles.toolbarInner, { maxWidth: layout.contentMaxWidth }]}
            >
              <Text style={styles.activeLabel} numberOfLines={1}>
                {activeCategory?.name ?? "Category"}
              </Text>
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
              {products.isLoading || subCategories.isLoading ? (
                <LoadingState message="Loading products…" />
              ) : !groups.length ? (
                <EmptyState
                  title={
                    search.trim() ? "No matching products" : "No products yet"
                  }
                  message={
                    search.trim()
                      ? "Try another name or brand."
                      : "Add products in admin, then sync."
                  }
                />
              ) : (
                groups.map((group) => (
                  <View key={group.key} style={styles.group}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                      <Text style={styles.groupMeta}>
                        {group.products.length} product
                        {group.products.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <View style={styles.groupList}>
                      {group.products.map((item) => (
                        <ProductSelectRow
                          key={item.id}
                          product={item}
                          selected={Boolean(selected[item.id])}
                          onToggle={() => toggle(item.id)}
                        />
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
            <View
              style={[styles.footerInner, { maxWidth: layout.contentMaxWidth }]}
            >
              <Pressable
                onPress={openSlider}
                disabled={!selectedIds.length}
                style={[styles.cta, !selectedIds.length && styles.ctaDisabled]}
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
        </>
      )}
    </View>
  );
}

function ProductSelectRow({
  product,
  selected,
  onToggle,
}: {
  product: LocalProductRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const imageCount = product.images?.length ?? 0;
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.row, selected && styles.rowSelected]}
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
          <Ionicons name="image-outline" size={20} color={colors.primaryLight} />
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
  categoryBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEF5",
    paddingVertical: spacing.md,
  },
  categoryScroll: {
    gap: spacing.sm,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    minWidth: 148,
    maxWidth: 200,
  },
  catChipActive: {
    borderColor: colors.primary,
  },
  catThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  catMeta: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  catNameActive: {
    color: colors.primary,
  },
  catCount: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: 1,
  },
  toolbar: {
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEF5",
  },
  toolbarInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
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
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
  groupMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  groupList: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8EEF5",
    padding: spacing.md,
  },
  rowSelected: {
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
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#EEF2F7",
  },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  brand: {
    fontSize: 11,
    color: colors.accent,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.3,
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
  footerInner: { width: "100%" },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
