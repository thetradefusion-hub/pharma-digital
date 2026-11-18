import * as FileSystem from "expo-file-system";

function documentRoot(): string {
  const base = FileSystem.documentDirectory;
  if (!base) {
    throw new Error("FileSystem.documentDirectory is unavailable");
  }
  return `${base}pharma-assets/`;
}

function stagingRoot(): string {
  return `${documentRoot()}staging/`;
}

function committedRoot(): string {
  return `${documentRoot()}committed/`;
}

export async function ensureAssetDirs(): Promise<void> {
  for (const dir of [documentRoot(), stagingRoot(), committedRoot()]) {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  }
}

function safeName(hashOrId: string, url: string): string {
  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i);
  const ext = extMatch?.[1]?.toLowerCase() ?? "bin";
  const safe = hashOrId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `${safe}.${ext}`;
}

export function stagingPath(hashOrId: string, url: string): string {
  return `${stagingRoot()}${safeName(hashOrId, url)}`;
}

export function committedPath(hashOrId: string, url: string): string {
  return `${committedRoot()}${safeName(hashOrId, url)}`;
}

export async function clearStagingAssets(): Promise<void> {
  const staging = stagingRoot();
  const info = await FileSystem.getInfoAsync(staging);
  if (info.exists) {
    await FileSystem.deleteAsync(staging, { idempotent: true });
  }
  await FileSystem.makeDirectoryAsync(staging, { intermediates: true });
}

/** Reuse an already-downloaded offline file when hash matches. */
export async function getCommittedAssetIfExists(
  hashOrId: string,
  url: string,
): Promise<string | null> {
  await ensureAssetDirs();
  const target = committedPath(hashOrId, url);
  const info = await FileSystem.getInfoAsync(target);
  return info.exists ? target : null;
}

export async function downloadAssetToStaging(
  url: string,
  hashOrId: string,
): Promise<string> {
  await ensureAssetDirs();
  const existing = await getCommittedAssetIfExists(hashOrId, url);
  if (existing) return existing;

  const target = stagingPath(hashOrId, url);
  const result = await FileSystem.downloadAsync(url, target);
  return result.uri;
}

export async function commitStagedAsset(
  stagingUri: string,
  hashOrId: string,
  url: string,
): Promise<string> {
  await ensureAssetDirs();
  const target = committedPath(hashOrId, url);

  // Already final (reused committed file or remote URL)
  if (stagingUri === target || stagingUri.startsWith("http")) {
    return stagingUri;
  }

  const existing = await FileSystem.getInfoAsync(target);
  if (existing.exists) {
    return target;
  }

  const info = await FileSystem.getInfoAsync(stagingUri);
  if (!info.exists) {
    throw new Error(`Staging asset missing: ${stagingUri}`);
  }
  await FileSystem.copyAsync({ from: stagingUri, to: target });
  return target;
}

export async function removeCommittedAsset(localUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
}
