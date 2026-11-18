/**
 * Web asset "cache": keep Cloudinary/remote URLs.
 * Blob object URLs die on refresh, so they must not be persisted into SQLite.
 */

function safeName(hashOrId: string, url: string): string {
  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i);
  const ext = extMatch?.[1]?.toLowerCase() ?? "bin";
  const safe = hashOrId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `${safe}.${ext}`;
}

export async function ensureAssetDirs(): Promise<void> {
  // No-op on web
}

export function stagingPath(hashOrId: string, url: string): string {
  return `web-staging://${safeName(hashOrId, url)}`;
}

export function committedPath(hashOrId: string, url: string): string {
  return `web-committed://${safeName(hashOrId, url)}`;
}

export async function clearStagingAssets(): Promise<void> {
  // No ephemeral blobs to clear on web
}

export async function getCommittedAssetIfExists(
  _hashOrId: string,
  url: string,
): Promise<string | null> {
  return url || null;
}

export async function downloadAssetToStaging(
  url: string,
  _hashOrId: string,
): Promise<string> {
  // Prefer durable remote URL so images survive reload
  return url;
}

export async function commitStagedAsset(
  stagingUri: string,
  _hashOrId: string,
  url: string,
): Promise<string> {
  return stagingUri.startsWith("http") ? stagingUri : url;
}

export async function removeCommittedAsset(_localUri: string): Promise<void> {
  // No local files on web
}
