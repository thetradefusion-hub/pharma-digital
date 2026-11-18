import { api } from "@/lib/api";

/** Silent publish so mobile sync picks up admin changes without Catalogue Management UI. */
export async function publishCatalogueQuietly() {
  try {
    await api.publishCatalogue({
      label: `Auto publish ${new Date().toISOString()}`,
      notes: "Published automatically after admin content change",
    });
  } catch {
    // Non-blocking — content is already saved
  }
}
