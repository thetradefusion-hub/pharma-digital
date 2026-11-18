import { Platform } from "react-native";
import { SCHEMA_SQL } from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

let dbPromise: Promise<AnyDb> | null = null;

async function openNative(): Promise<AnyDb> {
  const SQLite = await import("expo-sqlite");
  const db = await SQLite.openDatabaseAsync("pharma_catalogue.db");
  await db.execAsync(SCHEMA_SQL);
  return db;
}

async function openWeb(): Promise<AnyDb> {
  const { getDatabase: getWebDatabase } = await import("./database.web");
  return getWebDatabase();
}

export async function getDatabase(): Promise<AnyDb> {
  if (!dbPromise) {
    dbPromise = Platform.OS === "web" ? openWeb() : openNative();
  }
  return dbPromise;
}

export async function resetDatabaseConnection(): Promise<void> {
  if (Platform.OS === "web") {
    const { resetDatabaseConnection: resetWeb } = await import("./database.web");
    await resetWeb();
    dbPromise = null;
    return;
  }
  if (dbPromise) {
    const db = await dbPromise;
    if (typeof db.closeAsync === "function") {
      await db.closeAsync();
    }
    dbPromise = null;
  }
}
