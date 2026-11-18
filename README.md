# Pharma Digital Catalogue & Interactive Visual Aid

Production monorepo for Medical Representatives (MRs) to present pharmaceutical products offline on Android, with a centralized admin CMS.

## What's included

- **`apps/api`** — Express + Prisma + PostgreSQL REST API (JWT, Swagger)
- **`apps/admin`** — Next.js admin dashboard (categories, products, slides, catalogue, users)
- **`apps/mobile`** — Expo React Native Android app (catalogue, presentation, offline sync)
- **`packages/*`** — Shared types, Zod validation, API client

## Quick start

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev:api      # :4000
pnpm dev:admin    # :3000
pnpm dev:mobile   # Expo
```

Demo logins (seed data — change in production):

| App | Email | Password |
|-----|-------|----------|
| Admin | `admin@pharma.demo` | `Admin@12345` |
| Mobile | `mr@pharma.demo` | `Mobile@12345` |

## Documentation

- [Architecture](docs/architecture.md)
- [Database schema](docs/database-schema.md)
- [API documentation](docs/api-documentation.md)
- [Setup guide](docs/setup-guide.md)
- [Deployment](docs/deployment.md)

## Development progress checklist

- [x] Phase 1 — Architecture & monorepo scaffold
- [x] Phase 2 — Backend API (migrate/seed blocked until local Postgres role exists)
- [x] Phase 3 — Admin web panel
- [x] Phase 4 — Android mobile app (Expo screens + presentation)
- [x] Phase 5 — Offline architecture (SQLite + FileSystem sync engine)
- [ ] Phase 6 — Broader integration tests (after DB is live)
- [x] Phase 7 — Deployment docs/Docker (APK/AAB config present; device build pending)

See [docs/progress.md](docs/progress.md) for detailed status.

### Local database setup (Windows)

PostgreSQL 18 is detected locally, but Docker is unavailable. Create the app role/database:

```powershell
$env:PGPASSWORD = "<your postgres superuser password>"
.\scripts\setup-postgres.ps1
pnpm db:migrate
pnpm db:seed
```

## Important constraints

- Not a CRM/ERP/sales/GPS/attendance app
- Medical content must be client-approved; demo seed uses clearly marked sample placeholders
- Offline presentation must use local assets, not remote URLs
