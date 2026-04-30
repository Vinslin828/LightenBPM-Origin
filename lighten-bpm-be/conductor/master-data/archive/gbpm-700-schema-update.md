# [GBPM-700] Master Data Schema Update Support

## Context

The master-data module currently has no way to update a dataset after creation — no rename, no add/remove columns. Users must delete and recreate datasets to make any schema change, losing all data. This plan adds two new endpoints: one for renaming and one for schema evolution (add/remove fields).

## New Endpoints

### 1. `PATCH /master-data/:code` — Update dataset metadata (name)

**DTO:** `UpdateDatasetDto`

```typescript
{
  name?: string;  // New display name
}
```

**Service:** `MasterDataSchemaService.updateDataset(code, dto, userCode)`

- Guard: reject system datasets (USERS, ORG_UNITS)
- Validate name uniqueness (`findFirst({ where: { name, NOT: { code } } })`)
- Single Prisma `update` — no transaction needed

### 2. `PATCH /master-data/:code/schema` — Add/remove fields (DATABASE datasets only)

**DTO:** `UpdateDatasetSchemaDto`

```typescript
{
  add_fields?: AddFieldDto[];     // extends DatasetFieldDto + optional default_value
  remove_fields?: string[];       // field names to drop
}

// AddFieldDto
{
  name: string;                   // ^[a-z][a-z0-9_]*$
  type: FieldType;                // TEXT | NUMBER | BOOLEAN | DATE
  required: boolean;
  default_value?: string | number | boolean;  // Required when required=true and table has data
}
```

**Service:** `MasterDataSchemaService.updateDatasetSchema(code, dto, userCode)`

#### Validation

- Reject system datasets (USERS, ORG_UNITS) → `ConflictException`
- Reject EXTERNAL_API datasets → `BadRequestException` (they already have `PATCH /:code/external-config`)
- Reject if both `add_fields` and `remove_fields` are empty → `BadRequestException`
- `add_fields`: no duplicates vs existing fields or vs each other; no `id` field
- `remove_fields`: each must exist in current fields; no `id` field
- If `required=true` and table has existing rows and no `default_value` → `BadRequestException`

#### DDL Generation

Process **removals first**, then additions, within a single `$transaction()`:

```sql
-- 1. Remove columns
ALTER TABLE "master_data"."md_vendors" DROP COLUMN "old_col";

-- 2a. Add nullable column
ALTER TABLE "master_data"."md_vendors" ADD COLUMN "new_col" VARCHAR(2000);

-- 2b. Add required column (two-step: add with default, then drop default)
ALTER TABLE "master_data"."md_vendors"
  ADD COLUMN "status" VARCHAR(2000) NOT NULL DEFAULT 'active';
ALTER TABLE "master_data"."md_vendors"
  ALTER COLUMN "status" DROP DEFAULT;
```

#### Default Value Handling

When adding a `required=true` column to a table with existing rows:

1. Client **must** provide `default_value` in the DTO
2. We add the column with `NOT NULL DEFAULT <value>` — PostgreSQL applies the default to all existing rows
3. We immediately `DROP DEFAULT` so future inserts must explicitly provide the value
4. If table is empty, `default_value` is optional (no existing rows to backfill)

**Default value SQL conversion:**
- TEXT → `DEFAULT 'value'`
- NUMBER → `DEFAULT 123`
- BOOLEAN → `DEFAULT TRUE` / `DEFAULT FALSE`
- DATE → `DEFAULT 'value'::timestamptz`

#### Transaction Boundary

All DDL statements + `fields` JSON metadata update wrapped in `this.prisma.$transaction()`, matching the existing pattern used by `createDataset()` and `deleteDataset()`.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/master-data/dto/update-dataset.dto.ts` | **Create** | `UpdateDatasetDto` |
| `src/master-data/dto/update-dataset-schema.dto.ts` | **Create** | `AddFieldDto`, `UpdateDatasetSchemaDto` |
| `src/master-data/utils.ts` | **Modify** | Extract `fieldTypeToSql()` and add `defaultValueToSql()` |
| `src/master-data/master-data-schema.service.ts` | **Modify** | Add `updateDataset()` and `updateDatasetSchema()`, refactor `createDataset()` to use `fieldTypeToSql()` |
| `src/master-data/master-data.controller.ts` | **Modify** | Add two PATCH endpoints with admin guards |
| `src/master-data/master-data-schema.service.spec.ts` | **Modify** | Add unit tests for both new methods |
| `src/master-data/master-data.controller.spec.ts` | **Modify** | Add controller tests for both new endpoints |

## Utility Extraction (`utils.ts`)

Refactor the type-to-SQL switch from `createDataset()` (lines 130-143) into reusable methods:

```typescript
static fieldTypeToSql(type: FieldType): string {
  // TEXT → VARCHAR(2000), NUMBER → DECIMAL(20,5), BOOLEAN → BOOLEAN, DATE → TIMESTAMP WITH TIME ZONE
}

static defaultValueToSql(value: string | number | boolean, type: FieldType): string {
  // TEXT → 'value', NUMBER → numeric literal, BOOLEAN → TRUE/FALSE, DATE → 'value'::timestamptz
}
```

Update `createDataset()` to call `fieldTypeToSql()` instead of the inline switch.

## Safety Checks Summary

| Condition | Exception |
|-----------|-----------|
| System dataset (USERS, ORG_UNITS) | `ConflictException` |
| EXTERNAL_API dataset on schema endpoint | `BadRequestException` |
| Name conflicts with another dataset | `ConflictException` |
| Duplicate field name (add vs existing or add vs add) | `ConflictException` |
| Non-existent field in `remove_fields` | `BadRequestException` |
| Add/remove `id` field | `BadRequestException` |
| Required column + existing rows + no `default_value` | `BadRequestException` |
| Both `add_fields` and `remove_fields` empty | `BadRequestException` |

## Verification

1. `make lint` and `make format` pass
2. `pnpm test -- --testPathPattern=master-data` — all unit tests pass
3. Manual verification via Swagger UI:
   - Create a dataset with records → rename it → verify name changed
   - Add a nullable column → verify existing records have NULL
   - Add a required column with default → verify existing records have the default
   - Remove a column → verify it's gone from records and definition
   - Attempt invalid operations (system dataset, duplicate field, missing default) → verify correct errors
