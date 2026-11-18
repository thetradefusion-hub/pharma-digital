import { prisma } from "../lib/prisma.js";

export async function getStats() {
  const [
    totalProducts,
    activeProducts,
    draftProducts,
    totalCategories,
    totalSubCategories,
    productsWithoutImages,
    totalMobileUsers,
  ] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
    prisma.product.count({ where: { deletedAt: null, status: "DRAFT" } }),
    prisma.category.count({ where: { deletedAt: null } }),
    prisma.subCategory.count({ where: { deletedAt: null } }),
    prisma.product.count({
      where: { deletedAt: null, images: { none: {} } },
    }),
    prisma.user.count({
      where: { deletedAt: null, role: { name: "MOBILE_USER" } },
    }),
  ]);

  return {
    totalProducts,
    activeProducts,
    draftProducts,
    totalCategories,
    totalSubCategories,
    productsWithoutImages,
    totalMobileUsers,
  };
}

export async function getCharts() {
  const [recentlyUpdatedProducts, productsNeedingImages] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        brandName: true,
        status: true,
        updatedAt: true,
        _count: { select: { images: true } },
      },
    }),
    prisma.product.findMany({
      where: { deletedAt: null, images: { none: {} } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, name: true, brandName: true },
    }),
  ]);

  return {
    recentlyUpdatedProducts: recentlyUpdatedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brandName,
      status: p.status,
      imageCount: p._count.images,
      updatedAt: p.updatedAt.toISOString(),
    })),
    productsNeedingImages,
  };
}

export async function getRecentActivity() {
  const items = await prisma.adminActivityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    summary: item.summary,
    createdAt: item.createdAt.toISOString(),
    user: item.user,
  }));
}
