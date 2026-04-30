# Plan: GBPM-771 — Type Coercion for GET master-data/{code}/records

## Context

The `GET /bpm/master-data/{code}/records` endpoint (defined at `src/master-data/master-data.controller.ts:291`) always returns record field values as strings, regardless of their declared column type (NUMBER, BOOLEAN, DATE). This misleads API consumers who expect native JavaScript types (numbers, booleans, ISO date strings) in the response.

**Root cause:** In `findRecords()` (`src/master-data/master-data-record.service.ts:308`), records are fetched via `$queryRawUnsafe` and returned directly without type coercion. The PostgreSQL `pg` driver has a known behavior of returning `DECIMAL`/`NUMERIC` columns as JavaScript **strings** (to avoid floating-point precision loss). BOOLEAN columns come back as booleans correctly, and TIMESTAMP columns as Date objects (which JSON-serialize to ISO strings). The missing piece is NUMBER columns.

**Existing pattern:** `MasterDataExternalApiService.coerceValue()` (`src/master-data/master-data-external-api.service.ts:130`) already solves this for EXTERNAL_API datasets. The fix is to extract that logic into `MasterDataUtils` and apply it to DATABASE dataset results.

---

## Implementation

### Step 1 — Add `coerceRowValues` to `MasterDataUtils`

**File:** `src/master-data/utils.ts`

Add a new static method after `parseFieldValue` (~line 109):

```typescript
/**
 * Coerces raw PostgreSQL row values to their declared JavaScript types.
 * The `pg` driver returns DECIMAL columns as strings; this method normalises
 * all field values to the types defined in the dataset schema.
 *
 * @param row   Raw row from $queryRawUnsafe
 * @param fieldTypeMap  Map of field name → FieldType (does NOT include "id")
 */
static coerceRowValues(
  row: Record<string, unknown>,
  fieldTypeMap: Map<string, FieldType>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      result[key] = null;
      continue;
    }
    const fieldType = fieldTypeMap.get(key);
    if (!fieldType) {
      // "id" and any unknown field: keep as-is (pg returns INT as number)
      result[key] = value;
      continue;
    }
    switch (fieldType) {
      case FieldType.NUMBER:
        result[key] = Number(value);
        break;
      case FieldType.BOOLEAN:
        result[key] = Boolean(value);
        break;
      case FieldType.DATE:
        result[key] =
          value instanceof Date
            ? value.toISOString()
            : new Date(value as string).toISOString();
        break;
      case FieldType.TEXT:
      default:
        result[key] = String(value);
    }
  }
  return result;
}
```

### Step 2 — Apply coercion in `findRecords()`

**File:** `src/master-data/master-data-record.service.ts`

At line ~308-312, change:

```typescript
// BEFORE
const items = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
  itemsSql,
  ...values,
);
```

To:

```typescript
// AFTER
const rawItems = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
  itemsSql,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  ...values,
);
const items = rawItems.map((row) =>
  MasterDataUtils.coerceRowValues(row, fieldTypeMap),
);
```

The `fieldTypeMap` (built at line 233) is already in scope at this point.

> Note: The EXTERNAL_API path in `findRecords()` already delegates to `externalApiService.fetchAndMapRecords()` which calls `coerceValue()` — no change needed there.

---

## Critical Files

| File | Change |
|------|--------|
| `src/master-data/utils.ts` | Add `coerceRowValues` static method |
| `src/master-data/master-data-record.service.ts` | Map raw items through `coerceRowValues` in `findRecords()` |

---

## Out of Scope

- `createRecord` / `updateRecord` / `deleteRecord` RETURNING results: these endpoints are write operations; the caller typically acts on success/failure, not field types. Not part of this bug report.
- System datasets (USERS, ORG_UNITS): their columns are `INTEGER`/`TEXT` (not `DECIMAL`), so `pg` already returns numbers/strings correctly.

---

## Verification

1. **Start dev server:** `make dev`
2. **Create a dataset with mixed field types** (TEXT, NUMBER, BOOLEAN, DATE) and insert a record.
3. **Call** `GET /bpm/master-data/{code}/records` and verify the response JSON contains:
   - NUMBER field → JavaScript number (not string)
   - BOOLEAN field → `true`/`false` (not `"true"`/`"false"`)
   - DATE field → ISO string like `"2025-01-01T00:00:00.000Z"` (not a Date object)
   - TEXT field → string (unchanged)
4. **Unit test:** Add a test for `MasterDataUtils.coerceRowValues` covering:
   - NUMBER string `"123.50"` → `123.5`
   - BOOLEAN raw postgres boolean `true` → `true`
   - DATE `Date` object → ISO string
   - `null` values remain `null`
   - Unknown key (`id`) passes through as-is
5. **Run:** `make test` — all tests green
6. **Run:** `make lint` — no new lint errors
