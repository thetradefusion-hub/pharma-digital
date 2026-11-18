# Database Schema

PostgreSQL via Prisma. All primary keys are UUID (`uuid()`). Soft delete via `deletedAt` where noted.

## Enums

- `RoleName`: `ADMIN` | `MOBILE_USER`
- `PublicationStatus`: `DRAFT` | `PUBLISHED` | `ARCHIVED`
- `SlideType`: `IMAGE` | `PRODUCT_INTRO` | `COMPOSITION` | `PRODUCT_INFO` | `BENEFITS` | `INFOGRAPHIC` | `CUSTOM` | `PRESCRIBING_INFO`
- `ActivityAction`: `CREATED` | `UPDATED` | `DELETED` | `PUBLISHED` | `UNPUBLISHED` | `LOGIN` | `STATUS_CHANGED` | `PASSWORD_RESET`

## Entities

### User
- id, email (unique), username (unique), passwordHash
- roleId → Role
- fullName, isActive
- lastLoginAt, createdAt, updatedAt, deletedAt

### Role
- id, name (unique enum), description

### Category
- id, name, description, imageUrl, imageHash
- displayOrder, isActive
- createdAt, updatedAt, deletedAt

### Product
- id, name, brandName, genericName, sku (unique)
- categoryId → Category
- composition, strength, dosageForm, packSize
- description, approvedIndications, keyInformation, highlights
- prescribingInfo, precautions, storageInstructions
- displayOrder, status (`PublicationStatus`)
- featured, createdAt, updatedAt, deletedAt
- Indexes: name, brandName, sku, status, categoryId

### ProductImage
- id, productId → Product
- url, publicId, contentHash, altText
- displayOrder, isPrimary
- createdAt, updatedAt

### Presentation
- id, productId → Product (unique 1:1)
- title, status (`PublicationStatus`)
- version, publishedAt
- createdAt, updatedAt, deletedAt

### PresentationSlide
- id, presentationId → Presentation
- title, subtitle, slideType
- backgroundColor, backgroundImageUrl, backgroundImageHash
- mainImageUrl, mainImageHash, secondaryImageUrl, secondaryImageHash
- description, bulletPoints (JSON string[]), highlightText
- content (JSON — typed by slideType schema)
- displayOrder, isActive
- createdAt, updatedAt, deletedAt

### CatalogueVersion
- id, version (int, unique, auto-increment semantics)
- label, notes, isPublished
- publishedAt, publishedById → User
- manifestHash
- createdAt, updatedAt

### CatalogueChange
- id, catalogueVersionId → CatalogueVersion
- entityType, entityId, changeType (`CREATED` | `UPDATED` | `DELETED`)
- summary, createdAt

### DownloadAsset
- id, entityType, entityId
- assetType (`IMAGE` | `SLIDE_ASSET` | `OTHER`)
- url, publicId, contentHash, mimeType, byteSize
- createdAt, updatedAt

### AdminActivityLog
- id, userId → User
- action, entityType, entityId
- summary, metadata (JSON)
- ipAddress, createdAt

### RefreshToken
- id, userId → User
- tokenHash, expiresAt, revokedAt
- createdAt

## Mobile SQLite (offline mirror)

- `local_categories`, `local_products`, `local_product_images`
- `local_presentations`, `local_slides`
- `local_downloads`, `local_sync_metadata`

Mirrors published catalogue fields needed for offline browse/search/presentation. Tokens are **not** stored in SQLite.
