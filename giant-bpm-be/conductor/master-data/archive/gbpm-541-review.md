# GBPM-541: External API Master Data — Code Review

## Overview

Extends `DatasetDefinition` with a `source_type` discriminator (`DATABASE` vs `EXTERNAL_API`) so external API-backed datasets are first-class alongside DB-backed ones. External datasets store API config and field mappings as metadata — no physical table is created. The read path transparently fetches from the remote API while write operations are blocked.

## What Works Well

- **Clean discriminator pattern** — `source_type` field with `ext_` table name prefix for external datasets. No DDL executed for API datasets.
- **Proper guard rails** — CUD operations on external API datasets throw `ForbiddenException`. Export/import also blocked with `BadRequestException`.
- **Conditional DTO validation** — `@ValidateIf` ensures `api_config` and `field_mappings` are only required when `source_type === EXTERNAL_API`.
- **Reuse of `ScriptExecutionService`** — Leverages existing sandboxed execution for fetch, consistent with how `Fetch` works in the flow engine.
- **Good separation of concerns** — New `MasterDataExternalApiService` handles API fetching, field mapping, and in-memory querying without polluting existing services.

## Issues

### High Priority

| # | Issue | Detail | Suggested Fix |
|---|-------|--------|---------------|
| 1 | **SSRF risk on `POST external-api/test`** | Any authenticated user can fire HTTP requests to arbitrary URLs from the server (internal AWS metadata, internal services, etc.). | Restrict endpoint to admin-only access. See `conductor/gbpm-541-admin-guard.md`. |
| 2 | **Every query re-fetches full API response** | `getRecords()` calls `fetchAndMapRecords()` on every paginated request. Browsing records = N full fetches to the external API. | Add TTL cache. Deferred — see `conductor/gbpm-541-external-api-cache.md`. |

### Medium Priority

| # | Issue | Detail | Suggested Fix |
|---|-------|--------|---------------|
| 3 | **`source_type` is free-form `String` in Prisma** | Schema stores it as `String @default("DATABASE")` but code uses `SourceType` enum. Nothing prevents invalid values at the DB level. | Use a Prisma-level `enum` or add a `CHECK` constraint in the migration SQL. |
| 4 | **`body` in `ApiConfigDto` typed as `string`** | `@IsString() body?: string`, but `buildFetchScript` passes it through `JSON.stringify(config.body)` — a JSON body string would be double-stringified. | Change to `@IsObject()` for JSON bodies, or adjust `buildFetchScript` to handle string vs object. |

### Low Priority

| # | Issue | Detail | Suggested Fix |
|---|-------|--------|---------------|
| 5 | **In-memory sort compares mixed types** | `applyInMemoryQuery` sorts with `aVal < bVal` which can produce unexpected results across types. Likely fine in practice since `coerceValue` normalizes types. | No action needed unless bugs surface. |
| 6 | **Missing `@ApiParam` on `PATCH :code/external-config`** | Other parameterized routes likely have `@ApiParam({ name: 'code' })` — this new one should match for Swagger consistency. | Add `@ApiParam({ name: 'code' })`. |
| 7 | **Migration SQL — check for `public.` prefix** | Per CLAUDE.md mandate, generated migration SQL must not contain `public.` schema prefix. | Verify and remove if present. |

## Files Changed (16 files, +981 / -34)

- `prisma/schema.prisma` — Added `source_type`, `api_config`, `field_mappings` to `DatasetDefinition`
- `src/master-data/master-data-external-api.service.ts` — New service: API fetching, field mapping, in-memory query
- `src/master-data/master-data-schema.service.ts` — Branching logic for external vs DB datasets on create/delete/list/export/import
- `src/master-data/master-data-record.service.ts` — External API fetch path in `getRecords`, write guards on CUD
- `src/master-data/master-data.controller.ts` — New endpoints: `POST external-api/test`, `PATCH :code/external-config`
- `src/master-data/master-data.module.ts` — Wired up `MasterDataExternalApiService` and `ScriptExecutionModule`
- `src/master-data/dto/` — New DTOs: `ApiConfigDto`, `DatasetFieldMappingsDto`, `TestExternalApiDto`, `UpdateExternalConfigDto`; updated `CreateDatasetDto` with `source_type` and conditional fields
- `e2e_tester/tests/test_master_data_external_api.py` — E2E coverage for the new feature
