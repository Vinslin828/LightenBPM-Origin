# Attachment Feature Refactor — Implementation Plan (v3)

## Background

The current attachment system ties S3 object paths and DB records to `serial_number`, which doesn't exist until an application is created. This prevents uploading files during draft creation.

**Core idea**: Use user-code-based S3 paths and a unified `Attachment` table that tracks the file lifecycle from presign through confirmation to binding. The S3 path never changes — only the DB record's binding state changes.

---

## Technical Review Notes

### Security: Binding Check

`bindDraftAttachments(draftId, serialNumber, userId, tx)` **must verify** that every attachment record's `uploaded_by === userId`. This prevents a malicious user from passing someone else's `draft_id` to hijack their uploads.

### Postponed: Abandoned Draft Cleanup

> [!NOTE]
> **Deferred to future discussion**: Files with `status=UPLOADED`, `draft_id` set, and `serial_number IS NULL` (user uploaded but never submitted) also need cleanup. A proposed approach is a scheduled job targeting records where `updated_at` is older than a configurable threshold (e.g., 7 days). This will be designed separately from the initial refactor.

---

## S3 Key Format

```
<user_code>/attachments/<uuid>_<filename>
```

| Aspect | Old | New |
|--------|-----|-----|
| Path | `<serial_number>/<field_key>/<uuid>_<file>` | `<user_code>/attachments/<uuid>_<file>` |
| Folder purpose | `attachments/` prefix separates from other potential bucket content | |

The `attachments/` folder layer provides namespace separation within the user's S3 "directory". If the bucket later stores other user-scoped data (e.g., avatars, exports), they can go under `<user_code>/avatars/` etc. without collision.

> [!TIP]
> Alternative folder options considered:
> - `<user_code>/<YYYY-MM>/<uuid>_<file>` — time-based partitioning (useful for lifecycle rules, but adds complexity)
> - `<user_code>/<uuid>_<file>` — flattest structure (simple, but no namespace separation)
>
> The `attachments/` prefix is recommended as the best balance of simplicity and extensibility.

---

## Schema Design

### New Enum: `AttachmentStatus`

```prisma
enum AttachmentStatus {
  PENDING    // Presigned URL issued, awaiting S3 upload
  UPLOADED   // File confirmed in S3
}
```

### New Unified Model: `Attachment` (replaces `InstanceAttachment` + `PendingUpload`)

```prisma
model Attachment {
  id            Int              @id @default(autoincrement())
  s3_key        String           @unique
  field_key     String                     // Form component name (DB-level tracking)
  file_name     String
  file_size     Int
  content_type  String
  remark        String?
  uploaded_by   Int
  status        AttachmentStatus @default(PENDING)

  // Binding context
  serial_number String?                    // Set when bound to an application instance
  draft_id      String?                    // Backend-generated UUID, cleared after binding

  created_at    DateTime         @default(now())
  updated_at    DateTime         @updatedAt
  expires_at    DateTime?                  // For PENDING cleanup

  @@index([serial_number, field_key])
  @@index([draft_id])
  @@index([uploaded_by])
  @@index([expires_at])
  @@map("attachments")

  // Relations
  application_instance ApplicationInstance? @relation(fields: [serial_number], references: [serial_number], onDelete: Cascade)
  uploader             User                @relation("AttachmentUploader", fields: [uploaded_by], references: [id])
}
```

---

## API Design

### Preserved APIs (same routes, adjusted internals)

| # | Method | Route | Change |
|---|--------|-------|--------|
| 1 | `POST` | `/applications/:sn/attachments/presign-upload` | S3 key uses `user.code`; creates `Attachment(PENDING, serial_number=sn)` |
| 2 | `POST` | `/applications/:sn/attachments` | Verify S3 → set `status=UPLOADED` (update in place) |
| 3 | `GET` | `/applications/:sn/attachments` | List where `serial_number=sn AND status=UPLOADED` |
| 4 | `GET` | `/applications/:sn/attachments/:id/download` | No change |
| 5 | `PATCH` | `/applications/:sn/attachments/:id` | No change |
| 6 | `DELETE` | `/applications/:sn/attachments/:id` | No change |

### New Draft APIs

| # | Method | Route | Description |
|---|--------|-------|-------------|
| 7 | `POST` | `/attachments/drafts/init` | Generates `draft_id` (UUID), returns it |
| 8 | `POST` | `/attachments/drafts/:draft_id/presign-upload` | Creates `Attachment(PENDING, draft_id)` |
| 9 | `POST` | `/attachments/drafts/:draft_id/confirm` | Verify S3 → set `status=UPLOADED` |
| 10 | `GET` | `/attachments/drafts/:draft_id` | List UPLOADED for this draft |
| 11 | `DELETE` | `/attachments/drafts/:draft_id/:id` | Delete record + S3 object |

**Draft flow**:
```
Frontend opens new form
  → POST /attachments/drafts/init
  ← { draft_id: "abc-123" }

User attaches files
  → POST /attachments/drafts/abc-123/presign-upload
  ← { upload_url, s3_key, expires_in }
  → Frontend PUTs file to S3

User confirms each upload
  → POST /attachments/drafts/abc-123/confirm  { s3_key }
  ← { id, field_key, file_name, ... }

User submits application
  → POST /applications/submission  { binding_id, form_data, draft_id: "abc-123" }
  ← Backend: createInstance → bindDraftAttachments(draft_id, serial_number, tx)
```

### Admin API

| # | Method | Route | Description |
|---|--------|-------|-------------|
| 12 | `GET` | `/attachments/admin/pending` | List expired PENDING attachments |
| 13 | `DELETE` | `/attachments/admin/pending/:id` | Purge expired + S3 |

---

## Proposed Changes

### Prisma Schema

#### [MODIFY] [schema.prisma](file:///Users/robertchen/Projects/lighten-bpm-be/prisma/schema.prisma)

- Add `AttachmentStatus` enum
- Add `Attachment` model
- Remove `InstanceAttachment` and `PendingUpload`
- Update `ApplicationInstance` and `User` relations

---

### Migration

#### [NEW] Prisma migration SQL

1. Create `AttachmentStatus` enum + `attachments` table
2. Migrate: `INSERT INTO attachments ... FROM instance_attachments` (status=`UPLOADED`)
3. Migrate: `INSERT INTO attachments ... FROM pending_uploads` (status=`PENDING`)
4. Drop old tables
5. Remove `public.` prefix per convention

> [!NOTE]
> Existing S3 objects keep old-format keys. They still work because download/delete reads `s3_key` from DB. Only new uploads use the new format.

---

## Attachment Module

#### [MODIFY] [attachment.repository.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/repositories/attachment.repository.ts)

- Work with unified `Attachment` model
- Add: `findByDraftId()`, `bindToSerialNumber(draftId, sn, tx)`, `findExpiredPending()`
- Keep: `findBySerialNumberAndField()`, `findById()`, `update()`, `delete()`

#### [DELETE] [pending-upload.repository.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/repositories/pending-upload.repository.ts)

#### [MODIFY] [attachment.service.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/attachment.service.ts)

- S3 key: `${user.code}/attachments/${uuid}_${safeFileName}`
- `presignUpload`: creates `Attachment(PENDING)` with `serial_number`
- `confirmUpload`: find by `s3_key`, update `status=UPLOADED`, set `remark`
- Add: `initDraft()`, `presignDraftUpload()`, `confirmDraftUpload()`, `listDraftAttachments()`, `deleteDraftAttachment()`
- Add: `bindDraftAttachments(draftId, sn, userId, tx)` — **includes `uploaded_by === userId` security check**
- Remove `PendingUploadRepository` dependency

#### [MODIFY] [attachment.module.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/attachment.module.ts)

- Remove `PendingUploadRepository`

#### [MODIFY] [attachment.controller.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/attachment.controller.ts)

- Pass `user: AuthUser` to service for `user.code`

#### [NEW] [draft-attachment.controller.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/draft-attachment.controller.ts)

- Init, presign, confirm, list, delete (routes 7–11)

#### [MODIFY] [attachment-admin.controller.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/attachment-admin.controller.ts)

- Change route prefix from `/admin/attachments/pending` to `/attachments/admin/pending`
- Use unified `Attachment` model

---

### DTOs

#### [MODIFY] [confirm-upload.dto.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/dto/confirm-upload.dto.ts)

- Keep only `s3_key` + `remark` (metadata stored from presign step)

#### [NEW] [draft-init-response.dto.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/dto/draft-init-response.dto.ts)

- Field: `draft_id: string`

#### [MODIFY] [pending-upload-response.dto.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/attachment/dto/pending-upload-response.dto.ts)

- Reflect unified model fields

#### Unchanged: `PresignUploadRequestDto`, `PresignUploadResponseDto`, `AttachmentResponseDto`, `DownloadResponseDto`, `UpdateAttachmentDto`

---

### Submission Integration

#### [MODIFY] [create-application-instance.dto.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/instance/dto/create-application-instance.dto.ts)

- Add optional `draft_id?: string`

#### [MODIFY] [application.controller.ts](file:///Users/robertchen/Projects/lighten-bpm-be/src/instance/application.controller.ts)

- Call `attachmentService.bindDraftAttachments(draft_id, serial_number, tx)` inside existing transaction
- Inject `AttachmentService`

#### [MODIFY] Instance module

- Import `AttachmentModule`

---

## Verification Plan

### Step 1: Compilation & Linting

```bash
make lint
make build
```

### Step 2: Database Migration

```bash
make migrate-dev name=refactor_attachment_unified_model
```

### Step 3: Unit Tests

```bash
make test
```

### Step 4: Dev Server Smoke Test

```bash
make dev
```

Manual verification via Swagger UI (`localhost:3000/bpm/openapi`):
1. **Existing flow**: presign → PUT S3 → confirm → list → download → delete
2. **Draft flow**: init → presign → PUT S3 → confirm → list → submit with `draft_id` → verify binding
3. **Admin**: list expired → purge

### Step 5: E2E Tests

```bash
make test-local-e2e
```

Additionally, run the Docker-based e2e tester (via `run-e2e-tests` skill) against the local dev server for full integration verification.
