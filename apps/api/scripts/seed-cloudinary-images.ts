/**
 * Upload generated catalogue images to Cloudinary and attach them to demo products/categories.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx scripts/seed-cloudinary-images.ts
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const prisma = new PrismaClient();

const assetsRoot = resolve(
  process.cwd(),
  "../../..",
  ".cursor/projects/c-Users-i-OneDrive-Desktop-MR-Presentation/assets",
);

// Fallback if relative path differs depending on cwd
const assetsCandidates = [
  assetsRoot,
  resolve(
    "C:/Users/i/.cursor/projects/c-Users-i-OneDrive-Desktop-MR-Presentation/assets",
  ),
];

type UploadItem = {
  file: string;
  kind: "product" | "category";
  match: string; // sku or category name
};

const items: UploadItem[] = [
  { file: "democardio-product.jpg", kind: "product", match: "DEMO-TAB-001" },
  { file: "demovita-syrup.jpg", kind: "product", match: "DEMO-SYR-001" },
  { file: "demonutri-caps.jpg", kind: "product", match: "DEMO-NUT-001" },
  { file: "category-tablets.jpg", kind: "category", match: "Tablets" },
  { file: "category-syrups.jpg", kind: "category", match: "Syrups" },
  {
    file: "category-supplements.jpg",
    kind: "category",
    match: "Nutritional Supplements",
  },
];

function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function findAssetPath(fileName: string): Promise<string> {
  const { access } = await import("node:fs/promises");
  for (const dir of assetsCandidates) {
    const full = resolve(dir, fileName);
    try {
      await access(full);
      return full;
    } catch {
      // try next
    }
  }
  throw new Error(`Asset not found: ${fileName}`);
}

async function uploadToCloudinary(filePath: string, publicId: string) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: process.env.CLOUDINARY_FOLDER || "pharma-catalogue",
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
  };
}

async function main() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials missing in env");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  console.log("Uploading catalogue images to Cloudinary...");

  for (const item of items) {
    const filePath = await findAssetPath(item.file);
    const buffer = await readFile(filePath);
    const contentHash = hashBuffer(buffer);
    const publicId = `demo/${item.kind}-${item.match}`
      .toLowerCase()
      .replace(/[^a-z0-9/_-]+/g, "-");

    const uploaded = await uploadToCloudinary(filePath, publicId);
    console.log(`Uploaded ${item.file} -> ${uploaded.url}`);

    if (item.kind === "product") {
      const product = await prisma.product.findFirst({
        where: { sku: item.match, deletedAt: null },
      });
      if (!product) {
        console.warn(`Product not found for SKU ${item.match}`);
        continue;
      }

      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: uploaded.url,
          publicId: uploaded.publicId,
          contentHash,
          altText: `${product.name} product image`,
          displayOrder: 0,
          isPrimary: true,
        },
      });

      // Also set as main image on first intro slide if presentation exists
      const presentation = await prisma.presentation.findFirst({
        where: { productId: product.id, deletedAt: null },
        include: {
          slides: {
            where: { deletedAt: null },
            orderBy: { displayOrder: "asc" },
            take: 1,
          },
        },
      });
      const firstSlide = presentation?.slides[0];
      if (firstSlide) {
        await prisma.presentationSlide.update({
          where: { id: firstSlide.id },
          data: {
            mainImageUrl: uploaded.url,
            mainImageHash: contentHash,
          },
        });
      }

      // Mark product published where appropriate so mobile can see it
      if (product.status === "DRAFT" && product.sku !== "DEMO-NUT-001") {
        await prisma.product.update({
          where: { id: product.id },
          data: { status: "PUBLISHED" },
        });
      }
    } else {
      const category = await prisma.category.findFirst({
        where: { name: item.match, deletedAt: null },
      });
      if (!category) {
        console.warn(`Category not found: ${item.match}`);
        continue;
      }
      await prisma.category.update({
        where: { id: category.id },
        data: {
          imageUrl: uploaded.url,
          imageHash: contentHash,
        },
      });
    }
  }

  // Publish DemoNutri as well for richer catalogue experience
  await prisma.product.updateMany({
    where: { sku: "DEMO-NUT-001", deletedAt: null },
    data: { status: "PUBLISHED", featured: true },
  });
  const nutri = await prisma.product.findFirst({
    where: { sku: "DEMO-NUT-001" },
    include: { presentation: true },
  });
  if (nutri?.presentation) {
    await prisma.presentation.update({
      where: { id: nutri.presentation.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  // Bump catalogue version so mobile can sync
  const latest = await prisma.catalogueVersion.findFirst({
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version ?? 0) + 1;
  await prisma.catalogueVersion.updateMany({
    where: { isPublished: true },
    data: { isPublished: false },
  });
  await prisma.catalogueVersion.create({
    data: {
      version: nextVersion,
      label: `Demo images catalogue v${nextVersion}`,
      notes: "Seeded Cloudinary product/category images for demo experience",
      isPublished: true,
      publishedAt: new Date(),
      manifestHash: `cloudinary-demo-v${nextVersion}`,
    },
  });

  console.log(`Catalogue published as v${nextVersion}`);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
