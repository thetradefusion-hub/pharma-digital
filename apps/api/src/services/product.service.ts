import type { ProductCreateInput } from "@pharma/validation";
import type { PublicationStatus } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

const productInclude = {
  category: true,
  subCategory: true,
  images: { orderBy: { displayOrder: "asc" as const } },
  presentation: {
    include: {
      slides: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" as const },
      },
    },
  },
};

async function assertSubCategory(
  categoryId: string,
  subCategoryId: string | null | undefined,
) {
  if (!subCategoryId) return;
  const sub = await prisma.subCategory.findFirst({
    where: { id: subCategoryId, categoryId, deletedAt: null },
  });
  if (!sub) {
    throw new AppError(
      "INVALID_SUBCATEGORY",
      "Subcategory does not belong to the selected category",
      400,
    );
  }
}

export async function listProducts(params: {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder: "asc" | "desc";
  categoryId?: string;
  status?: PublicationStatus;
  featured?: boolean;
  recentlyUpdated?: boolean;
  publishedOnly?: boolean;
}) {
  const where = {
    deletedAt: null,
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.publishedOnly ? { status: "PUBLISHED" as const } : {}),
    ...(params.featured !== undefined ? { featured: params.featured } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            {
              brandName: {
                contains: params.search,
                mode: "insensitive" as const,
              },
            },
            {
              composition: {
                contains: params.search,
                mode: "insensitive" as const,
              },
            },
            { sku: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy = params.recentlyUpdated
    ? { updatedAt: "desc" as const }
    : params.sortBy === "name" ||
        params.sortBy === "brandName" ||
        params.sortBy === "createdAt" ||
        params.sortBy === "updatedAt"
      ? { [params.sortBy]: params.sortOrder }
      : { displayOrder: params.sortOrder };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" } },
      },
      orderBy,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
  ]);

  return { total, items };
}

export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: productInclude,
  });
  if (!product) throw new AppError("NOT_FOUND", "Product not found", 404);
  return product;
}

export async function createProduct(
  data: ProductCreateInput,
  userId: string,
  ip?: string,
) {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, deletedAt: null },
  });
  if (!category) throw new AppError("NOT_FOUND", "Category not found", 404);
  await assertSubCategory(data.categoryId, data.subCategoryId);

  const existingSku = await prisma.product.findFirst({
    where: { sku: data.sku, deletedAt: null },
  });
  if (existingSku) {
    throw new AppError("SKU_EXISTS", "A product with this SKU already exists", 409);
  }

  const product = await prisma.product.create({
    data,
    include: productInclude,
  });

  await prisma.presentation.create({
    data: {
      productId: product.id,
      title: `${product.name} Presentation`,
      status: "DRAFT",
    },
  });

  await logActivity({
    userId,
    action: "CREATED",
    entityType: "Product",
    entityId: product.id,
    summary: `Created product ${product.name}`,
    ipAddress: ip,
  });

  return getProduct(product.id);
}

export async function updateProduct(
  id: string,
  data: Partial<ProductCreateInput>,
  userId: string,
  ip?: string,
) {
  await getProduct(id);

  if (data.sku) {
    const existingSku = await prisma.product.findFirst({
      where: { sku: data.sku, deletedAt: null, NOT: { id } },
    });
    if (existingSku) {
      throw new AppError("SKU_EXISTS", "A product with this SKU already exists", 409);
    }
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, deletedAt: null },
    });
    if (!category) throw new AppError("NOT_FOUND", "Category not found", 404);
  }

  const existing = await prisma.product.findFirst({
    where: { id, deletedAt: null },
  });
  const nextCategoryId = data.categoryId ?? existing!.categoryId;
  const nextSubCategoryId =
    data.subCategoryId !== undefined ? data.subCategoryId : existing!.subCategoryId;
  await assertSubCategory(nextCategoryId, nextSubCategoryId);

  const product = await prisma.product.update({
    where: { id },
    data,
    include: productInclude,
  });

  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "Product",
    entityId: product.id,
    summary: `Updated product ${product.name}`,
    ipAddress: ip,
  });

  return product;
}

export async function deleteProduct(id: string, userId: string, ip?: string) {
  const product = await getProduct(id);
  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await logActivity({
    userId,
    action: "DELETED",
    entityType: "Product",
    entityId: id,
    summary: `Deleted product ${product.name}`,
    ipAddress: ip,
  });
  return { ok: true as const };
}

export async function duplicateProduct(
  id: string,
  userId: string,
  ip?: string,
) {
  const source = await getProduct(id);
  const sku = `${source.sku}-COPY-${Date.now().toString(36).toUpperCase()}`;

  const product = await prisma.product.create({
    data: {
      name: `${source.name} (Copy)`,
      brandName: source.brandName,
      genericName: source.genericName,
      sku,
      categoryId: source.categoryId,
      composition: source.composition,
      strength: source.strength,
      dosageForm: source.dosageForm,
      packSize: source.packSize,
      description: source.description,
      approvedIndications: source.approvedIndications,
      keyInformation: source.keyInformation,
      highlights: source.highlights,
      prescribingInfo: source.prescribingInfo,
      precautions: source.precautions,
      storageInstructions: source.storageInstructions,
      displayOrder: source.displayOrder,
      status: "DRAFT",
      featured: false,
      images: {
        create: source.images.map((img) => ({
          url: img.url,
          publicId: img.publicId,
          contentHash: img.contentHash,
          altText: img.altText,
          displayOrder: img.displayOrder,
          isPrimary: img.isPrimary,
        })),
      },
    },
  });

  const presentation = await prisma.presentation.create({
    data: {
      productId: product.id,
      title: `${product.name} Presentation`,
      status: "DRAFT",
    },
  });

  if (source.presentation?.slides.length) {
    await prisma.presentationSlide.createMany({
      data: source.presentation.slides.map((slide) => ({
        presentationId: presentation.id,
        title: slide.title,
        subtitle: slide.subtitle,
        slideType: slide.slideType,
        backgroundColor: slide.backgroundColor,
        backgroundImageUrl: slide.backgroundImageUrl,
        backgroundImageHash: slide.backgroundImageHash,
        mainImageUrl: slide.mainImageUrl,
        mainImageHash: slide.mainImageHash,
        secondaryImageUrl: slide.secondaryImageUrl,
        secondaryImageHash: slide.secondaryImageHash,
        description: slide.description,
        bulletPoints: slide.bulletPoints ?? [],
        highlightText: slide.highlightText,
        content: slide.content ?? undefined,
        displayOrder: slide.displayOrder,
        isActive: slide.isActive,
      })),
    });
  }

  await logActivity({
    userId,
    action: "CREATED",
    entityType: "Product",
    entityId: product.id,
    summary: `Duplicated product ${source.name}`,
    ipAddress: ip,
  });

  return getProduct(product.id);
}

export async function addProductImages(
  productId: string,
  images: Array<{
    url: string;
    publicId?: string;
    contentHash?: string;
    altText?: string;
  }>,
  userId: string,
) {
  await getProduct(productId);
  const existingCount = await prisma.productImage.count({ where: { productId } });

  const created = await prisma.$transaction(
    images.map((image, index) =>
      prisma.productImage.create({
        data: {
          productId,
          url: image.url,
          publicId: image.publicId,
          contentHash: image.contentHash,
          altText: image.altText,
          displayOrder: existingCount + index,
          isPrimary: existingCount === 0 && index === 0,
        },
      }),
    ),
  );

  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "Product",
    entityId: productId,
    summary: `Added ${images.length} image(s) to product`,
  });

  return created;
}

export async function reorderProductImages(
  productId: string,
  imageIds: string[],
) {
  await getProduct(productId);
  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.productImage.update({
        where: { id },
        data: { displayOrder: index, isPrimary: index === 0 },
      }),
    ),
  );
  return prisma.productImage.findMany({
    where: { productId },
    orderBy: { displayOrder: "asc" },
  });
}

export async function deleteProductImage(imageId: string, userId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) throw new AppError("NOT_FOUND", "Image not found", 404);
  await prisma.productImage.delete({ where: { id: imageId } });
  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "Product",
    entityId: image.productId,
    summary: "Removed product image",
  });
  return { ok: true as const };
}
