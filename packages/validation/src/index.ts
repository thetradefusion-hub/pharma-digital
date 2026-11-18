import { z } from "zod";

export const roleNameSchema = z.enum(["ADMIN", "MOBILE_USER"]);
export const publicationStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const slideTypeSchema = z.enum([
  "IMAGE",
  "PRODUCT_INTRO",
  "COMPOSITION",
  "PRODUCT_INFO",
  "BENEFITS",
  "INFOGRAPHIC",
  "CUSTOM",
  "PRESCRIBING_INFO",
]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  imageHash: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const subCategoryCreateSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const subCategoryUpdateSchema = subCategoryCreateSchema
  .omit({ categoryId: true })
  .partial();

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brandName: z.string().trim().min(1).max(200),
  genericName: z.string().trim().max(200).optional().nullable(),
  sku: z.string().trim().min(1).max(80),
  categoryId: z.string().uuid(),
  subCategoryId: z.string().uuid().optional().nullable(),
  composition: z.string().trim().max(5000).optional().nullable(),
  strength: z.string().trim().max(200).optional().nullable(),
  dosageForm: z.string().trim().max(120).optional().nullable(),
  packSize: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(10000).optional().nullable(),
  approvedIndications: z.string().trim().max(10000).optional().nullable(),
  keyInformation: z.string().trim().max(10000).optional().nullable(),
  highlights: z.string().trim().max(10000).optional().nullable(),
  prescribingInfo: z.string().trim().max(20000).optional().nullable(),
  precautions: z.string().trim().max(10000).optional().nullable(),
  storageInstructions: z.string().trim().max(5000).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  status: publicationStatusSchema.default("DRAFT"),
  featured: z.boolean().default(false),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  status: publicationStatusSchema.optional(),
  featured: z.coerce.boolean().optional(),
  recentlyUpdated: z.coerce.boolean().optional(),
});

export const slideContentSchema = z
  .object({
    layout: z.string().optional(),
    sections: z
      .array(
        z.object({
          title: z.string().optional(),
          body: z.string().optional(),
          items: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    customFields: z.record(z.string()).optional(),
  })
  .nullable()
  .optional();

export const slideCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).optional().nullable(),
  slideType: slideTypeSchema,
  backgroundColor: z.string().trim().max(40).optional().nullable(),
  backgroundImageUrl: z.string().url().optional().nullable(),
  backgroundImageHash: z.string().optional().nullable(),
  mainImageUrl: z.string().url().optional().nullable(),
  mainImageHash: z.string().optional().nullable(),
  secondaryImageUrl: z.string().url().optional().nullable(),
  secondaryImageHash: z.string().optional().nullable(),
  description: z.string().trim().max(10000).optional().nullable(),
  bulletPoints: z.array(z.string().trim().max(500)).max(30).default([]),
  highlightText: z.string().trim().max(1000).optional().nullable(),
  content: slideContentSchema,
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const slideUpdateSchema = slideCreateSchema.partial();

export const slideReorderSchema = z.object({
  slideIds: z.array(z.string().uuid()).min(1),
});

export const presentationUpsertSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: publicationStatusSchema.optional(),
});

export const cataloguePublishSchema = z.object({
  label: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3).max(60),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  role: roleNameSchema.default("MOBILE_USER"),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().trim().min(3).max(60).optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
  role: roleNameSchema.optional(),
  isActive: z.boolean().optional(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export const imageReorderSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type SubCategoryCreateInput = z.infer<typeof subCategoryCreateSchema>;
export type SubCategoryUpdateInput = z.infer<typeof subCategoryUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type SlideCreateInput = z.infer<typeof slideCreateSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
