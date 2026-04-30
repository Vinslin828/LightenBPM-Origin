# Analysis Report — fe_validation Not Migrated on Form Export/Import

**Date:** 2026-04-14

## Problem Statement

QA reported that after performing a form export/import cycle (introduced in GBPM-740), the `fe_validation` field on imported `form_revisions` is always `null`, even when the source form had validation rules set. Frontend validation logic is therefore silently lost during cross-environment migrations.

## Context & Background

- `fe_validation` is a `JSONB` column added to `form_revisions` via migration `20260206091702_add_fe_validation_to_form_revision`.
- It stores frontend validation rules as JSON, surfaced as `validation` in API responses (see `form-revision.dto.ts`) and written via the `fe_validation` field in `CreateFormRevisionDto` / `UpdateFormRevisionDto`.
- The commit `e7c15d70` (GBPM-738/739/740) fixed five bugs in `migration.service.ts`:
  - Flat `validatorId` collection on export
  - Flat `validatorId` remapping on import
  - Dynamic dropdown master data extraction
  - Permission sync on form import
  - Permission sync on workflow import
- `fe_validation` was not part of that fix and was overlooked entirely.

## Findings

### Export gap — `buildFormPayload()` (`migration.service.ts` ~L412–426)

The `latest_revision` object returned by `buildFormPayload()` includes `form_schema` and `options` but **does not extract `fe_validation`** from the `latestRevision` database record.

### Type gap — `FormExportPayload` (`migration.types.ts` L16–52)

`FormExportPayload.latest_revision` has no `fe_validation` field declared. Even if the runtime value were added, TypeScript would reject the property without this type change.

### Import gap — `executeFormImport()`, update path (`migration.service.ts` ~L1226–1236)

When an existing revision is found in the target environment, `updateRevision()` is called without `fe_validation`.

### Import gap — `executeFormImport()`, create path (`migration.service.ts` ~L1246–1269)

When no matching revision exists, `createRevision()` is called without `fe_validation`.

### Repository layer — no changes needed

Both `createRevision()` and `updateRevision()` in `form.repository.ts` accept `Prisma.FormRevisionCreateInput` / `Prisma.FormRevisionUpdateInput` respectively, which already include `fe_validation`. The fix requires no repository changes.

## Impact Assessment

- **Data loss**: Every form with frontend validation rules loses those rules after import. The `fe_validation` column is `null` in the target environment.
- **Scope**: All form import operations — both standalone (`executeFormImport`) and bundled-with-workflow imports.
- **Users affected**: Any team importing forms across environments (dev → staging → UAT → prod) with validation rules configured.
- **Silent failure**: No error is thrown; the import reports success while dropping data.

## Recommended Approach

Three targeted additions, no structural changes:

1. Add `fe_validation: Prisma.InputJsonValue | null` to `FormExportPayload.latest_revision` in `migration.types.ts`.
2. Extract `fe_validation` from `latestRevision` in `buildFormPayload()` return value.
3. Pass `payload.latest_revision.fe_validation` in both the update and create paths of `executeFormImport()`.

No alternative approaches were considered — the fix is unambiguous. The repository layer already supports the field.
