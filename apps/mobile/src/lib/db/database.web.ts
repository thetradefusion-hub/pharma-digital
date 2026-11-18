import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { SCHEMA_SQL } from "./schema";

type SqlParam = string | number | null | Uint8Array;

export interface WebSqliteDatabase {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: SqlParam[]) => Promise<{ changes: number }>;
  getFirstAsync: <T>(sql: string, params?: SqlParam[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, params?: SqlParam[]) => Promise<T[]>;
  withTransactionAsync: (fn: () => Promise<void>) => Promise<void>;
  closeAsync: () => Promise<void>;
}

const STORAGE_KEY = "pharma_catalogue_sqlite_web_v3";

let dbPromise: Promise<WebSqliteDatabase> | null = null;
let sqlDb: SqlJsDatabase | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** sql.js: WAL + strict FK checks are unreliable in WASM; keep schema portable. */
function webSafeSchema(sql: string): string {
  return sql
    .replace(/PRAGMA journal_mode\s*=\s*WAL\s*;?/gi, "PRAGMA journal_mode=MEMORY;")
    .replace(/PRAGMA foreign_keys\s*=\s*ON\s*;?/gi, "PRAGMA foreign_keys=OFF;");
}

/** sql.js aborts (ExitStatus 142) if bind values are undefined. */
function sanitizeParams(params: unknown[] = []): SqlParam[] {
  return params.map((value) => {
    if (value === undefined) return null;
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      value instanceof Uint8Array
    ) {
      return value;
    }
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  });
}

function schedulePersist() {
  if (!sqlDb || typeof localStorage === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const data = sqlDb!.export();
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < data.length; i += chunk) {
        binary += String.fromCharCode(
          ...Array.from(data.subarray(i, i + chunk)),
        );
      }
      localStorage.setItem(STORAGE_KEY, btoa(binary));
    } catch {
      // Ignore quota / serialization errors in demo
    }
  }, 250);
}

function restore(SQL: Awaited<ReturnType<typeof initSqlJs>>): SqlJsDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new SQL.Database(bytes);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return new SQL.Database();
}

function wrap(db: SqlJsDatabase): WebSqliteDatabase {
  return {
    async execAsync(sql: string) {
      // IMPORTANT: use exec() for multi-statement SQL (schema / atomic commit)
      db.exec(webSafeSchema(sql));
      schedulePersist();
    },
    async runAsync(sql: string, params: SqlParam[] = []) {
      const bound = sanitizeParams(params);
      if (bound.length > 0) {
        db.run(sql, bound as never[]);
      } else {
        db.run(sql);
      }
      schedulePersist();
      return { changes: db.getRowsModified() };
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []) {
      const stmt = db.prepare(sql);
      try {
        const bound = sanitizeParams(params);
        if (bound.length > 0) stmt.bind(bound as never[]);
        if (!stmt.step()) return null;
        return stmt.getAsObject() as T;
      } finally {
        stmt.free();
      }
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []) {
      const stmt = db.prepare(sql);
      const rows: T[] = [];
      try {
        const bound = sanitizeParams(params);
        if (bound.length > 0) stmt.bind(bound as never[]);
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        return rows;
      } finally {
        stmt.free();
      }
    },
    async withTransactionAsync(fn: () => Promise<void>) {
      db.run("BEGIN");
      try {
        await fn();
        db.run("COMMIT");
        schedulePersist();
      } catch (error) {
        try {
          db.run("ROLLBACK");
        } catch {
          // ignore
        }
        throw error;
      }
    },
    async closeAsync() {
      schedulePersist();
      db.close();
      sqlDb = null;
      dbPromise = null;
    },
  };
}

async function openFresh(
  SQL: Awaited<ReturnType<typeof initSqlJs>>,
): Promise<WebSqliteDatabase> {
  if (sqlDb) {
    try {
      sqlDb.close();
    } catch {
      // ignore
    }
  }
  sqlDb = new SQL.Database();
  const wrapped = wrap(sqlDb);
  await wrapped.execAsync(SCHEMA_SQL);
  return wrapped;
}

export async function getDatabase(): Promise<WebSqliteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const SQL = await initSqlJs({
          // Must match installed sql.js glue — mismatched CDN wasm aborts with ExitStatus 142
          locateFile: (file) =>
            file.endsWith(".wasm")
              ? "/sql-wasm.wasm"
              : `https://unpkg.com/sql.js@1.16.0/dist/${file}`,
        });
        sqlDb = restore(SQL);
        const wrapped = wrap(sqlDb);
        try {
          await wrapped.execAsync(SCHEMA_SQL);
          return wrapped;
        } catch (error) {
          console.warn("Web SQLite schema failed, resetting", error);
          localStorage.removeItem(STORAGE_KEY);
          return openFresh(SQL);
        }
      } catch (error) {
        dbPromise = null;
        sqlDb = null;
        throw error;
      }
    })();
  }
  return dbPromise;
}

export async function resetDatabaseConnection(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (dbPromise) {
    try {
      const db = await dbPromise;
      await db.closeAsync();
    } catch {
      // ignore
    }
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  dbPromise = null;
  sqlDb = null;
}
