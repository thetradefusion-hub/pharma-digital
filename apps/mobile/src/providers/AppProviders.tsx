import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useInvalidateCatalogue } from "../hooks/use-local-catalogue";
import { setUnauthorizedHandler } from "../lib/api";
import { getDatabase } from "../lib/db/database";
import { ensureAssetDirs } from "../lib/fs/assets";
import { useAuthStore } from "../stores/auth-store";
import { useNetworkStore } from "../stores/network-store";
import { setCatalogueInvalidator, useSyncStore } from "../stores/sync-store";

function SyncCatalogueBridge() {
  const invalidate = useInvalidateCatalogue();
  useEffect(() => {
    setCatalogueInvalidator(() => invalidate());
    return () => setCatalogueInvalidator(null);
  }, [invalidate]);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  const bootstrapAuth = useAuthStore((s) => s.bootstrap);
  const logout = useAuthStore((s) => s.logout);
  const initNetwork = useNetworkStore((s) => s.init);
  const refreshSync = useSyncStore((s) => s.refreshStatus);

  useEffect(() => {
    let unsubNetwork = () => {};
    (async () => {
      await getDatabase();
      await ensureAssetDirs();
      unsubNetwork = initNetwork();
      setUnauthorizedHandler(() => {
        void logout();
      });
      await bootstrapAuth();
      await refreshSync();
    })();
    return () => {
      unsubNetwork();
      setUnauthorizedHandler(null);
    };
  }, [bootstrapAuth, initNetwork, logout, refreshSync]);

  return (
    <QueryClientProvider client={queryClient}>
      <SyncCatalogueBridge />
      {children}
    </QueryClientProvider>
  );
}
