export type RoleName = "ADMIN" | "MOBILE_USER";

export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type SlideType =
  | "IMAGE"
  | "PRODUCT_INTRO"
  | "COMPOSITION"
  | "PRODUCT_INFO"
  | "BENEFITS"
  | "INFOGRAPHIC"
  | "CUSTOM"
  | "PRESCRIBING_INFO";

export type ChangeType = "CREATED" | "UPDATED" | "DELETED";

export type ActivityAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "LOGIN"
  | "STATUS_CHANGED"
  | "PASSWORD_RESET";

export type AssetType = "IMAGE" | "SLIDE_ASSET" | "OTHER";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: RoleName;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageHash: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subCategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  publicId: string | null;
  contentHash: string | null;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  brandName: string;
  genericName: string | null;
  sku: string;
  categoryId: string;
  category?: Category;
  subCategoryId: string | null;
  subCategory?: SubCategory | null;
  composition: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  description: string | null;
  approvedIndications: string | null;
  keyInformation: string | null;
  highlights: string | null;
  prescribingInfo: string | null;
  precautions: string | null;
  storageInstructions: string | null;
  displayOrder: number;
  status: PublicationStatus;
  featured: boolean;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface SlideContent {
  layout?: string;
  sections?: Array<{ title?: string; body?: string; items?: string[] }>;
  customFields?: Record<string, string>;
}

export interface PresentationSlide {
  id: string;
  presentationId: string;
  title: string;
  subtitle: string | null;
  slideType: SlideType;
  backgroundColor: string | null;
  backgroundImageUrl: string | null;
  backgroundImageHash: string | null;
  mainImageUrl: string | null;
  mainImageHash: string | null;
  secondaryImageUrl: string | null;
  secondaryImageHash: string | null;
  description: string | null;
  bulletPoints: string[];
  highlightText: string | null;
  content: SlideContent | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Presentation {
  id: string;
  productId: string;
  title: string;
  status: PublicationStatus;
  version: number;
  publishedAt: string | null;
  slides?: PresentationSlide[];
}

export interface CatalogueVersionInfo {
  id: string;
  version: number;
  label: string | null;
  notes: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  manifestHash: string | null;
}

export interface CatalogueManifestProduct {
  id: string;
  updatedAt: string;
  contentHash: string;
  assetHashes: string[];
}

export interface CatalogueManifest {
  version: number;
  publishedAt: string;
  manifestHash: string;
  products: CatalogueManifestProduct[];
  categories: Array<{ id: string; updatedAt: string; contentHash: string }>;
}

export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  totalCategories: number;
  totalSubCategories: number;
  productsWithoutImages: number;
  totalMobileUsers: number;
}

export interface DashboardCharts {
  recentlyUpdatedProducts: Array<{
    id: string;
    name: string;
    brandName: string;
    status: PublicationStatus;
    imageCount: number;
    updatedAt: string;
  }>;
  productsNeedingImages: Array<{
    id: string;
    name: string;
    brandName: string;
  }>;
}

export interface ActivityLogItem {
  id: string;
  action: ActivityAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
}

export const SLIDE_TYPES: SlideType[] = [
  "IMAGE",
  "PRODUCT_INTRO",
  "COMPOSITION",
  "PRODUCT_INFO",
  "BENEFITS",
  "INFOGRAPHIC",
  "CUSTOM",
  "PRESCRIBING_INFO",
];

export const PUBLICATION_STATUSES: PublicationStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];
