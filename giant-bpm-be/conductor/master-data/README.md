# Master Data Module — Design & History

> Central reference for the `src/master-data/` module. Covers implementation ideas, current architecture, and the full evolution history across tickets.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Structure](#architecture--structure)
3. [Key Design Decisions](#key-design-decisions)
4. [Ticket History](#ticket-history)
5. [Pending / Future Work](#pending--future-work)
6. [Document Index](#document-index)

---

## Overview

The Master Data module provides a self-service reference-data store for the BPM platform. Admins define **datasets** (schema + metadata) and manage **records** via a generic CRUD API. Datasets can be backed either by a dedicated PostgreSQL table in a separate schema (`DATABASE` type) or by a remote HTTP endpoint (`EXTERNAL_API` type) where no physical table is created.

All write endpoints require `bpmRole === "admin"`. Read endpoints are open to any authenticated user.

---

## Architecture & Structure

### Source Files

| File | Responsibility |
|------|---------------|
| `master-data.controller.ts` | REST endpoints, admin guard, request/response mapping |
| `master-data-schema.service.ts` | Dataset lifecycle: create, delete, rename, schema evolution, export/import |
| `master-data-record.service.ts` | Record CRUD: insert, query, bulk-update, bulk-delete |
| `master-data-external-api.service.ts` | Fetch + field-map records from remote APIs; test-API utility |
| `utils.ts` | Stateless SQL helpers: identifier validation, type mapping, coercion |
| `constants.ts` | Virtual system datasets: `USERS`, `ORG_UNITS` |
| `dto/` | Request/response shapes for all endpoints |

### Dataset Types

```
source_type = DATABASE
  → Physical table in the master_data schema
  → Table name: md_<code_lowercase>
  → Supports: create, delete, rename, add/remove columns, record CRUD, export/import

source_type = EXTERNAL_API
  → No physical table
  → api_config (method, url, headers, pagination) + field_mappings stored as JSON
  → Read path fetches from remote API, applies field mapping + type coercion
  → Write operations (create/update/delete records) are blocked
```

### Database Schema Naming

The module uses a dedicated PostgreSQL schema separate from the main BPM schema:

| Environment | Schema name |
|------------|-------------|
| Local dev (`DB_SCHEMA` unset or `public`) | `master_data` |
| Remote (`DB_SCHEMA=dev`) | `dev_master_data` |
| Remote (`DB_SCHEMA=uat`) | `uat_master_data` |
| Remote (`DB_SCHEMA=prod`) | `prod_master_data` |

Resolved by `MasterDataUtils.getMasterDataSchemaName()` via `process.env.DB_SCHEMA`.

### System Datasets

Two virtual (read-only) datasets are surfaced through the same API but have no `DatasetDefinition` row — they query the main BPM tables directly:

| Code | Points to | Fields |
|------|-----------|--------|
| `USERS` | `users` table | id, code, name, email, job_grade |
| `ORG_UNITS` | `org_units` table | id, code, name, type, parent_id |

These cannot be modified or deleted.

### Field Types

| FieldType | PostgreSQL type | JS type after coercion |
|-----------|----------------|----------------------|
| `TEXT` | `VARCHAR(2000)` | `string` |
| `NUMBER` | `DECIMAL(20,5)` | `number` |
| `BOOLEAN` | `BOOLEAN` | `boolean` |
| `DATE` | `TIMESTAMP WITH TIME ZONE` | ISO string |

The `pg` driver returns `DECIMAL` columns as strings. `MasterDataUtils.coerceRowValues()` normalises all raw rows to the declared JS types before the response is sent.

### API Endpoints Summary

```
POST   /master-data                         Create dataset           [admin]
GET    /master-data                         List datasets
GET    /master-data/:code                   Get dataset definition
GET    /master-data/get-code/:name          Resolve name → code
DELETE /master-data/:code                   Delete dataset           [admin]
PATCH  /master-data/:code                   Rename dataset           [admin]
PATCH  /master-data/:code/schema            Add/remove columns       [admin] (hidden from OpenAPI)
PUT    /master-data/:code/schema            Rebuild schema (destructive) [admin]
PATCH  /master-data/:code/external-config   Update API config        [admin]
GET    /master-data/:code/export            Export definition+records
POST   /master-data/import                  Import definition+records [admin]

POST   /master-data/:code/records           Insert record(s)         [admin]
GET    /master-data/:code/records           Query records
PATCH  /master-data/:code/records           Bulk update records      [admin]
DELETE /master-data/:code/records           Bulk delete records      [admin]

POST   /master-data/external-api/test       Test API config          [admin]
```

---

## Key Design Decisions

### 1. Separate PostgreSQL schema for `md_*` tables

Custom dataset tables are stored in a dedicated schema (`master_data` / `<env>_master_data`) rather than the main BPM schema. This keeps dynamic DDL isolated, simplifies permission boundaries, and makes it easy to identify master-data tables in the DB.

### 2. `DatasetDefinition` as metadata registry

All datasets (both types) are registered in the `DatasetDefinition` Prisma model. The controller and record service always look up the definition first, so the physical table and the metadata stay in sync. The `table_name` field is an internal detail stripped from all API responses.

### 3. Transaction-wrapped DDL + metadata

`CREATE TABLE` / `ALTER TABLE` DDL is always wrapped in the same `$transaction()` as the `DatasetDefinition` create/update, so a failed DDL rolls back the metadata row and vice versa.

### 4. Schema initialisation via `onModuleInit`

The `CREATE SCHEMA IF NOT EXISTS` was deliberately moved out of the `createDataset` transaction into `MasterDataSchemaService.onModuleInit()`. PostgreSQL does not allow multiple commands in a single prepared statement; running `CREATE SCHEMA` inside a transaction via `$executeRawUnsafe` with another statement caused a "cannot insert multiple commands into a prepared statement" error. The lifecycle hook runs once at startup and is idempotent (checks `information_schema.schemata` before executing).

### 5. Environment-aware schema name format: `<env>_master_data`

Initially the naming convention was `master_data_<env>` (suffix). This was later **flipped** to `<env>_master_data` (prefix) to match the infrastructure team's requirements. A one-off rename SQL script (`prisma/rename-master-data-schema.sql`) handles the in-place rename in existing remote environments as part of the pre-migration step.

### 6. External API datasets share the same API surface

Rather than a separate resource, `EXTERNAL_API` datasets use the same `source_type` discriminator field in `DatasetDefinition`. The read path transparently delegates to `MasterDataExternalApiService.fetchAndMapRecords()`. Write operations are blocked with a `BadRequestException` at the service layer. This keeps the frontend API uniform regardless of the backing source.

### 7. Schema update: remove-then-add in one atomic call

`PATCH /:code/schema` processes **removals first**, then additions, in a single transaction. This avoids naming conflicts when swapping a column type (drop old, add new with same name). Required columns added to a non-empty table use a two-step DDL: `ADD COLUMN ... NOT NULL DEFAULT <x>` then `ALTER COLUMN ... DROP DEFAULT`, applying the default to existing rows without leaving a permanent default.

### 8. Type coercion after `$queryRawUnsafe`

The `pg` driver returns `DECIMAL`/`NUMERIC` columns as JavaScript strings to preserve precision. `MasterDataUtils.coerceRowValues()` is applied to all rows returned by `findRecords()` to produce native JS types. External API records are coerced inside `MasterDataExternalApiService.coerceValue()` using the same logic.

### 9. Schema rebuild via DROP + CREATE (GBPM-800)

`PUT /:code/schema` replaces the underlying table entirely. `ALTER COLUMN TYPE` is unsafe on populated tables — it fails on non-castable values and may silently corrupt data. The full-replace approach avoids this risk at the cost of data loss, which the caller must acknowledge via `confirm_data_loss: true`.

`PATCH /:code/schema` is retained for safe incremental add/remove but hidden from OpenAPI docs to avoid exposing it as the primary schema update path. `isSameSchema()` guards the PUT path — if the submitted schema is identical to the stored one (same field names, types, required, unique, default_value in the same order), the DDL is skipped and the current definition returned, preventing accidental data loss on no-op submissions.

---

## Ticket History

### Pre-ticket: Initial MVP

- DATABASE datasets with CRUD.
- Single PostgreSQL schema (`master_data`) with `md_*` table naming.
- `$queryRawUnsafe` for all record operations (dynamic schema prevents static Prisma models).

### Fix: Schema creation bug (`archive/fix-schema-creation-plan.md`)

**Problem:** `CREATE SCHEMA IF NOT EXISTS` inside the `createDataset` transaction caused  
`ERROR: cannot insert multiple commands into a prepared statement`.  
**Fix:** Extracted schema creation into `OnModuleInit.onModuleInit()`. Added an existence check to skip if the schema was pre-created by the DBA.  
**Status:** Implemented.

### GBPM-541 — External API dataset support (`guides/external-api-guide.md`)

**Problem:** Teams need to expose data from external HTTP services through the same master-data API without manually importing records.  
**Solution:**
- Added `source_type` discriminator (`DATABASE` | `EXTERNAL_API`) to `DatasetDefinition`.
- `EXTERNAL_API` datasets store `api_config` (URL, method, headers, pagination, data path) and `field_mappings` (remote field → local field name/type).
- `MasterDataExternalApiService` handles fetch, pagination, and field mapping.
- `POST /external-api/test` lets admins fire a test request and see the raw response for mapping.
- All write operations on EXTERNAL_API records are blocked.
- Admin guard (`isAdminUser` check in controller) added to all write endpoints.

**Commits:** `e7b410e`, `e1e268b`  
**Status:** Implemented.

### GBPM-614 — NUMBER type coercion in filter/update (`archive/gbpm-614-plan.md`, `archive/gbpm-614-review.md`)

**Problem:** Query-string filter values are always strings. When used in `$queryRawUnsafe` WHERE/SET clauses against `DECIMAL` columns, the pg driver throws a type mismatch 500 error.  
**Fix:** `MasterDataUtils.parseFieldValue()` converts filter and update values to the correct JS type (based on the dataset's field definitions) before binding them as Prisma parameters.  
**Status:** Implemented.

### Swagger enhancements (`archive/swagger-enhancement.md`)

**Problem:** `MasterDataController` was missing `@ApiBody`, `@ApiQuery`, and typed response decorators, making the Swagger UI unusable.  
**Fix:** Added full Swagger decorators to all endpoints.  
**Status:** Implemented.

### Environment-aware schema naming (two-phase)

**Phase 1 — Initial proposal** (`archive/schema-naming-proposal.md`):  
Format `master_data_<env>` (e.g. `master_data_dev`). Added `getMasterDataSchemaName()` to `MasterDataUtils` using `process.env.DB_SCHEMA`.

**Phase 2 — Format flip** (`archive/schema-naming-fix.md`):  
Infrastructure team required the prefix format `<env>_master_data` instead.  
- `getMasterDataSchemaName()` updated to return `${dbSchema}_master_data`.
- New migration script `prisma/rename-master-data-schema.sql` renames old-format schemas in-place (idempotent, reads GUC variables `custom.old_schema` / `custom.new_schema`).
- `run-pre-migration.sh` updated to compute both OLD and NEW schema names and run rename before the table-move step.

**Status:** Implemented. Current format confirmed: `<env>_master_data`.

### GBPM-700 — Schema update endpoints (`archive/gbpm-700-schema-update.md`)

**Problem:** No way to modify a dataset after creation — users had to delete and recreate, losing all data.  
**Solution:**
- `PATCH /:code` — rename the dataset display name (metadata only, no DDL).
- `PATCH /:code/schema` — add/remove columns atomically in one request:
  - Removals processed first, then additions, in one `$transaction`.
  - Required column + existing rows requires `default_value`; uses two-step DDL (add with default, drop default).
  - Blocked for EXTERNAL_API and system datasets.

**Status:** Implemented.

### GBPM-771 — Type coercion for GET records response (`archive/gbpm-771/plan.md`)

**Problem:** `findRecords()` returned `NUMBER` field values as strings (pg driver serialises `DECIMAL` as strings).  
**Fix:** `MasterDataUtils.coerceRowValues()` added; applied to every row returned by `findRecords()` for DATABASE datasets. EXTERNAL_API path already coerced values in `fetchAndMapRecords()`.  
**Status:** Implemented.

### GBPM-764 — `default_value` and `unique` column support (`archive/gbpm-764.md`, `archive/gbpm-764-default-value.md`)

**Problem:** Fields had no way to declare a default value or a UNIQUE constraint at creation time. Inserts that omitted a field always stored NULL.  
**Solution:**
- `DatasetFieldDto` extended with optional `default_value` and `unique` fields (persisted in the `fields` JSON column).
- `CREATE TABLE` DDL now emits `DEFAULT <literal>` and `UNIQUE` clauses when present.
- INSERT path reads `default_value` from the field definition and substitutes it when the caller omits that field.
- `AddFieldDto` (for `PATCH /:code/schema`) also accepts `default_value` and `unique`.

**Status:** Implemented. Commit `3509564`.

### GBPM-776 — External API field sync on config update (`archive/gbpm-776.md`, `archive/gbpm-776-external-api-column-sync.md`)

**Problem:** When `PATCH /:code/external-config` updated `field_mappings`, the `fields` JSON in `DatasetDefinition` was not updated. Subsequent reads and flow-engine expressions saw stale or missing columns.  
**Solution:** `updateExternalConfig` now syncs `fields` from the incoming `field_mappings.mappings` on every call: existing fields retain their type/required metadata; new mapping entries default to `TEXT`/not-required; removed entries are dropped.  
**Status:** Implemented. Commit `3509564`.

### GBPM-800 — Schema rebuild via DROP + CREATE (`archive/gbpm-800.md`, `archive/gbpm-800-schema-rebuild.md`)

**Problem:** `PATCH /:code/schema` only supported safe incremental add/remove. Type changes and renames were impossible — `ALTER COLUMN TYPE` is unsafe on populated tables.  
**Solution:**
- `PUT /:code/schema` added — accepts full desired schema (`fields[]`) + `confirm_data_loss: true`, drops the existing table, recreates it with the new schema in a single `$transaction`.
- `isSameSchema()` guard skips the DDL when the incoming schema is identical to the stored one (no-op protection).
- `PATCH /:code/schema` retained for safe add/remove but hidden from OpenAPI docs via `@ApiExcludeEndpoint()`.
- EXTERNAL_API and system datasets are rejected with appropriate 4xx errors.

**Status:** Implemented. Commits `b1f39d9` → `2a6816f` (amended).

---

## Pending / Future Work

### TTL Cache for External API fetching (`future/external-api-cache.md`)

Every paginated query on an EXTERNAL_API dataset re-fetches the full response from the remote service. A TTL-based in-memory (or Redis) cache per dataset code would reduce load and latency. Not yet implemented; low priority until external datasets see heavy production use.

---

## Document Index

### Root

| File | Topic | Status |
|------|-------|--------|
| `README.md` | This file — overview, architecture, design decisions & history | Current |

### `wip/` — In-progress tickets

_No active WIP documents._

### `guides/` — Active reference docs

| File | Topic |
|------|-------|
| `guides/external-api-guide.md` | External API dataset spec + frontend integration guide |
| `guides/schema-update-guide.md` | Frontend integration guide for schema update API |
| `guides/external-api-sample.md` | Sample request payloads for creating external API datasets |

### `future/` — Not yet implemented

| File | Topic |
|------|-------|
| `future/external-api-cache.md` | TTL cache proposal for external API dataset fetching |

### `archive/` — Completed ticket plans, reviews, superseded proposals

| File | Topic | Status |
|------|-------|--------|
| `archive/fix-schema-creation-plan.md` | Fix: move CREATE SCHEMA to onModuleInit | Implemented |
| `archive/gbpm-541-admin-guard.md` | Admin guard design for write endpoints | Implemented |
| `archive/gbpm-541-review.md` | Code review notes for GBPM-541 | Historical |
| `archive/gbpm-614-plan.md` | NUMBER type coercion bug fix plan | Implemented |
| `archive/gbpm-614-review.md` | Review + refinement of GBPM-614 fix | Historical |
| `archive/gbpm-700-schema-update.md` | Schema update endpoints design | Implemented |
| `archive/gbpm-771/plan.md` | Type coercion for GET records response | Implemented |
| `archive/gbpm-771/plan-type-coercion.md` | Extended analysis for GBPM-771 | Historical |
| `archive/gbpm-771/analysis-type-coercion.md` | Root cause analysis for GBPM-771 | Historical |
| `archive/schema-naming-proposal.md` | First env-aware schema naming proposal (`master_data_<env>`) | Superseded |
| `archive/schema-naming-fix.md` | Schema naming format flip to `<env>_master_data` + rename migration | Implemented |
| `archive/swagger-enhancement.md` | Swagger decorator enhancement plan | Implemented |
| `archive/gbpm-764.md` | GBPM-764 ticket spec and plan | Implemented |
| `archive/gbpm-764-default-value.md` | default_value and unique column support analysis | Implemented |
| `archive/gbpm-776.md` | GBPM-776 ticket spec and plan | Implemented |
| `archive/gbpm-776-external-api-column-sync.md` | External API field sync fix analysis | Implemented |
| `archive/gbpm-800.md` | GBPM-800 ticket spec | Implemented |
| `archive/gbpm-800-schema-rebuild.md` | Schema rebuild design decisions and endpoint spec | Implemented |
