import { PrismaClient, PublicationStatus, RoleName } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const SUBCATEGORIES = [
  "Women Care",
  "Child Care",
  "Skin Care",
  "Hair Care",
  "Digestive Care",
] as const;

type CatalogueDef = {
  name: string;
  description: string;
  displayOrder: number;
  code: string;
  products: Record<(typeof SUBCATEGORIES)[number], string[]>;
};

const CATALOGUE: CatalogueDef[] = [
  {
    name: "Allopathy",
    description: "Modern pharmaceutical medicines",
    displayOrder: 1,
    code: "ALL",
    products: {
      "Women Care": [
        "Folic Acid Tablets",
        "Ferrous Ascorbate + Folic Acid",
        "Calcium + Vitamin D3",
      ],
      "Child Care": [
        "ORS Powder Sachets",
        "Zinc Sulphate Oral Solution",
        "Paracetamol Suspension",
      ],
      "Skin Care": [
        "Clotrimazole Cream",
        "Calamine Lotion",
        "Ketoconazole Cream",
      ],
      "Hair Care": [
        "Ketoconazole Shampoo",
        "Minoxidil Topical Solution",
        "Biotin Tablets",
      ],
      "Digestive Care": [
        "Pantoprazole Tablets",
        "Lactulose Solution",
        "Simethicone Drops",
      ],
    },
  },
  {
    name: "Homeopathy",
    description: "Homeopathic remedies catalogue",
    displayOrder: 2,
    code: "HOM",
    products: {
      "Women Care": ["Sepia", "Pulsatilla", "Calcarea Carbonica"],
      "Child Care": ["Chamomilla", "Cina", "Calcarea Phosphorica"],
      "Skin Care": ["Sulphur", "Graphites", "Calendula Ointment"],
      "Hair Care": ["Silicea", "Fluoricum Acidum", "Phosphorus"],
      "Digestive Care": ["Nux Vomica", "Lycopodium", "Carbo Vegetabilis"],
    },
  },
  {
    name: "Ayurveda",
    description: "Traditional Ayurvedic products",
    displayOrder: 3,
    code: "AYU",
    products: {
      "Women Care": [
        "Shatavari Capsules",
        "Ashoka Tablets",
        "Dashmool Churna",
      ],
      "Child Care": [
        "Bala Churna",
        "Brahmi Syrup",
        "Children's Herbal Nutrition Churna",
      ],
      "Skin Care": ["Neem Capsules", "Manjistha Tablets", "Kumkumadi Tailam"],
      "Hair Care": [
        "Bhringraj Hair Oil",
        "Amla Capsules",
        "Bringadi Hair Oil",
      ],
      "Digestive Care": [
        "Triphala Churna",
        "Avipattikar Churna",
        "Hingwashtak Churna",
      ],
    },
  },
  {
    name: "Unani",
    description: "Traditional Unani formulations",
    displayOrder: 4,
    code: "UNA",
    products: {
      "Women Care": [
        "Majoon-e-Muqawwi-e-Rahem",
        "Sharbat-e-Faulad",
        "Majoon-e-Arad Khurma",
      ],
      "Child Care": [
        "Unani Children's Herbal Syrup (Demo)",
        "Herbal Powder (Demo)",
        "Child Nutrition Compound (Demo)",
      ],
      "Skin Care": [
        "Marham-e-Quba",
        "Zuroor-e-Qula",
        "Neem-Sandal Ointment (Demo)",
      ],
      "Hair Care": [
        "Unani Amla Hair Oil (Demo)",
        "Herbal Hair Oil (Demo)",
        "Hair Care Compound (Demo)",
      ],
      "Digestive Care": [
        "Jawarish-e-Amla Sada",
        "Jawarish-e-Jalinoos",
        "Safoof-e-Hazim",
      ],
    },
  },
  {
    name: "Nutraceuticals & Supplements",
    description: "Nutrition and wellness products",
    displayOrder: 5,
    code: "NUT",
    products: {
      "Women Care": [
        "Women's Multivitamin",
        "Iron + Folate Supplement",
        "Calcium + Vitamin D3",
      ],
      "Child Care": [
        "Children's Multivitamin Syrup",
        "Vitamin D3 Drops",
        "DHA Omega-3",
      ],
      "Skin Care": [
        "Collagen Peptides",
        "Vitamin C + Zinc",
        "Antioxidant Blend",
      ],
      "Hair Care": ["Biotin Capsules", "Zinc + Selenium", "Omega-3 Softgels"],
      "Digestive Care": [
        "Probiotic Capsules",
        "Prebiotic Fibre Powder",
        "Digestive Enzyme Capsules",
      ],
    },
  },
];

function skuCode(categoryCode: string, subName: string, index: number): string {
  const sub = subName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 3);
  return `${categoryCode}-${sub}-${String(index + 1).padStart(3, "0")}`;
}

async function clearCatalogueData() {
  console.log("Clearing old catalogue data...");

  await prisma.presentationSlide.deleteMany({});
  await prisma.presentation.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.subCategory.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.catalogueChange.deleteMany({});
  await prisma.catalogueVersion.deleteMany({});

  console.log("Old categories, subcategories, and products removed.");
}

async function main() {
  console.log("Seeding Pharma Digital Catalogue...");

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: {
      name: RoleName.ADMIN,
      description: "Administrator with full CMS access",
    },
  });

  const mobileRole = await prisma.role.upsert({
    where: { name: RoleName.MOBILE_USER },
    update: {},
    create: {
      name: RoleName.MOBILE_USER,
      description: "Medical Representative mobile app user",
    },
  });

  const adminPassword = await argon2.hash("Admin@12345", {
    type: argon2.argon2id,
  });
  const mrPassword = await argon2.hash("Mobile@12345", {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@pharma.demo" },
    update: {},
    create: {
      email: "admin@pharma.demo",
      username: "admin",
      fullName: "Demo Admin",
      passwordHash: adminPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "mr@pharma.demo" },
    update: {},
    create: {
      email: "mr@pharma.demo",
      username: "mr.demo",
      fullName: "Demo Medical Rep",
      passwordHash: mrPassword,
      roleId: mobileRole.id,
      isActive: true,
    },
  });

  await clearCatalogueData();

  let productCount = 0;
  let displayOrder = 0;

  for (const catDef of CATALOGUE) {
    const category = await prisma.category.create({
      data: {
        name: catDef.name,
        description: catDef.description,
        displayOrder: catDef.displayOrder,
        isActive: true,
      },
    });

    for (let s = 0; s < SUBCATEGORIES.length; s++) {
      const subName = SUBCATEGORIES[s];
      const subCategory = await prisma.subCategory.create({
        data: {
          categoryId: category.id,
          name: subName,
          description: `${subName} under ${catDef.name}`,
          displayOrder: s + 1,
          isActive: true,
        },
      });

      const names = catDef.products[subName];
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const sku = skuCode(catDef.code, subName, productCount);
        displayOrder += 1;
        productCount += 1;

        const product = await prisma.product.create({
          data: {
            name,
            brandName: name,
            genericName: null,
            sku,
            categoryId: category.id,
            subCategoryId: subCategory.id,
            description: `${catDef.name} · ${subName}`,
            status: PublicationStatus.PUBLISHED,
            featured: i === 0 && s === 0,
            displayOrder,
          },
        });

        // Empty presentation shell — images will be uploaded manually in admin
        await prisma.presentation.create({
          data: {
            productId: product.id,
            title: `${name} Visual Aid`,
            status: PublicationStatus.DRAFT,
            version: 0,
          },
        });
      }
    }
  }

  await prisma.catalogueVersion.create({
    data: {
      version: 1,
      label: "Main categories catalogue",
      notes:
        "Allopathy, Homeopathy, Ayurveda, Unani, Nutraceuticals — images to be uploaded in admin",
      isPublished: true,
      publishedAt: new Date(),
      publishedById: admin.id,
      manifestHash: "main-catalogue-v1",
      changes: {
        create: [
          {
            entityType: "Catalogue",
            entityId: admin.id,
            changeType: "CREATED",
            summary: `Seeded ${productCount} products across 5 categories`,
          },
        ],
      },
    },
  });

  console.log("Seed complete.");
  console.log(`Categories: ${CATALOGUE.length}`);
  console.log(`Subcategories per category: ${SUBCATEGORIES.length}`);
  console.log(`Products: ${productCount}`);
  console.log("Admin: admin@pharma.demo / Admin@12345");
  console.log("Mobile: mr@pharma.demo / Mobile@12345");
  console.log("Product images: upload manually in Admin → Products → Image slider");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
