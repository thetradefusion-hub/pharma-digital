export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS local_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  image_hash TEXT,
  local_image_uri TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS local_subcategories (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (category_id) REFERENCES local_categories(id)
);

CREATE TABLE IF NOT EXISTS local_products (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  generic_name TEXT,
  sku TEXT NOT NULL,
  category_id TEXT NOT NULL,
  sub_category_id TEXT,
  composition TEXT,
  strength TEXT,
  dosage_form TEXT,
  pack_size TEXT,
  description TEXT,
  approved_indications TEXT,
  key_information TEXT,
  highlights TEXT,
  prescribing_info TEXT,
  precautions TEXT,
  storage_instructions TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (category_id) REFERENCES local_categories(id)
);

CREATE TABLE IF NOT EXISTS local_product_images (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL,
  remote_url TEXT NOT NULL,
  content_hash TEXT,
  local_uri TEXT,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES local_products(id)
);

CREATE TABLE IF NOT EXISTS local_presentations (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  synced_at TEXT,
  FOREIGN KEY (product_id) REFERENCES local_products(id)
);

CREATE TABLE IF NOT EXISTS local_slides (
  id TEXT PRIMARY KEY NOT NULL,
  presentation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  slide_type TEXT NOT NULL,
  background_color TEXT,
  background_image_url TEXT,
  background_image_hash TEXT,
  background_local_uri TEXT,
  main_image_url TEXT,
  main_image_hash TEXT,
  main_local_uri TEXT,
  secondary_image_url TEXT,
  secondary_image_hash TEXT,
  secondary_local_uri TEXT,
  description TEXT,
  bullet_points TEXT NOT NULL DEFAULT '[]',
  highlight_text TEXT,
  content_json TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (presentation_id) REFERENCES local_presentations(id)
);

CREATE TABLE IF NOT EXISTS local_downloads (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  bytes_total INTEGER,
  bytes_done INTEGER,
  error_message TEXT,
  local_path TEXT,
  content_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS local_sync_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON local_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON local_products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON local_products(brand_name);
CREATE INDEX IF NOT EXISTS idx_products_featured ON local_products(featured);
CREATE INDEX IF NOT EXISTS idx_images_product ON local_product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_slides_presentation ON local_slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_downloads_status ON local_downloads(status);

-- Staging tables (same shape) for atomic sync commits
CREATE TABLE IF NOT EXISTS staging_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  image_hash TEXT,
  local_image_uri TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS staging_subcategories (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS staging_products (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  generic_name TEXT,
  sku TEXT NOT NULL,
  category_id TEXT NOT NULL,
  sub_category_id TEXT,
  composition TEXT,
  strength TEXT,
  dosage_form TEXT,
  pack_size TEXT,
  description TEXT,
  approved_indications TEXT,
  key_information TEXT,
  highlights TEXT,
  prescribing_info TEXT,
  precautions TEXT,
  storage_instructions TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS staging_product_images (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL,
  remote_url TEXT NOT NULL,
  content_hash TEXT,
  local_uri TEXT,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS staging_presentations (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS staging_slides (
  id TEXT PRIMARY KEY NOT NULL,
  presentation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  slide_type TEXT NOT NULL,
  background_color TEXT,
  background_image_url TEXT,
  background_image_hash TEXT,
  background_local_uri TEXT,
  main_image_url TEXT,
  main_image_hash TEXT,
  main_local_uri TEXT,
  secondary_image_url TEXT,
  secondary_image_hash TEXT,
  secondary_local_uri TEXT,
  description TEXT,
  bullet_points TEXT NOT NULL DEFAULT '[]',
  highlight_text TEXT,
  content_json TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
`;

export const SYNC_KEYS = {
  catalogueVersion: "catalogue_version",
  manifestHash: "manifest_hash",
  lastSyncAt: "last_sync_at",
  lastSyncStatus: "last_sync_status",
  lastSyncError: "last_sync_error",
} as const;
