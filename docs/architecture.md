# Pharma Digital Catalogue — Architecture

## Overview

Production monorepo for a pharmaceutical digital catalogue and interactive visual aid used by Medical Representatives (MRs) on Android devices, with a centralized admin CMS and REST API.

**Scope (in):** digital medicine catalogue, product information, interactive visual-aid slides, offline catalogue access, admin content management.

**Scope (out):** CRM, ERP, attendance, GPS tracking, sales/order management, inventory, billing.

## Applications

| App | Stack | Role |
|-----|-------|------|
| `apps/api` | Node.js, Express, TypeScript, Prisma, PostgreSQL | REST API, auth, catalogue versioning, asset metadata |
| `apps/admin` | Next.js App Router, Tailwind, Shadcn UI | Admin CMS & dashboard |
| `apps/mobile` | React Native Expo, Expo Router, SQLite | MR catalogue + offline presentation |

## Shared Packages

| Package | Purpose |
|---------|---------|
| `packages/shared-types` | Shared TypeScript domain types & enums |
| `packages/validation` | Zod schemas shared by API, admin, and mobile |
| `packages/api-client` | Typed HTTP client for admin & mobile |

## High-Level Data Flow

```
Admin (Next.js) ──JWT──► API (Express) ──Prisma──► PostgreSQL
                              │
                              ├── Cloudinary / S3 (images & slide assets)
                              │
Mobile (Expo) ──JWT──► API ──► Catalogue manifest + assets
     │
     ├── SecureStore (tokens)
     ├── SQLite (structured offline catalogue)
     └── FileSystem (downloaded images / slide assets)
```

## Offline-First Strategy

1. After login, mobile syncs published catalogue version + changed records.
2. Assets download to local FileSystem; metadata + content hashes stored in SQLite.
3. Browse, search, product detail, and presentation use local data only when offline.
4. Sync uses staging → verify → atomic commit so a failed sync never corrupts a valid local catalogue.
5. Account deactivation blocks future online auth; fully offline devices cannot receive immediate remote revocation (documented limitation).

## Auth & Roles

- **ADMIN** — web dashboard only
- **MOBILE_USER** — Android app only
- Access tokens: short-lived JWT
- Refresh tokens: rotating, hashed at rest
- Passwords: Argon2id (or bcrypt fallback)
- Mobile tokens: Expo SecureStore (never SQLite)

## Catalogue Versioning

- `CatalogueVersion` increments on publish.
- Mobile compares local vs server version via `/api/catalogue/version` and `/api/catalogue/changes`.
- Manifest lists products, slides, and assets with content hashes for incremental download.

## Storage

- PostgreSQL: structured application data
- Object storage (Cloudinary or S3-compatible): product/slide images
- SQLite + FileSystem: mobile offline cache

## Security Highlights

- Zod validation on all mutating requests
- RBAC middleware
- Rate limiting, CORS, secure upload MIME/size checks
- Audit log for admin mutations
- No secrets in source; env-based config

## Development Phases

1. Architecture & monorepo scaffold
2. Backend API + Prisma + seed
3. Admin web panel
4. Android mobile app
5. Offline SQLite + sync
6. Testing & optimization
7. Deployment (Docker, APK/AAB docs)
