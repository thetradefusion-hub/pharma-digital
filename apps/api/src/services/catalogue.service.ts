import { createHash } from "node:crypto";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

function hashPayload(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function getPublishedVersion() {
  const version = await prisma.catalogueVersion.findFirst({
    where: { isPublished: true },
    orderBy: { version: "desc" },
  });
  if (!version) {
    return {
      id: null,
      version: 0,
      label: null,
      notes: null,
      isPublished: false,
      publishedAt: null,
      manifestHash: null,
    };
  }
  return version;
}

async function buildManifestData() {
  const [categories, subCategories, products] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.subCategory.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      include: {
        subCategory: true,
        images: { orderBy: { displayOrder: "asc" } },
        presentation: {
          where: { deletedAt: null, status: "PUBLISHED" },
          include: {
            slides: {
              where: { deletedAt: null, isActive: true },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const categoryItems = categories.map((c) => ({
    id: c.id,
    updatedAt: c.updatedAt.toISOString(),
    contentHash: hashPayload({
      id: c.id,
      name: c.name,
      description: c.description,
      imageUrl: c.imageUrl,
      imageHash: c.imageHash,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      updatedAt: c.updatedAt.toISOString(),
    }),
  }));

  const productItems = products.map((p) => {
    const assetHashes = [
      ...p.images.map((img) => img.contentHash).filter(Boolean),
      ...(p.presentation?.slides.flatMap((s) =>
        [s.mainImageHash, s.secondaryImageHash, s.backgroundImageHash].filter(
          Boolean,
        ),
      ) ?? []),
    ] as string[];

    return {
      id: p.id,
      updatedAt: p.updatedAt.toISOString(),
      contentHash: hashPayload({
        product: p,
        presentation: p.presentation,
      }),
      assetHashes,
    };
  });

  const subCategoryItems = subCategories.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    updatedAt: s.updatedAt.toISOString(),
    contentHash: hashPayload({
      id: s.id,
      categoryId: s.categoryId,
      name: s.name,
      description: s.description,
      displayOrder: s.displayOrder,
      isActive: s.isActive,
      updatedAt: s.updatedAt.toISOString(),
    }),
  }));

  const manifestHash = hashPayload({
    categoryItems,
    subCategoryItems,
    productItems,
  });

  return {
    categories: categoryItems,
    subCategories: subCategoryItems,
    products: productItems,
    manifestHash,
    full: { categories, subCategories, products },
  };
}

export async function getManifest() {
  const version = await getPublishedVersion();
  if (!version.version) {
    throw new AppError("NO_CATALOGUE", "No published catalogue available", 404);
  }
  const manifest = await buildManifestData();
  return {
    version: version.version,
    publishedAt: version.publishedAt?.toISOString() ?? new Date().toISOString(),
    manifestHash: version.manifestHash ?? manifest.manifestHash,
    products: manifest.products,
    categories: manifest.categories,
  };
}

export async function getChanges(sinceVersion?: number) {
  const current = await getPublishedVersion();
  if (!current.version) {
    return { currentVersion: 0, changes: [] };
  }

  const changes = await prisma.catalogueChange.findMany({
    where: {
      catalogueVersion: {
        version: { gt: sinceVersion ?? 0, lte: current.version },
        isPublished: true,
      },
    },
    orderBy: { createdAt: "asc" },
    include: { catalogueVersion: true },
  });

  return {
    currentVersion: current.version,
    changes: changes.map((c) => ({
      id: c.id,
      version: c.catalogueVersion.version,
      entityType: c.entityType,
      entityId: c.entityId,
      changeType: c.changeType,
      summary: c.summary,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function publishCatalogue(
  userId: string,
  input: { label?: string | null; notes?: string | null },
  ip?: string,
) {
  const latest = await prisma.catalogueVersion.findFirst({
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version ?? 0) + 1;
  const manifest = await buildManifestData();

  const previousPublished = await prisma.catalogueVersion.findMany({
    where: { isPublished: true },
  });

  // Keep the publish transaction small/fast (Supabase latency + many change rows
  // was exceeding the default 5s interactive transaction timeout).
  const created = await prisma.$transaction(
    async (tx) => {
      if (previousPublished.length) {
        await tx.catalogueVersion.updateMany({
          where: { isPublished: true },
          data: { isPublished: false },
        });
      }

      return tx.catalogueVersion.create({
        data: {
          version: nextVersion,
          label: input.label ?? `Catalogue v${nextVersion}`,
          notes: input.notes ?? null,
          isPublished: true,
          publishedAt: new Date(),
          publishedById: userId,
          manifestHash: manifest.manifestHash,
        },
      });
    },
    { timeout: 20_000 },
  );

  const changeRows = [
    ...manifest.categories.map((c) => ({
      catalogueVersionId: created.id,
      entityType: "Category",
      entityId: c.id,
      changeType: "UPDATED" as const,
      summary: `Category included in catalogue v${nextVersion}`,
    })),
    ...manifest.products.map((p) => ({
      catalogueVersionId: created.id,
      entityType: "Product",
      entityId: p.id,
      changeType: "UPDATED" as const,
      summary: `Product included in catalogue v${nextVersion}`,
    })),
  ];

  if (changeRows.length) {
    // Outside the main txn so publish still succeeds if change logging is slow.
    await prisma.catalogueChange.createMany({ data: changeRows });
  }

  await logActivity({
    userId,
    action: "PUBLISHED",
    entityType: "CatalogueVersion",
    entityId: created.id,
    summary: `Published catalogue version ${created.version}`,
    ipAddress: ip,
  });

  return created;
}

export async function unpublishCatalogue(userId: string, ip?: string) {
  const current = await prisma.catalogueVersion.findFirst({
    where: { isPublished: true },
    orderBy: { version: "desc" },
  });
  if (!current) {
    throw new AppError("NO_CATALOGUE", "No published catalogue to unpublish", 404);
  }

  const updated = await prisma.catalogueVersion.update({
    where: { id: current.id },
    data: { isPublished: false },
  });

  await logActivity({
    userId,
    action: "UNPUBLISHED",
    entityType: "CatalogueVersion",
    entityId: updated.id,
    summary: `Unpublished catalogue version ${updated.version}`,
    ipAddress: ip,
  });

  return updated;
}

export async function listCatalogueAssets() {
  const manifest = await buildManifestData();
  const assets: Array<{
    entityType: string;
    entityId: string;
    url: string;
    contentHash: string | null;
    assetType: "IMAGE" | "SLIDE_ASSET";
  }> = [];

  for (const category of manifest.full.categories) {
    if (category.imageUrl) {
      assets.push({
        entityType: "Category",
        entityId: category.id,
        url: category.imageUrl,
        contentHash: category.imageHash,
        assetType: "IMAGE",
      });
    }
  }

  for (const product of manifest.full.products) {
    for (const image of product.images) {
      assets.push({
        entityType: "ProductImage",
        entityId: image.id,
        url: image.url,
        contentHash: image.contentHash,
        assetType: "IMAGE",
      });
    }
    for (const slide of product.presentation?.slides ?? []) {
      for (const [url, hash] of [
        [slide.mainImageUrl, slide.mainImageHash],
        [slide.secondaryImageUrl, slide.secondaryImageHash],
        [slide.backgroundImageUrl, slide.backgroundImageHash],
      ] as const) {
        if (url) {
          assets.push({
            entityType: "PresentationSlide",
            entityId: slide.id,
            url,
            contentHash: hash,
            assetType: "SLIDE_ASSET",
          });
        }
      }
    }
  }

  return assets;
}

export async function getProductAssets(productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      images: true,
      presentation: {
        include: {
          slides: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!product) throw new AppError("NOT_FOUND", "Product not found", 404);

  const assets = [
    ...product.images.map((image) => ({
      entityType: "ProductImage",
      entityId: image.id,
      url: image.url,
      contentHash: image.contentHash,
      assetType: "IMAGE" as const,
    })),
    ...(product.presentation?.slides.flatMap((slide) => {
      const rows = [];
      if (slide.mainImageUrl) {
        rows.push({
          entityType: "PresentationSlide",
          entityId: slide.id,
          url: slide.mainImageUrl,
          contentHash: slide.mainImageHash,
          assetType: "SLIDE_ASSET" as const,
        });
      }
      if (slide.secondaryImageUrl) {
        rows.push({
          entityType: "PresentationSlide",
          entityId: slide.id,
          url: slide.secondaryImageUrl,
          contentHash: slide.secondaryImageHash,
          assetType: "SLIDE_ASSET" as const,
        });
      }
      if (slide.backgroundImageUrl) {
        rows.push({
          entityType: "PresentationSlide",
          entityId: slide.id,
          url: slide.backgroundImageUrl,
          contentHash: slide.backgroundImageHash,
          assetType: "SLIDE_ASSET" as const,
        });
      }
      return rows;
    }) ?? []),
  ];

  return assets;
}

export async function getPublishedCataloguePayload() {
  const version = await getPublishedVersion();
  const manifest = await buildManifestData();
  return {
    version,
    categories: manifest.full.categories,
    subCategories: manifest.full.subCategories,
    products: manifest.full.products,
  };
}
