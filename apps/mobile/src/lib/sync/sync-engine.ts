import type {
  Category,
  Presentation,
  Product,
  ProductImage,
  SubCategory,
} from "@pharma/shared-types";
import { Platform } from "react-native";
import { api } from "../api";
import { getDatabase } from "../db/database";
import {
  getSyncMeta,
  getSyncStatus,
  setSyncMeta,
  upsertDownload,
} from "../db/catalogue-repo";
import { SYNC_KEYS } from "../db/schema";
import {
  clearStagingAssets,
  commitStagedAsset,
  downloadAssetToStaging,
  ensureAssetDirs,
  getCommittedAssetIfExists,
} from "../fs/assets";

export type SyncProgressEvent = {
  phase:
    | "checking"
    | "fetching"
    | "downloading_assets"
    | "committing"
    | "done"
    | "error";
  message: string;
  progress: number;
};

type ProgressCb = (event: SyncProgressEvent) => void;

interface AssetJob {
  url: string;
  hashOrId: string;
  kind: "category" | "product_image";
  refId: string;
}

const ASSET_CONCURRENCY = 3;

async function clearStagingTables(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM staging_slides;
    DELETE FROM staging_presentations;
    DELETE FROM staging_product_images;
    DELETE FROM staging_products;
    DELETE FROM staging_subcategories;
    DELETE FROM staging_categories;
  `);
}

/** Only offline-critical assets: category thumbs + product slide images. */
function collectOfflineAssets(
  categories: Category[],
  products: Product[],
): AssetJob[] {
  const jobs: AssetJob[] = [];

  for (const cat of categories) {
    if (cat.imageUrl) {
      jobs.push({
        url: cat.imageUrl,
        hashOrId: cat.imageHash ?? `cat_${cat.id}`,
        kind: "category",
        refId: cat.id,
      });
    }
  }

  for (const product of products) {
    if (product.status !== "PUBLISHED") continue;
    for (const img of product.images ?? []) {
      if (img.url) {
        jobs.push({
          url: img.url,
          hashOrId: img.contentHash ?? `img_${img.id}`,
          kind: "product_image",
          refId: img.id,
        });
      }
    }
  }

  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.hashOrId}|${j.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Reuse URIs already stored in SQLite from a previous sync. */
async function loadCachedAssetUris(): Promise<Map<string, string>> {
  const db = await getDatabase();
  const map = new Map<string, string>();

  const categories = await db.getAllAsync<{
    image_hash: string | null;
    image_url: string | null;
    local_image_uri: string | null;
    id: string;
  }>(
    `SELECT id, image_hash, image_url, local_image_uri FROM local_categories
     WHERE local_image_uri IS NOT NULL AND image_url IS NOT NULL`,
  );
  for (const row of categories) {
    if (!row.image_url || !row.local_image_uri) continue;
    const hash = row.image_hash ?? `cat_${row.id}`;
    map.set(`${hash}|${row.image_url}`, row.local_image_uri);
  }

  const images = await db.getAllAsync<{
    id: string;
    content_hash: string | null;
    remote_url: string;
    local_uri: string | null;
  }>(
    `SELECT id, content_hash, remote_url, local_uri FROM local_product_images
     WHERE local_uri IS NOT NULL`,
  );
  for (const row of images) {
    if (!row.local_uri) continue;
    const hash = row.content_hash ?? `img_${row.id}`;
    map.set(`${hash}|${row.remote_url}`, row.local_uri);
  }

  return map;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onItemDone?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let done = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
      done += 1;
      onItemDone?.(done, items.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, Math.max(items.length, 1)) },
    () => runWorker(),
  );
  await Promise.all(workers);
  return results;
}

async function resolveAssetJobs(
  jobs: AssetJob[],
  onProgress?: ProgressCb,
): Promise<Map<string, string>> {
  const localUriByKey = new Map<string, string>();
  if (!jobs.length) return localUriByKey;

  const cached = await loadCachedAssetUris();
  const pending: AssetJob[] = [];

  for (const job of jobs) {
    const key = `${job.hashOrId}|${job.url}`;
    const fromDb = cached.get(key);
    if (fromDb) {
      localUriByKey.set(key, fromDb);
      continue;
    }
    const fromDisk = await getCommittedAssetIfExists(job.hashOrId, job.url);
    if (fromDisk) {
      localUriByKey.set(key, fromDisk);
      continue;
    }
    pending.push(job);
  }

  const reused = jobs.length - pending.length;
  onProgress?.({
    phase: "downloading_assets",
    message:
      pending.length === 0
        ? `Using ${reused} cached images`
        : `Downloading ${pending.length} new images (${reused} cached)…`,
    progress: 0.3,
  });

  // Web keeps remote URLs — no real download work.
  if (Platform.OS === "web") {
    for (const job of pending) {
      localUriByKey.set(`${job.hashOrId}|${job.url}`, job.url);
    }
    return localUriByKey;
  }

  await mapWithConcurrency(
    pending,
    ASSET_CONCURRENCY,
    async (job) => {
      const key = `${job.hashOrId}|${job.url}`;
      try {
        const uri = await downloadAssetToStaging(job.url, job.hashOrId);
        localUriByKey.set(key, uri);
      } catch (err) {
        console.warn("Asset download failed", job.url, err);
        localUriByKey.set(key, job.url);
      }
      return key;
    },
    (done, total) => {
      onProgress?.({
        phase: "downloading_assets",
        message: `Downloading images (${done}/${total})…`,
        progress: 0.3 + (0.5 * done) / Math.max(total, 1),
      });
    },
  );

  return localUriByKey;
}

async function writeStagingData(
  categories: Category[],
  subCategories: SubCategory[],
  products: Product[],
  presentations: Array<Presentation & { slides?: NonNullable<Presentation["slides"]> }>,
  localUriByKey: Map<string, string>,
): Promise<void> {
  const db = await getDatabase();
  const syncedAt = new Date().toISOString();

  await clearStagingTables();

  for (const cat of categories) {
    const localUri = cat.imageUrl
      ? localUriByKey.get(`${cat.imageHash ?? `cat_${cat.id}`}|${cat.imageUrl}`) ??
        null
      : null;
    await db.runAsync(
      `INSERT INTO staging_categories (
        id, name, description, image_url, image_hash, local_image_uri,
        display_order, is_active, content_hash, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id,
        cat.name,
        cat.description,
        cat.imageUrl,
        cat.imageHash,
        localUri,
        cat.displayOrder,
        cat.isActive ? 1 : 0,
        cat.imageHash,
        cat.updatedAt,
        syncedAt,
      ],
    );
  }

  for (const sub of subCategories) {
    await db.runAsync(
      `INSERT INTO staging_subcategories (
        id, category_id, name, description, display_order, is_active, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sub.id,
        sub.categoryId,
        sub.name,
        sub.description,
        sub.displayOrder,
        sub.isActive ? 1 : 0,
        sub.updatedAt,
        syncedAt,
      ],
    );
  }

  for (const product of products) {
    if (product.status !== "PUBLISHED") continue;
    await db.runAsync(
      `INSERT INTO staging_products (
        id, name, brand_name, generic_name, sku, category_id, sub_category_id,
        composition, strength, dosage_form, pack_size, description,
        approved_indications, key_information, highlights, prescribing_info,
        precautions, storage_instructions, display_order, status, featured,
        content_hash, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.name,
        product.brandName,
        product.genericName,
        product.sku,
        product.categoryId,
        product.subCategoryId ?? null,
        product.composition,
        product.strength,
        product.dosageForm,
        product.packSize,
        product.description,
        product.approvedIndications,
        product.keyInformation,
        product.highlights,
        product.prescribingInfo,
        product.precautions,
        product.storageInstructions,
        product.displayOrder,
        product.status,
        product.featured ? 1 : 0,
        null,
        product.updatedAt,
        syncedAt,
      ],
    );

    for (const img of (product.images ?? []) as ProductImage[]) {
      const localUri =
        localUriByKey.get(`${img.contentHash ?? `img_${img.id}`}|${img.url}`) ??
        null;
      await db.runAsync(
        `INSERT INTO staging_product_images (
          id, product_id, remote_url, content_hash, local_uri, alt_text, display_order, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          img.id,
          product.id,
          img.url,
          img.contentHash,
          localUri,
          img.altText,
          img.displayOrder,
          img.isPrimary ? 1 : 0,
        ],
      );
    }
  }

  for (const presentation of presentations) {
    if (presentation.status !== "PUBLISHED") continue;
    await db.runAsync(
      `INSERT INTO staging_presentations (
        id, product_id, title, status, version, published_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        presentation.id,
        presentation.productId,
        presentation.title,
        presentation.status,
        presentation.version,
        presentation.publishedAt,
        syncedAt,
      ],
    );

    for (const slide of presentation.slides ?? []) {
      if (!slide.isActive) continue;
      const bgLocal = slide.backgroundImageUrl
        ? localUriByKey.get(
            `${slide.backgroundImageHash ?? `sbg_${slide.id}`}|${slide.backgroundImageUrl}`,
          ) ?? null
        : null;
      const mainLocal = slide.mainImageUrl
        ? localUriByKey.get(
            `${slide.mainImageHash ?? `smain_${slide.id}`}|${slide.mainImageUrl}`,
          ) ?? null
        : null;
      const secLocal = slide.secondaryImageUrl
        ? localUriByKey.get(
            `${slide.secondaryImageHash ?? `ssec_${slide.id}`}|${slide.secondaryImageUrl}`,
          ) ?? null
        : null;

      await db.runAsync(
        `INSERT INTO staging_slides (
          id, presentation_id, title, subtitle, slide_type, background_color,
          background_image_url, background_image_hash, background_local_uri,
          main_image_url, main_image_hash, main_local_uri,
          secondary_image_url, secondary_image_hash, secondary_local_uri,
          description, bullet_points, highlight_text, content_json,
          display_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slide.id,
          presentation.id,
          slide.title,
          slide.subtitle,
          slide.slideType,
          slide.backgroundColor,
          slide.backgroundImageUrl,
          slide.backgroundImageHash,
          bgLocal,
          slide.mainImageUrl,
          slide.mainImageHash,
          mainLocal,
          slide.secondaryImageUrl,
          slide.secondaryImageHash,
          secLocal,
          slide.description,
          JSON.stringify(slide.bulletPoints ?? []),
          slide.highlightText,
          slide.content ? JSON.stringify(slide.content) : null,
          slide.displayOrder,
          slide.isActive ? 1 : 0,
        ],
      );
    }
  }
}

async function atomicCommitFromStaging(
  localUriByKey: Map<string, string>,
): Promise<Map<string, string>> {
  const db = await getDatabase();
  const committedMap = new Map<string, string>();

  // Promote files first (outside DB txn). If this fails, local_* stays intact.
  for (const [key, stagingUri] of Array.from(localUriByKey.entries())) {
    const pipeIdx = key.indexOf("|");
    if (pipeIdx < 0) continue;
    const hashOrId = key.slice(0, pipeIdx);
    const url = key.slice(pipeIdx + 1);
    if (!url) continue;
    // Already final: remote URL, reused committed file, or web cache
    if (
      stagingUri.startsWith("http") ||
      stagingUri.includes("/committed/") ||
      stagingUri.startsWith("web-committed://")
    ) {
      committedMap.set(key, stagingUri);
      continue;
    }
    const committed = await commitStagedAsset(stagingUri, hashOrId, url);
    committedMap.set(key, committed);
  }

  // Rewrite staging local URIs to committed paths
  for (const [key, committedUri] of Array.from(committedMap.entries())) {
    const stagingUri = localUriByKey.get(key);
    if (!stagingUri) continue;
    await db.runAsync(
      `UPDATE staging_categories SET local_image_uri = ? WHERE local_image_uri = ?`,
      [committedUri, stagingUri],
    );
    await db.runAsync(
      `UPDATE staging_product_images SET local_uri = ? WHERE local_uri = ?`,
      [committedUri, stagingUri],
    );
    await db.runAsync(
      `UPDATE staging_slides SET background_local_uri = ? WHERE background_local_uri = ?`,
      [committedUri, stagingUri],
    );
    await db.runAsync(
      `UPDATE staging_slides SET main_local_uri = ? WHERE main_local_uri = ?`,
      [committedUri, stagingUri],
    );
    await db.runAsync(
      `UPDATE staging_slides SET secondary_local_uri = ? WHERE secondary_local_uri = ?`,
      [committedUri, stagingUri],
    );
  }

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM local_slides;
      DELETE FROM local_presentations;
      DELETE FROM local_product_images;
      DELETE FROM local_products;
      DELETE FROM local_subcategories;
      DELETE FROM local_categories;

      INSERT INTO local_categories SELECT * FROM staging_categories;
      INSERT INTO local_subcategories SELECT * FROM staging_subcategories;
      INSERT INTO local_products SELECT * FROM staging_products;
      INSERT INTO local_product_images SELECT * FROM staging_product_images;
      INSERT INTO local_presentations SELECT * FROM staging_presentations;
      INSERT INTO local_slides SELECT * FROM staging_slides;

      DELETE FROM staging_slides;
      DELETE FROM staging_presentations;
      DELETE FROM staging_product_images;
      DELETE FROM staging_products;
      DELETE FROM staging_subcategories;
      DELETE FROM staging_categories;
    `);
  });

  return committedMap;
}

let syncInFlight: Promise<SyncStatusSnapshot> | null = null;

export interface SyncStatusSnapshot {
  ok: boolean;
  skipped?: boolean;
  version: number | null;
  error?: string;
}

/**
 * Sync published catalogue into SQLite + FileSystem.
 * Failed syncs never commit — existing local_* data remains valid.
 */
export async function syncCatalogue(
  onProgress?: ProgressCb,
): Promise<SyncStatusSnapshot> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      await ensureAssetDirs();
      await setSyncMeta(SYNC_KEYS.lastSyncStatus, "syncing");
      onProgress?.({
        phase: "checking",
        message: "Checking catalogue version…",
        progress: 0.05,
      });

      // Always pull live payload (1 call). Admin may add images after last publish;
      // payload is built from current DB, while version skip would hide those updates.
      // Cached image files are still reused — only missing assets download.
      const remoteVersion = await api.getCatalogueVersion();
      if (!remoteVersion.isPublished) {
        throw new Error("No published catalogue is available yet");
      }

      onProgress?.({
        phase: "fetching",
        message: "Fetching offline catalogue…",
        progress: 0.15,
      });

      const payload = await api.getCataloguePayload();
      const subCategories = payload.subCategories ?? [];
      const presentations: Array<
        Presentation & { slides?: NonNullable<Presentation["slides"]> }
      > = [];

      await clearStagingAssets();
      const jobs = collectOfflineAssets(payload.categories, payload.products);
      const localUriByKey = await resolveAssetJobs(jobs, onProgress);

      onProgress?.({
        phase: "committing",
        message: "Writing offline catalogue…",
        progress: 0.85,
      });

      await writeStagingData(
        payload.categories,
        subCategories,
        payload.products,
        presentations,
        localUriByKey,
      );

      // Atomic commit: only now replace local_* tables
      await atomicCommitFromStaging(localUriByKey);
      await clearStagingAssets();

      await setSyncMeta(
        SYNC_KEYS.catalogueVersion,
        String(payload.version.version),
      );
      if (payload.version.manifestHash) {
        await setSyncMeta(SYNC_KEYS.manifestHash, payload.version.manifestHash);
      }
      await setSyncMeta(SYNC_KEYS.lastSyncAt, new Date().toISOString());
      await setSyncMeta(SYNC_KEYS.lastSyncStatus, "success");
      await setSyncMeta(SYNC_KEYS.lastSyncError, "");

      await upsertDownload({
        id: "catalogue-full",
        entityType: "catalogue",
        entityId: "full",
        label: `Catalogue v${payload.version.version}`,
        status: "completed",
        progress: 1,
        bytesTotal: null,
        bytesDone: null,
        errorMessage: null,
        localPath: null,
        contentHash: payload.version.manifestHash,
      });

      onProgress?.({
        phase: "done",
        message: "Sync complete",
        progress: 1,
      });

      return { ok: true, version: payload.version.version };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sync failed unexpectedly";
      // Clean staging only — do not touch local_* committed data
      try {
        await clearStagingTables();
        await clearStagingAssets();
      } catch {
        // ignore cleanup errors
      }
      await setSyncMeta(SYNC_KEYS.lastSyncStatus, "error");
      await setSyncMeta(SYNC_KEYS.lastSyncError, message);
      onProgress?.({ phase: "error", message, progress: 0 });
      return { ok: false, version: null, error: message };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/**
 * Ensure catalogue is offline-ready for a product.
 * Reuses local data when already synced — does not re-hit every API.
 */
export async function downloadProductPackage(
  productId: string,
  label: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const downloadId = `product-${productId}`;
  await upsertDownload({
    id: downloadId,
    entityType: "product",
    entityId: productId,
    label,
    status: "downloading",
    progress: 0,
    bytesTotal: null,
    bytesDone: null,
    errorMessage: null,
    localPath: null,
    contentHash: null,
  });

  try {
    onProgress?.(0.2);
    const status = await getSyncStatus();
    // Only sync when local catalogue is empty / outdated. syncCatalogue itself
    // short-circuits with a single version check when already current.
    const result = await syncCatalogue((e) => onProgress?.(0.2 + e.progress * 0.7));
    if (!result.ok && status.productCount === 0) {
      throw new Error(result.error ?? "Catalogue sync failed");
    }

    onProgress?.(0.95);
    await upsertDownload({
      id: downloadId,
      entityType: "product",
      entityId: productId,
      label,
      status: "completed",
      progress: 1,
      bytesTotal: null,
      bytesDone: null,
      errorMessage: null,
      localPath: "local",
      contentHash: null,
    });
    onProgress?.(1);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Download failed";
    await upsertDownload({
      id: downloadId,
      entityType: "product",
      entityId: productId,
      label,
      status: "failed",
      progress: 0,
      bytesTotal: null,
      bytesDone: null,
      errorMessage: message,
      localPath: null,
      contentHash: null,
    });
    throw error;
  }
}
