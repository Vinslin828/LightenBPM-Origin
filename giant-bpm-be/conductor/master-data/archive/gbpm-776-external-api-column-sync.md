# GBPM-776: External API Column Not Appearing After Mapping Update

**Status:** Proposed  
**Date:** 2026-04-22

---

## Problem

After calling `PATCH /master-data/:code/external-config` to add a new column mapping to an External API dataset, the table view does not display the new column. The API returns a 200 success response, but the column is missing from subsequent `GET /:code` and `GET /:code/records` responses.

---

## Root Cause Analysis

### Two separate data structures that must stay in sync

`DatasetDefinition` stores two independent JSON columns:

| Column | Purpose |
|--------|---------|
| `fields` | Authoritative column list: `{ name, type, required }[]` — drives the table view, definition response, and type coercion |
| `field_mappings` | Remote API extraction config: `{ records_path, mappings: [{ field_name, json_path }][] }` — drives which values are pulled from the API response |

When a dataset is **created** (`createDataset`), both are populated together. But when **updated** via `updateExternalConfig`, only `field_mappings` is saved.

### The gap in `updateExternalConfig`

**File:** `src/master-data/master-data-schema.service.ts:306-350`

```typescript
if (dto.field_mappings) {
  updateData.field_mappings = dto.field_mappings as unknown as Prisma.InputJsonValue;
  // ← `fields` is NEVER updated here
}
```

### What each consumer uses

| Consumer | Uses `fields` | Uses `field_mappings` |
|----------|--------------|----------------------|
| `GET /:code` (definition response) | ✓ column list | — |
| `GET /:code/records` (fetchAndMapRecords) | ✓ for type coercion only | ✓ to determine which columns to return |
| `PATCH /:code/schema` | ✓ validates add/remove | — |

After `PATCH external-config` adds a new mapping:
- `field_mappings` is updated → `fetchAndMapRecords` returns the new column's data ✓
- `fields` is stale → definition response shows old columns; type coercion misses the new field ✗
- Result: new column data comes back from the API but is never shown because `fields` doesn't list it

---

## Migration Risk

Existing EXTERNAL_API datasets may already have `fields` and `field_mappings` out of sync from prior edits. A one-off data migration is **not required** — the reconciliation happens automatically on the next `PATCH /:code/external-config` call. This should be noted in the implementation comment.

---

## Proposed Fix

### Auto-sync `fields` from `field_mappings` in `updateExternalConfig`

**File:** `src/master-data/master-data-schema.service.ts` — inside the `if (dto.field_mappings)` branch

```typescript
if (dto.field_mappings) {
  updateData.field_mappings = dto.field_mappings as unknown as Prisma.InputJsonValue;

  // Auto-sync `fields` from the incoming `field_mappings`.
  // Fields already in `definition.fields` preserve their type/required.
  // New fields default to TEXT / not-required.
  // Fields removed from mappings are dropped from `fields`.
  // Note: existing datasets with stale `fields` are reconciled on the next call here
  // — no data migration required.
  const currentFields = definition.fields as unknown as DatasetFieldDto[];
  const existingFieldMap = new Map(currentFields.map((f) => [f.name, f]));

  const syncedFields: DatasetFieldDto[] = dto.field_mappings.mappings.map(
    (m): DatasetFieldDto =>
      existingFieldMap.get(m.field_name) ?? {
        name: m.field_name,
        type: FieldType.TEXT,
        required: false,
      },
  );

  updateData.fields = syncedFields as unknown as Prisma.InputJsonValue;
}
```

**Sync rules:**
- Existing field in `fields` matching a mapping → **preserved** (type and required carry over)
- New `field_name` in mappings not yet in `fields` → **added** as `TEXT / required: false`
- Field in `fields` whose name is **no longer** in the new mappings → **dropped**

No DTO changes needed. The caller still sends only `field_mappings`; the sync is transparent.

`FieldType` is already imported in `master-data-schema.service.ts`.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/master-data/master-data-schema.service.ts` | Auto-sync `fields` from `field_mappings` in `updateExternalConfig` |
| `src/master-data/master-data-schema.service.spec.ts` | New tests for the sync logic |

---

## New Tests (`master-data-schema.service.spec.ts`)

```
describe('updateExternalConfig')
  it: syncs fields when field_mappings is provided — new field added, existing field preserved, removed field dropped
  it: does NOT touch fields when only api_config is provided (no field_mappings in DTO)
  it: throws NotFoundException if dataset not found
  it: throws BadRequestException for DATABASE source_type datasets
```

---

## Verification

1. `pnpm test -- --testPathPattern=master-data` — all tests pass
2. `make lint`
3. Manual (Swagger):
   - Create EXTERNAL_API dataset with two mappings → PATCH external-config adding a third → GET definition → confirm `fields` has all three entries
   - PATCH again removing one mapping → GET definition → confirm the removed field is gone from `fields`
   - PATCH with only `api_config` (no `field_mappings`) → GET definition → confirm `fields` is unchanged
