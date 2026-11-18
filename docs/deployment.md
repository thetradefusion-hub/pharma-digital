# Deployment Guide

## Vercel Services (admin + API, one project)

Root `vercel.json` defines two services:

| Service | Root | Public paths |
|---------|------|--------------|
| `admin` | `apps/admin` | `/(.*)` (catch-all) |
| `api` | `apps/api` | `/api/(.*)`, `/health` |

- Browser/admin + mobile hit **public** `/api/*` (rewrite → `api`).
- `admin` has a binding `API_URL` → `api` for **server-side** calls only (not build, not middleware, not browser).
- On Vercel, set `NEXT_PUBLIC_API_URL=/api` (or omit; client defaults to `/api`).
- Do **not** manually set `API_URL` — Vercel injects it.

Required Vercel env (shared / both services as needed):

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- Cloudinary: `STORAGE_PROVIDER=cloudinary`, `CLOUDINARY_*`
- `CORS_ORIGINS` — include your Vercel domain (and Expo web if used)
- `NODE_ENV=production`

Run migrations against the production DB before/after first deploy:

```bash
pnpm --filter @pharma/api prisma:deploy
```

Local multi-service:

```bash
vercel dev
# or vercel dev --local
```

## Backend API (Docker / VPS alternative)

1. Provision PostgreSQL 16+ and create database/user.
2. Set production `.env` from `.env.example` (strong JWT secrets, Cloudinary/S3).
3. Build and run:

```bash
pnpm install --frozen-lockfile
pnpm build:packages
pnpm --filter @pharma/api prisma:deploy
pnpm --filter @pharma/api prisma:seed   # optional demo data — disable in real production
pnpm --filter @pharma/api start
```

Docker:

```bash
docker compose up -d postgres api
```

## Admin (Next.js standalone)

If not using Vercel Services, deploy `apps/admin` alone and point at a public API:

- `NEXT_PUBLIC_API_URL=https://api.example.com/api`

```bash
pnpm --filter @pharma/admin build
pnpm --filter @pharma/admin start
```

## Mobile (Android)

```bash
cd apps/mobile
npx expo prebuild --platform android
npx eas build -p android --profile preview   # APK
npx eas build -p android --profile production # AAB
```

Set `EXPO_PUBLIC_API_URL` to the public API URL (e.g. `https://your-app.vercel.app/api`).

## Backups

- PostgreSQL: nightly `pg_dump` of `pharma_catalogue`
- Object storage: enable versioning on the bucket/Cloudinary folder
- Keep catalogue version history for audit

## Security checklist

- Rotate JWT secrets before production
- Disable demo seed accounts or change passwords
- Restrict CORS to admin + known origins
- Use HTTPS everywhere
- Confirm upload MIME/size limits
