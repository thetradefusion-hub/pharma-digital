# Setup Guide

## Prerequisites

- Node.js 20+ (recommended 22 LTS)
- pnpm 9+
- Docker Desktop (PostgreSQL)
- Android Studio / Expo Go for mobile
- Cloudinary account (or S3-compatible credentials)

## 1. Install dependencies

```bash
cd "MR Presentation"
pnpm install
```

## 2. Environment

```bash
cp .env.example .env
# Edit .env with secrets, DB URL, Cloudinary keys
```

## 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

## 4. Database migrate & seed

```bash
pnpm --filter @pharma/api prisma:migrate
pnpm --filter @pharma/api prisma:seed
```

Demo accounts (change in production):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pharma.demo | Admin@12345 |
| MR | mr@pharma.demo | Mobile@12345 |

## 5. Run API

```bash
pnpm --filter @pharma/api dev
# http://localhost:4000/api/docs
```

## 6. Run Admin

```bash
pnpm --filter @pharma/admin dev
# http://localhost:3000
```

## 7. Run Mobile

```bash
pnpm --filter @pharma/mobile start
# Press `a` for Android emulator
```

Set `EXPO_PUBLIC_API_URL` to your machine LAN IP when using a physical device.

## Monorepo scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:api` | Start API |
| `pnpm dev:admin` | Start admin |
| `pnpm dev:mobile` | Start Expo |
| `pnpm build` | Build all packages/apps |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint all |

## Offline note

Remote account deactivation applies on next online auth/sync. A fully offline device cannot be revoked immediately.
