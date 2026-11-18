# Pharma Digital Catalogue — Mobile (Expo)

Android-first Expo app for Medical Representatives.

## Run

```bash
# from monorepo root
pnpm install
pnpm --filter @pharma/shared-types build
pnpm --filter @pharma/validation build
pnpm --filter @pharma/api-client build
pnpm --filter @pharma/mobile start
```

Set `EXPO_PUBLIC_API_URL` to your API (use LAN IP for physical devices):

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api
```

## Offline

- Tokens: Expo SecureStore only
- Catalogue: SQLite (`local_*` tables)
- Assets: Expo FileSystem with content-hash staging → atomic commit
- Presentation mode prefers local file URIs after download

## Android builds

```bash
pnpm --filter @pharma/mobile prebuild
pnpm --filter @pharma/mobile build:apk   # EAS preview profile
pnpm --filter @pharma/mobile build:aab   # EAS production profile
```
