# Deployment Guide

## Backend API

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

## Admin (Next.js)

Deploy `apps/admin` to Vercel or any Node host.

Required env:

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

Set `EXPO_PUBLIC_API_URL` to the public API URL.

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
