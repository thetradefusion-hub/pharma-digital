import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tablets = await prisma.category.findFirst({ where: { name: "Tablets" } });
  const syrups = await prisma.category.findFirst({ where: { name: "Syrups" } });
  const supp = await prisma.category.findFirst({
    where: { name: "Nutritional Supplements" },
  });
  if (!tablets || !syrups || !supp) throw new Error("Categories missing");

  const cardio = await prisma.subCategory.findFirst({
    where: { categoryId: tablets.id, name: "Cardiac", deletedAt: null },
  });
  const adult = await prisma.subCategory.findFirst({
    where: { categoryId: syrups.id, name: "Adult", deletedAt: null },
  });
  const vit = await prisma.subCategory.findFirst({
    where: { categoryId: supp.id, name: "Vitamins", deletedAt: null },
  });
  if (!cardio || !adult || !vit) throw new Error("Subcategories missing — run seed");

  await prisma.product.updateMany({
    where: { sku: "DEMO-TAB-001" },
    data: { subCategoryId: cardio.id, status: "PUBLISHED" },
  });
  await prisma.product.updateMany({
    where: { sku: "DEMO-SYR-001" },
    data: { subCategoryId: adult.id, status: "PUBLISHED" },
  });
  await prisma.product.updateMany({
    where: { sku: "DEMO-NUT-001" },
    data: { subCategoryId: vit.id, status: "PUBLISHED", featured: true },
  });

  console.log({
    subCategories: await prisma.subCategory.count({ where: { deletedAt: null } }),
    withSub: await prisma.product.count({
      where: { subCategoryId: { not: null }, deletedAt: null },
    }),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
