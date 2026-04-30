# GBPM-800: Schema Rebuild (Drop & Recreate)

**Status:** Planned — pending FE alignment on PUT body shape
**Date:** 2026-04-23

---

## Context & Motivation

The existing `PATCH /:code/schema` only supports incremental `ALTER TABLE ADD/DROP COLUMN`. It cannot handle:
- Type changes (e.g. TEXT → NUMBER)
- Renames

`ALTER COLUMN TYPE` on a populated table is unsafe — it fails if any existing value is not castable to the new type, and may silently corrupt data even when it succeeds.

The agreed solution: **destructive rebuild** (DROP + RECREATE) for any schema operation that cannot be done safely in-place. The user must explicitly confirm data loss before the operation proceeds.

---

## Final Design Decisions

| Concern | Decision |
|---------|----------|
| Endpoint strategy | Keep `PATCH /:code/schema` for safe incremental add/remove; add `PUT /:code/schema` for full schema replace |
| PUT body shape | `fields[]` (full desired state) — delta approach can't express type changes unambiguously |
| PATCH scope | Add/remove columns only. Type changes and renames never supported — by design, forever |
| Type change → rebuild? | Yes. ALTER COLUMN TYPE is unsafe on populated tables |
| Remove column | Requires `confirm_data_loss: true` (local-db only — data is permanently dropped) |
| Add nullable column | Safe, no confirmation needed |
| Add required column | Needs `default_value` for backfill; backfills rows then drops DB DEFAULT |
| EXTERNAL_API datasets | Both PATCH and PUT reject them. Schema managed via `PATCH /:code/external-config` exclusively |
| `confirm_data_loss` location | Request body — forces intentional FE payload |
| DDL atomicity | DROP + CREATE + metadata update in single `$transaction()` (PostgreSQL DDL is transactional) |
| `DatasetDefinition` row | Updated in-place: `id`, `code`, `name`, `created_by`, `table_name` preserved; only `fields` + `updated_by` change |

---

## Endpoint Boundaries

```
PATCH /:code/schema   — incremental, data-safe (add/remove nullable columns)
PUT   /:code/schema   — full replace, destructive (add/remove/rename/retype)

PATCH /:code/external-config — EXTERNAL_API only; no DDL; syncs field_mappings + fields
```

These boundaries must be documented in the OpenAPI spec. FE must not expect type changes from PATCH.

---

## New Endpoint: `PUT /master-data/:code/schema`

### DTO: `RebuildDatasetSchemaDto`

**File to create:** `src/master-data/dto/rebuild-dataset-schema.dto.ts`

```typescript
export class RebuildDatasetSchemaDto {
  @ApiProperty({ type: [DatasetFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatasetFieldDto)
  fields: DatasetFieldDto[];       // Complete new schema — replaces old entirely

  @ApiProperty({ description: 'Must be true to confirm permanent data loss.' })
  @IsBoolean()
  confirm_data_loss: boolean;
}
```

`DatasetFieldDto` is reused directly (includes `default_value` and `unique` after GBPM-764).

### Service Method: `rebuildDatasetSchema`

**File:** `src/master-data/master-data-schema.service.ts`

Steps:
1. Reject system datasets (`SYSTEM_DATASETS[code]` → `ConflictException`)
2. Reject if `confirm_data_loss !== true` → `BadRequestException`
3. Load definition; `NotFoundException` if not found
4. Reject `EXTERNAL_API` source type → `BadRequestException`
5. Filter out any `id` field from incoming `fields`
6. Build `DROP TABLE` and `CREATE TABLE` SQL using `MasterDataUtils.quoteIdentifier` + `fieldTypeToSql`
7. Atomic transaction: DROP → CREATE → `datasetDefinition.update({ fields, updated_by })`

### Controller

**File:** `src/master-data/master-data.controller.ts`

```typescript
@Put(':code/schema')
@ApiOperation({ summary: 'Rebuild dataset schema (destructive — all data deleted)' })
async rebuildDatasetSchema(
  @Param('code') code: string,
  @Body() dto: RebuildDatasetSchemaDto,
  @CurrentUser() user: AuthUser,
) { ... }
```

---

## Files to Create / Modify

| File | Action | Change |
|------|--------|--------|
| `src/master-data/dto/rebuild-dataset-schema.dto.ts` | **Create** | `RebuildDatasetSchemaDto` |
| `src/master-data/master-data-schema.service.ts` | **Modify** | Add `rebuildDatasetSchema()` |
| `src/master-data/master-data.controller.ts` | **Modify** | Add `PUT /:code/schema` |
| `src/master-data/master-data-schema.service.spec.ts` | **Modify** | Tests for rebuild |
| `src/master-data/master-data.controller.spec.ts` | **Modify** | Controller test for PUT |

---

## Open Item

**FE alignment required before implementation:** The PUT body (`fields[]` full state) is a new contract. FE must confirm they can send the complete desired schema rather than a delta before this endpoint is built.

---

## Verification

1. `pnpm test -- --testPathPattern=master-data` — all tests pass
2. `make lint && make format`
3. Run e2e suite via `run-e2e-tests` skill
4. Manual (Swagger):
   - Create dataset with TEXT field → insert records → `PUT /:code/schema` with `confirm_data_loss: true` and NUMBER field → table is empty with new schema
   - `PUT` with `confirm_data_loss: false` → 400
   - `PUT` on system dataset (`USERS`, `ORG_UNITS`) → 409
   - `PUT` on EXTERNAL_API dataset → 400
   - `GET /:code` after rebuild → updated `fields`, original `code` + `name` + `created_by`
