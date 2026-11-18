import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLocalPresentation,
  getLocalProduct,
  getLocalProductsByIds,
  listDownloads,
  listLocalCategories,
  listLocalProducts,
  listLocalProductsWithImages,
  listLocalSubCategories,
  type ProductQuery,
} from "../lib/db/catalogue-repo";

export const catalogueKeys = {
  all: ["local-catalogue"] as const,
  categories: ["local-catalogue", "categories"] as const,
  subCategories: (categoryId: string) =>
    ["local-catalogue", "subcategories", categoryId] as const,
  products: (q: ProductQuery) => ["local-catalogue", "products", q] as const,
  productsWithImages: (q: ProductQuery) =>
    ["local-catalogue", "products-with-images", q] as const,
  productsByIds: (ids: string[]) =>
    ["local-catalogue", "products-by-ids", ids] as const,
  product: (id: string) => ["local-catalogue", "product", id] as const,
  presentation: (productId: string) =>
    ["local-catalogue", "presentation", productId] as const,
  downloads: ["local-downloads"] as const,
};

export function useLocalCategories() {
  return useQuery({
    queryKey: catalogueKeys.categories,
    queryFn: listLocalCategories,
  });
}

export function useLocalSubCategories(categoryId: string) {
  return useQuery({
    queryKey: catalogueKeys.subCategories(categoryId),
    queryFn: () => listLocalSubCategories(categoryId),
    enabled: Boolean(categoryId),
  });
}

export function useLocalProducts(query: ProductQuery = {}) {
  return useQuery({
    queryKey: catalogueKeys.products(query),
    queryFn: () => listLocalProducts(query),
  });
}

export function useLocalProductsWithImages(query: ProductQuery = {}) {
  return useQuery({
    queryKey: catalogueKeys.productsWithImages(query),
    queryFn: () => listLocalProductsWithImages(query),
  });
}

export function useLocalProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: catalogueKeys.productsByIds(ids),
    queryFn: () => getLocalProductsByIds(ids),
    enabled: ids.length > 0,
  });
}

export function useLocalProduct(id: string) {
  return useQuery({
    queryKey: catalogueKeys.product(id),
    queryFn: () => getLocalProduct(id),
    enabled: Boolean(id),
  });
}

export function useLocalPresentation(productId: string) {
  return useQuery({
    queryKey: catalogueKeys.presentation(productId),
    queryFn: () => getLocalPresentation(productId),
    enabled: Boolean(productId),
  });
}

export function useDownloads() {
  return useQuery({
    queryKey: catalogueKeys.downloads,
    queryFn: listDownloads,
  });
}

export function useInvalidateCatalogue() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: catalogueKeys.all });
}
