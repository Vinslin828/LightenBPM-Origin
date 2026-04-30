# GBPM-764: Default Values + Unique Constraint Support

**Status:** In Progress
**Date:** 2026-04-23

---

## Problem

Two column-level features are missing from the current `DatasetFieldDto` and the underlying implementation:

1. **Default values** — when a new row is inserted via `POST /:code/records` without supplying a field, the row gets `NULL` instead of the configured default value.
2. **Unique constraints** — there is no way to declare a column as unique; the DDL never emits a `UNIQUE` constraint.

Both features share the same root: `DatasetFieldDto` is missing the fields, and the DDL/insert paths don't account for them.

---

## Root Cause Analysis

### Layer 1 — DTO: missing fields

**File:** `src/master-data/dto/create-dataset.dto.ts:29-42`

`DatasetFieldDto` only carries `name`, `type`, and `required`. No `default_value`, no `unique`.

`AddFieldDto` (used for schema PATCH) has `default_value?: string | number | boolean` but only for DDL backfill — it is stripped before persisting to the fields JSON.

### Layer 2 — Schema storage: `default_value` stripped, `unique` never stored

**File:** `src/master-data/master-data-schema.service.ts:496-502`

```typescript
// Current — strips both fields
...addFields.map(({ name, type, required }): DatasetFieldDto => ({
  name, type, required,
})),
```

### Layer 3 — Record insert: no defaults applied

**File:** `src/master-data/master-data-record.service.ts:82-177`

`createRecord` builds INSERT SQL from the incoming request body keys only. Missing fields produce `NULL`.

### Layer 4 — DDL: no UNIQUE constraint emitted

**File:** `src/master-data/master-data-schema.service.ts:129-133` (createDataset) and `516-540` (updateDatasetSchema)

Column DDL only emits `NOT NULL`; `UNIQUE` is never included.

---

## Fix

### 1. Extend `DatasetFieldDto`

**File:** `src/master-data/dto/create-dataset.dto.ts`

```typescript
@ApiPropertyOptional({
  description: 'Default value applied when field is omitted on insert.',
  example: 'pending',
})
@IsOptional()
default_value?: string | number | boolean;

@ApiPropertyOptional({
  description: 'Adds a UNIQUE constraint to the column.',
  example: false,
})
@IsOptional()
@IsBoolean()
unique?: boolean;
```

`createDataset` uses `filteredFields` (line 91-92) which carries all DTO properties — no additional change needed there.

### 2. Extend `AddFieldDto`

**File:** `src/master-data/dto/update-dataset-schema.dto.ts`

Add `unique?: boolean` with the same decorator pattern so column additions via `PATCH /:code/schema` can declare uniqueness.

### 3. Persist both fields in `updateDatasetSchema`

**File:** `src/master-data/master-data-schema.service.ts` ~line 496

```typescript
...addFields.map(
  ({ name, type, required, default_value, unique }): DatasetFieldDto => ({
    name,
    type,
    required,
    ...(default_value !== undefined && { default_value }),
    ...(unique !== undefined && { unique }),
  }),
),
```

### 4. Emit UNIQUE in DDL — `createDataset`

**File:** `src/master-data/master-data-schema.service.ts:129-133`

```typescript
// Before
`${name} ${typeSql} ${field.required ? 'NOT NULL' : ''}`
// After
`${name} ${typeSql} ${field.required ? 'NOT NULL' : ''} ${field.unique ? 'UNIQUE' : ''}`.trim()
```

### 5. Emit UNIQUE in DDL — `updateDatasetSchema` add_fields

**File:** `src/master-data/master-data-schema.service.ts:516-540`

Append `UNIQUE` to each `ALTER TABLE ADD COLUMN` statement when `field.unique === true`.

### 6. Validate: required + unique + existing rows

Adding a `required: true, unique: true` column to a table that already has rows would backfill all rows with the same `default_value`, immediately violating the UNIQUE constraint. Reject with `BadRequestException` before executing any DDL.

Adding a `required: false, unique: true` column is safe — PostgreSQL treats multiple NULLs as distinct in UNIQUE constraints.

### 7. Apply defaults in `createRecord`

**File:** `src/master-data/master-data-record.service.ts` — after `fieldTypeMap` is built

```typescript
const defaultsMap: Record<string, unknown> = {};
for (const field of fields) {
  if (field.default_value !== undefined) {
    defaultsMap[field.name] = field.default_value;
  }
}

const applyDefaults = (r: Record<string, unknown>): Record<string, unknown> => ({
  ...defaultsMap,
  ...r, // incoming values override defaults
});

const rawRecords = Array.isArray(data) ? data : [data];
const records = rawRecords.map(applyDefaults);
```

Covers both single-record and bulk-insert paths.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/master-data/dto/create-dataset.dto.ts` | Add `default_value` + `unique` to `DatasetFieldDto` |
| `src/master-data/dto/update-dataset-schema.dto.ts` | Add `unique` to `AddFieldDto` |
| `src/master-data/master-data-schema.service.ts` | Persist both fields; emit UNIQUE in DDL; validate required+unique+rows |
| `src/master-data/master-data-record.service.ts` | Apply field defaults before INSERT |
| `src/master-data/master-data-schema.service.spec.ts` | Tests: default_value persisted; unique DDL emitted; required+unique+rows rejected |
| `src/master-data/master-data-record.service.spec.ts` | Tests: defaults applied; incoming value overrides default |

---

## Verification

1. `pnpm test -- --testPathPattern=master-data` — all tests pass
2. `make lint && make format`
3. Run e2e suite via `run-e2e-tests` skill
4. Manual (Swagger):
   - Create dataset with `status: TEXT, default_value: "pending"` → POST record without `status` → row has `"pending"`
   - POST record with `status: "done"` → `"done"` wins
   - Create dataset with `code: TEXT, unique: true` → insert duplicate `code` → expect DB constraint error
   - PATCH add_fields with `unique: true` on empty table → GET definition → `unique: true` present in fields
   - PATCH add_fields with `required: true, unique: true` on table with rows → expect `400`
