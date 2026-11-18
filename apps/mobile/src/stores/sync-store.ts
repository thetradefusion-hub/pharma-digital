import { create } from "zustand";
import {
  getSyncStatus,
  type SyncStatus,
} from "../lib/db/catalogue-repo";
import {
  syncCatalogue,
  type SyncProgressEvent,
} from "../lib/sync/sync-engine";

let invalidateCatalogueCache: (() => void) | null = null;

/** Wired from AppProviders so sync refreshes React Query after SQLite write. */
export function setCatalogueInvalidator(fn: (() => void) | null) {
  invalidateCatalogueCache = fn;
}

interface SyncState {
  status: SyncStatus | null;
  syncing: boolean;
  progress: SyncProgressEvent | null;
  refreshStatus: () => Promise<void>;
  runSync: () => Promise<boolean>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: null,
  syncing: false,
  progress: null,

  refreshStatus: async () => {
    const status = await getSyncStatus();
    set({ status });
  },

  runSync: async () => {
    if (get().syncing) return false;
    set({ syncing: true, progress: null });
    try {
      const result = await syncCatalogue((event) => {
        set({ progress: event });
      });
      await get().refreshStatus();
      if (result.ok) {
        invalidateCatalogueCache?.();
      }
      return result.ok;
    } finally {
      set({ syncing: false });
    }
  },
}));
