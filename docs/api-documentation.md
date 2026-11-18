# API Documentation

Base URL: `http://localhost:4000/api`  
Interactive docs: `http://localhost:4000/api/docs` (Swagger UI)

## Auth

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/auth/login` | public | Login → access + refresh tokens |
| POST | `/auth/logout` | authenticated | Revoke refresh token |
| POST | `/auth/refresh` | public | Rotate refresh token |
| GET | `/auth/me` | authenticated | Current user profile |

## Categories

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/categories` | authenticated | List (filter/paginate) |
| GET | `/categories/:id` | authenticated | Get one |
| POST | `/categories` | ADMIN | Create |
| PUT | `/categories/:id` | ADMIN | Update |
| DELETE | `/categories/:id` | ADMIN | Soft delete |

## Products

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/products` | authenticated | List/search/filter |
| GET | `/products/:id` | authenticated | Detail + images |
| POST | `/products` | ADMIN | Create |
| PUT | `/products/:id` | ADMIN | Update |
| DELETE | `/products/:id` | ADMIN | Soft delete |
| POST | `/products/:id/duplicate` | ADMIN | Duplicate |
| POST | `/products/:id/images` | ADMIN | Upload images |
| PUT | `/products/:id/images/reorder` | ADMIN | Reorder images |
| DELETE | `/products/images/:imageId` | ADMIN | Remove image |

## Presentations & Slides

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/products/:id/presentation` | authenticated | Get presentation + slides |
| PUT | `/products/:id/presentation` | ADMIN | Upsert presentation meta |
| POST | `/products/:id/slides` | ADMIN | Add slide |
| PUT | `/slides/:id` | ADMIN | Update slide |
| DELETE | `/slides/:id` | ADMIN | Soft delete slide |
| PUT | `/presentations/:id/reorder` | ADMIN | Reorder slides |
| POST | `/presentations/:id/publish` | ADMIN | Publish presentation |
| POST | `/presentations/:id/unpublish` | ADMIN | Unpublish |

## Catalogue

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/catalogue/version` | authenticated | Current published version |
| GET | `/catalogue/manifest` | authenticated | Full published manifest |
| GET | `/catalogue/changes` | authenticated | Changes since version |
| POST | `/catalogue/publish` | ADMIN | Publish new version |
| POST | `/catalogue/unpublish` | ADMIN | Mark unpublished |
| GET | `/catalogue/assets` | authenticated | Asset list for sync |
| GET | `/products/:id/assets` | authenticated | Per-product assets |

## Users

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/users` | ADMIN | List mobile/admin users |
| POST | `/users` | ADMIN | Create user |
| PUT | `/users/:id` | ADMIN | Update details |
| PATCH | `/users/:id/status` | ADMIN | Activate/deactivate |
| POST | `/users/:id/reset-password` | ADMIN | Reset password |

## Dashboard

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/dashboard/stats` | ADMIN | KPI counters |
| GET | `/dashboard/charts` | ADMIN | Chart datasets |
| GET | `/dashboard/activity` | ADMIN | Recent activity |

## Uploads

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/uploads/image` | ADMIN | Upload image → storage URL + hash |

## Conventions

- Errors: `{ "success": false, "error": { "code": string, "message": string, "details"?: unknown } }`
- Success: `{ "success": true, "data": T, "meta"?: PaginationMeta }`
- Auth header: `Authorization: Bearer <accessToken>`
- Pagination: `?page=1&limit=20`
