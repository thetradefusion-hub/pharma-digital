import { Platform } from "react-native";

type AssetsApi = typeof import("./assets.native");

async function impl(): Promise<AssetsApi> {
  if (Platform.OS === "web") {
    return import("./assets.web") as unknown as Promise<AssetsApi>;
  }
  return import("./assets.native");
}

export async function ensureAssetDirs(): Promise<void> {
  return (await impl()).ensureAssetDirs();
}

export function stagingPath(hashOrId: string, url: string): string {
  // Sync helpers used for path names — keep platform-agnostic naming
  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i);
  const ext = extMatch?.[1]?.toLowerCase() ?? "bin";
  const safe = hashOrId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const prefix = Platform.OS === "web" ? "web-staging://" : "file-staging://";
  return `${prefix}${safe}.${ext}`;
}

export function committedPath(hashOrId: string, url: string): string {
  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i);
  const ext = extMatch?.[1]?.toLowerCase() ?? "bin";
  const safe = hashOrId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const prefix = Platform.OS === "web" ? "web-committed://" : "file-committed://";
  return `${prefix}${safe}.${ext}`;
}

export async function clearStagingAssets(): Promise<void> {
  return (await impl()).clearStagingAssets();
}

export async function getCommittedAssetIfExists(
  hashOrId: string,
  url: string,
): Promise<string | null> {
  return (await impl()).getCommittedAssetIfExists(hashOrId, url);
}

export async function downloadAssetToStaging(
  url: string,
  hashOrId: string,
): Promise<string> {
  return (await impl()).downloadAssetToStaging(url, hashOrId);
}

export async function commitStagedAsset(
  stagingUri: string,
  hashOrId: string,
  url: string,
): Promise<string> {
  return (await impl()).commitStagedAsset(stagingUri, hashOrId, url);
}

export async function removeCommittedAsset(localUri: string): Promise<void> {
  return (await impl()).removeCommittedAsset(localUri);
}
