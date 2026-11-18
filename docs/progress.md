# Development Progress Checklist

## Phase 1 — Architecture & monorepo
- [x] Inspect repository (empty greenfield)
- [x] Monorepo structure (`apps/*`, `packages/*`, `docs/*`)
- [x] Shared types, validation, API client packages
- [x] Architecture / schema / API / setup docs
- [x] docker-compose.yml + .env.example

## Phase 2 — Backend API
- [x] Prisma schema (UUID, soft delete, catalogue versioning)
- [x] Initial migration SQL generated
- [x] Auth (login/logout/refresh/me) + Argon2 + JWT rotation
- [x] RBAC middleware (ADMIN / MOBILE_USER)
- [x] Categories, Products, Images, Presentations, Slides
- [x] Catalogue publish/version/manifest/changes/assets
- [x] Users + dashboard stats/charts/activity
- [x] Uploads (local fallback + Cloudinary)
- [x] Swagger UI at `/api/docs`
- [ ] Apply migration + seed on local PostgreSQL (**blocked: DB credentials**)

## Phase 3 — Admin web panel
- [x] Login + auth store
- [x] Collapsible sidebar shell
- [x] Dashboard with live API charts
- [x] Category CRUD
- [x] Product list/create/edit + image upload
- [x] Presentation slide editor (DnD reorder + live preview)
- [x] Catalogue publish/unpublish/preview
- [x] Mobile user management
- [x] Settings
- [x] Admin TypeScript check passing

## Phase 4 — Android mobile app
- [x] Expo Router screens (splash, login, tabs, product, presentation)
- [x] Presentation mode (swipe + controls + progress)
- [x] Bottom navigation (Home / Catalogue / Downloads / Profile)
- [x] Branded placeholder app icons (replace with final artwork before store release)
- [ ] Full install verification on Android emulator/device

## Phase 5 — Offline architecture
- [x] SQLite schema + repos
- [x] Asset FileSystem downloads with staging
- [x] Version sync with staging/atomic commit
- [x] Offline search + offline presentation (local URI preference)
- [ ] End-to-end sync verification against live API

## Phase 6 — Testing
- [x] API unit/validation tests
- [ ] Integration tests against live DB
- [ ] Admin/mobile tests

## Phase 7 — Deployment
- [x] Dockerfile + compose
- [x] deployment.md
- [ ] Android APK/AAB build verification

## Blockers
1. Local PostgreSQL is running (`postgresql-x64-18`) but the `pharma` role does not exist yet.
2. Docker Desktop is not installed/available on PATH.
3. Run `scripts/setup-postgres.ps1` with `PGPASSWORD` set to your postgres superuser password, then `pnpm db:migrate && pnpm db:seed`.
