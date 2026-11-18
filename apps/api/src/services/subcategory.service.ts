import type {
  SubCategoryCreateInput,
  SubCategoryUpdateInput,
} from "@pharma/validation";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

export async function listSubCategories(categoryId: string) {
  return prisma.subCategory.findMany({
    where: { categoryId, deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}

export async function getSubCategory(id: string) {
  const item = await prisma.subCategory.findFirst({
    where: { id, deletedAt: null },
  });
  if (!item) throw new AppError("NOT_FOUND", "Subcategory not found", 404);
  return item;
}

export async function createSubCategory(
  data: SubCategoryCreateInput,
  userId: string,
  ip?: string,
) {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, deletedAt: null },
  });
  if (!category) throw new AppError("NOT_FOUND", "Category not found", 404);

  const item = await prisma.subCategory.create({ data });
  await logActivity({
    userId,
    action: "CREATED",
    entityType: "SubCategory",
    entityId: item.id,
    summary: `Created subcategory ${item.name} under ${category.name}`,
    ipAddress: ip,
  });
  return item;
}

export async function updateSubCategory(
  id: string,
  data: SubCategoryUpdateInput,
  userId: string,
  ip?: string,
) {
  await getSubCategory(id);
  const item = await prisma.subCategory.update({ where: { id }, data });
  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "SubCategory",
    entityId: item.id,
    summary: `Updated subcategory ${item.name}`,
    ipAddress: ip,
  });
  return item;
}

export async function deleteSubCategory(
  id: string,
  userId: string,
  ip?: string,
) {
  const item = await getSubCategory(id);
  await prisma.product.updateMany({
    where: { subCategoryId: id, deletedAt: null },
    data: { subCategoryId: null },
  });
  await prisma.subCategory.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await logActivity({
    userId,
    action: "DELETED",
    entityType: "SubCategory",
    entityId: id,
    summary: `Deleted subcategory ${item.name}`,
    ipAddress: ip,
  });
  return { ok: true as const };
}
