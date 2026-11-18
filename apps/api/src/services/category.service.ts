import type { CategoryCreateInput } from "@pharma/validation";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

export async function listCategories(params: {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder: "asc" | "desc";
  activeOnly?: boolean;
}) {
  const where = {
    deletedAt: null,
    ...(params.activeOnly ? { isActive: true } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            {
              description: {
                contains: params.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const orderByField =
    params.sortBy === "name" || params.sortBy === "createdAt"
      ? params.sortBy
      : "displayOrder";

  const [total, items] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      include: {
        subCategories: {
          where: { deletedAt: null },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: { [orderByField]: params.sortOrder },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
  ]);

  return { total, items };
}

export async function getCategory(id: string) {
  const category = await prisma.category.findFirst({
    where: { id, deletedAt: null },
    include: {
      subCategories: {
        where: { deletedAt: null },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!category) throw new AppError("NOT_FOUND", "Category not found", 404);
  return category;
}

export async function createCategory(
  data: CategoryCreateInput,
  userId: string,
  ip?: string,
) {
  const category = await prisma.category.create({ data });
  await logActivity({
    userId,
    action: "CREATED",
    entityType: "Category",
    entityId: category.id,
    summary: `Created category ${category.name}`,
    ipAddress: ip,
  });
  return category;
}

export async function updateCategory(
  id: string,
  data: Partial<CategoryCreateInput>,
  userId: string,
  ip?: string,
) {
  await getCategory(id);
  const category = await prisma.category.update({ where: { id }, data });
  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "Category",
    entityId: category.id,
    summary: `Updated category ${category.name}`,
    ipAddress: ip,
  });
  return category;
}

export async function deleteCategory(id: string, userId: string, ip?: string) {
  const category = await getCategory(id);
  const productCount = await prisma.product.count({
    where: { categoryId: id, deletedAt: null },
  });
  if (productCount > 0) {
    throw new AppError(
      "CATEGORY_IN_USE",
      "Cannot delete category with assigned products",
      409,
    );
  }
  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await logActivity({
    userId,
    action: "DELETED",
    entityType: "Category",
    entityId: id,
    summary: `Deleted category ${category.name}`,
    ipAddress: ip,
  });
  return { ok: true as const };
}
