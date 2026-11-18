import type {
  Category,
  Presentation,
  PresentationSlide,
  Product,
  ProductImage,
  SlideContent,
  SubCategory,
} from "@pharma/shared-types";
import { getDatabase } from "./database";
import { SYNC_KEYS } from "./schema";

export interface LocalProductRow extends Product {
  primaryLocalUri?: string | null;
  categoryName?: string | null;
  subCategoryName?: string | null;
}

export interface SyncStatus {
  catalogueVersion: number | null;
  manifestHash: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: "idle" | "syncing" | "success" | "error" | null;
  lastSyncError: string | null;
  productCount: number;
  categoryCount: number;
}

function bool(n: number | null | undefined): boolean {
  return Boolean(n);
}

/** Drop ephemeral blob:/web-* URIs that break after refresh; keep http(s) remotes. */
function resolveMediaUri(
  localUri: string | null | undefined,
  remoteUrl: string | null | undefined,
): string | null {
  const local = localUri?.trim() || null;
  const remote = remoteUrl?.trim() || null;
  if (local && /^https?:\/\//i.test(local)) return local;
  if (local && !local.startsWith("blob:") && !local.startsWith("web-")) {
    return local;
  }
  return remote;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM local_sync_metadata WHERE key = ?`,
    [key],
  );
  return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO local_sync_metadata (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now],
  );
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const db = await getDatabase();
  const [version, hash, lastSyncAt, lastSyncStatus, lastSyncError] =
    await Promise.all([
      getSyncMeta(SYNC_KEYS.catalogueVersion),
      getSyncMeta(SYNC_KEYS.manifestHash),
      getSyncMeta(SYNC_KEYS.lastSyncAt),
      getSyncMeta(SYNC_KEYS.lastSyncStatus),
      getSyncMeta(SYNC_KEYS.lastSyncError),
    ]);

  const productCount =
    (
      await db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM local_products`,
      )
    )?.c ?? 0;
  const categoryCount =
    (
      await db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM local_categories`,
      )
    )?.c ?? 0;

  return {
    catalogueVersion: version ? Number(version) : null,
    manifestHash: hash,
    lastSyncAt,
    lastSyncStatus: (lastSyncStatus as SyncStatus["lastSyncStatus"]) ?? null,
    lastSyncError,
    productCount,
    categoryCount,
  };
}

export type CategoryWithCounts = Category & {
  productCount: number;
  subCategoryCount: number;
};

export async function listLocalCategories(): Promise<CategoryWithCounts[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    image_hash: string | null;
    local_image_uri: string | null;
    display_order: number;
    is_active: number;
    updated_at: string;
    product_count: number;
    sub_category_count: number;
  }>(
    `SELECT c.*,
      (SELECT COUNT(*) FROM local_products p
        WHERE p.category_id = c.id AND p.status = 'PUBLISHED') AS product_count,
      (SELECT COUNT(*) FROM local_subcategories s
        WHERE s.category_id = c.id AND s.is_active = 1) AS sub_category_count
     FROM local_categories c
     WHERE c.is_active = 1
     ORDER BY c.display_order ASC, c.name ASC`,
  );

  return rows.map(
    (r: {
      id: string;
      name: string;
      description: string | null;
      image_url: string | null;
      image_hash: string | null;
      local_image_uri: string | null;
      display_order: number;
      is_active: number;
      updated_at: string;
      product_count: number;
      sub_category_count: number;
    }) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: resolveMediaUri(r.local_image_uri, r.image_url),
      imageHash: r.image_hash,
      displayOrder: r.display_order,
      isActive: bool(r.is_active),
      createdAt: r.updated_at,
      updatedAt: r.updated_at,
      productCount: Number(r.product_count) || 0,
      subCategoryCount: Number(r.sub_category_count) || 0,
    }),
  );
}

export async function listLocalSubCategories(
  categoryId: string,
): Promise<SubCategory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    display_order: number;
    is_active: number;
    updated_at: string;
  }>(
    `SELECT * FROM local_subcategories
     WHERE category_id = ? AND is_active = 1
     ORDER BY display_order ASC, name ASC`,
    [categoryId],
  );

  return rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    displayOrder: r.display_order,
    isActive: bool(r.is_active),
    createdAt: r.updated_at,
    updatedAt: r.updated_at,
  }));
}

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  featured?: boolean;
  sortBy?: "name" | "brandName" | "updatedAt" | "displayOrder";
  sortOrder?: "asc" | "desc";
}

export async function listLocalProducts(
  query: ProductQuery = {},
): Promise<LocalProductRow[]> {
  const db = await getDatabase();
  const clauses: string[] = [`p.status = 'PUBLISHED'`];
  const params: (string | number)[] = [];

  if (query.categoryId) {
    clauses.push(`p.category_id = ?`);
    params.push(query.categoryId);
  }
  if (query.featured) {
    clauses.push(`p.featured = 1`);
  }
  if (query.search?.trim()) {
    clauses.push(
      `(p.name LIKE ? OR p.brand_name LIKE ? OR p.generic_name LIKE ? OR p.sku LIKE ? OR IFNULL(p.composition,'') LIKE ?)`,
    );
    const like = `%${query.search.trim()}%`;
    params.push(like, like, like, like, like);
  }

  const sortMap: Record<string, string> = {
    name: "p.name",
    brandName: "p.brand_name",
    updatedAt: "p.updated_at",
    displayOrder: "p.display_order",
  };
  const sortCol = sortMap[query.sortBy ?? "displayOrder"] ?? "p.display_order";
  const sortDir = query.sortOrder === "desc" ? "DESC" : "ASC";

  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    brand_name: string;
    generic_name: string | null;
    sku: string;
    category_id: string;
    composition: string | null;
    strength: string | null;
    dosage_form: string | null;
    pack_size: string | null;
    description: string | null;
    approved_indications: string | null;
    key_information: string | null;
    highlights: string | null;
    prescribing_info: string | null;
    precautions: string | null;
    storage_instructions: string | null;
    display_order: number;
    status: Product["status"];
    featured: number;
    updated_at: string;
    category_name: string | null;
    sub_category_id: string | null;
    sub_category_name: string | null;
    primary_local_uri: string | null;
    primary_remote_url: string | null;
  }>(
    `SELECT p.*,
            c.name as category_name,
            p.sub_category_id as sub_category_id,
            sc.name as sub_category_name,
            (
              SELECT i.local_uri
              FROM local_product_images i
              WHERE i.product_id = p.id
              ORDER BY i.is_primary DESC, i.display_order ASC
              LIMIT 1
            ) as primary_local_uri,
            (
              SELECT i.remote_url
              FROM local_product_images i
              WHERE i.product_id = p.id
              ORDER BY i.is_primary DESC, i.display_order ASC
              LIMIT 1
            ) as primary_remote_url
     FROM local_products p
     LEFT JOIN local_categories c ON c.id = p.category_id
     LEFT JOIN local_subcategories sc ON sc.id = p.sub_category_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY ${sortCol} ${sortDir}, p.name ASC`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brandName: r.brand_name,
    genericName: r.generic_name,
    sku: r.sku,
    categoryId: r.category_id,
    subCategoryId: r.sub_category_id ?? null,
    subCategoryName: r.sub_category_name ?? null,
    composition: r.composition,
    strength: r.strength,
    dosageForm: r.dosage_form,
    packSize: r.pack_size,
    description: r.description,
    approvedIndications: r.approved_indications,
    keyInformation: r.key_information,
    highlights: r.highlights,
    prescribingInfo: r.prescribing_info,
    precautions: r.precautions,
    storageInstructions: r.storage_instructions,
    displayOrder: r.display_order,
    status: r.status,
    featured: bool(r.featured),
    createdAt: r.updated_at,
    updatedAt: r.updated_at,
    categoryName: r.category_name,
    primaryLocalUri: resolveMediaUri(r.primary_local_uri, r.primary_remote_url),
    category: r.category_name
      ? {
          id: r.category_id,
          name: r.category_name,
          description: null,
          imageUrl: null,
          imageHash: null,
          displayOrder: 0,
          isActive: true,
          createdAt: r.updated_at,
          updatedAt: r.updated_at,
        }
      : undefined,
  }));
}

export async function listLocalProductsWithImages(
  query: ProductQuery = {},
): Promise<LocalProductRow[]> {
  const products = await listLocalProducts(query);
  const enriched: LocalProductRow[] = [];
  for (const product of products) {
    const full = await getLocalProduct(product.id);
    enriched.push(full ?? product);
  }
  return enriched;
}

export async function getLocalProductsByIds(
  ids: string[],
): Promise<LocalProductRow[]> {
  const out: LocalProductRow[] = [];
  for (const id of ids) {
    const product = await getLocalProduct(id);
    if (product) out.push(product);
  }
  return out;
}

export async function getLocalProduct(id: string): Promise<LocalProductRow | null> {
  const products = await listLocalProducts({});
  const found = products.find((p) => p.id === id);
  if (!found) return null;

  const db = await getDatabase();
  const images = await db.getAllAsync<{
    id: string;
    product_id: string;
    remote_url: string;
    content_hash: string | null;
    local_uri: string | null;
    alt_text: string | null;
    display_order: number;
    is_primary: number;
  }>(
    `SELECT * FROM local_product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC`,
    [id],
  );

  found.images = images.map(
    (img): ProductImage => ({
      id: img.id,
      productId: img.product_id,
      url: resolveMediaUri(img.local_uri, img.remote_url) ?? img.remote_url,
      publicId: null,
      contentHash: img.content_hash,
      altText: img.alt_text,
      displayOrder: img.display_order,
      isPrimary: bool(img.is_primary),
    }),
  );

  return found;
}

export async function getLocalPresentation(
  productId: string,
): Promise<(Presentation & { slides: PresentationSlide[] }) | null> {
  const db = await getDatabase();
  const pres = await db.getFirstAsync<{
    id: string;
    product_id: string;
    title: string;
    status: Presentation["status"];
    version: number;
    published_at: string | null;
  }>(`SELECT * FROM local_presentations WHERE product_id = ?`, [productId]);

  if (!pres) return null;

  const slides = await db.getAllAsync<{
    id: string;
    presentation_id: string;
    title: string;
    subtitle: string | null;
    slide_type: PresentationSlide["slideType"];
    background_color: string | null;
    background_image_url: string | null;
    background_image_hash: string | null;
    background_local_uri: string | null;
    main_image_url: string | null;
    main_image_hash: string | null;
    main_local_uri: string | null;
    secondary_image_url: string | null;
    secondary_image_hash: string | null;
    secondary_local_uri: string | null;
    description: string | null;
    bullet_points: string;
    highlight_text: string | null;
    content_json: string | null;
    display_order: number;
    is_active: number;
  }>(
    `SELECT * FROM local_slides
     WHERE presentation_id = ? AND is_active = 1
     ORDER BY display_order ASC`,
    [pres.id],
  );

  return {
    id: pres.id,
    productId: pres.product_id,
    title: pres.title,
    status: pres.status,
    version: pres.version,
    publishedAt: pres.published_at,
    slides: slides.map((s) => ({
      id: s.id,
      presentationId: s.presentation_id,
      title: s.title,
      subtitle: s.subtitle,
      slideType: s.slide_type,
      backgroundColor: s.background_color,
      backgroundImageUrl: resolveMediaUri(
        s.background_local_uri,
        s.background_image_url,
      ),
      backgroundImageHash: s.background_image_hash,
      mainImageUrl: resolveMediaUri(s.main_local_uri, s.main_image_url),
      mainImageHash: s.main_image_hash,
      secondaryImageUrl: resolveMediaUri(
        s.secondary_local_uri,
        s.secondary_image_url,
      ),
      secondaryImageHash: s.secondary_image_hash,
      description: s.description,
      bulletPoints: parseJson<string[]>(s.bullet_points, []),
      highlightText: s.highlight_text,
      content: parseJson<SlideContent | null>(s.content_json, null),
      displayOrder: s.display_order,
      isActive: bool(s.is_active),
    })),
  };
}

export type DownloadStatus =
  | "queued"
  | "downloading"
  | "completed"
  | "failed"
  | "removed";

export interface LocalDownload {
  id: string;
  entityType: "product" | "catalogue";
  entityId: string;
  label: string;
  status: DownloadStatus;
  progress: number;
  bytesTotal: number | null;
  bytesDone: number | null;
  errorMessage: string | null;
  localPath: string | null;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listDownloads(): Promise<LocalDownload[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    entity_type: "product" | "catalogue";
    entity_id: string;
    label: string;
    status: DownloadStatus;
    progress: number;
    bytes_total: number | null;
    bytes_done: number | null;
    error_message: string | null;
    local_path: string | null;
    content_hash: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM local_downloads WHERE status != 'removed' ORDER BY updated_at DESC`,
  );

  return rows.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    label: r.label,
    status: r.status,
    progress: r.progress,
    bytesTotal: r.bytes_total,
    bytesDone: r.bytes_done,
    errorMessage: r.error_message,
    localPath: r.local_path,
    contentHash: r.content_hash,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertDownload(
  download: Omit<LocalDownload, "createdAt" | "updatedAt"> & {
    createdAt?: string;
  },
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO local_downloads (
      id, entity_type, entity_id, label, status, progress,
      bytes_total, bytes_done, error_message, local_path, content_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET
      label = excluded.label,
      status = excluded.status,
      progress = excluded.progress,
      bytes_total = excluded.bytes_total,
      bytes_done = excluded.bytes_done,
      error_message = excluded.error_message,
      local_path = excluded.local_path,
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at`,
    [
      download.id,
      download.entityType,
      download.entityId,
      download.label,
      download.status,
      download.progress,
      download.bytesTotal,
      download.bytesDone,
      download.errorMessage,
      download.localPath,
      download.contentHash,
      download.createdAt ?? now,
      now,
    ],
  );
}

export async function removeDownloadRecord(
  entityType: string,
  entityId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE local_downloads SET status = 'removed', progress = 0, updated_at = ? WHERE entity_type = ? AND entity_id = ?`,
    [new Date().toISOString(), entityType, entityId],
  );
}

export async function isProductDownloaded(productId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ status: string }>(
    `SELECT status FROM local_downloads WHERE entity_type = 'product' AND entity_id = ?`,
    [productId],
  );
  return row?.status === "completed";
}
