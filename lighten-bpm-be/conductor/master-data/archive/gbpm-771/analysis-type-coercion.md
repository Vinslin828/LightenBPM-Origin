# Analysis Report — Master Data Record Type Coercion

**Date:** 2026-04-16

## Problem Statement

`GET /bpm/master-data/{code}/records` always returned field values as strings, regardless
of the declared column type (`NUMBER`, `BOOLEAN`, `DATE`). API consumers expecting native
JavaScript types (numbers, booleans, ISO date strings) received strings instead, requiring
them to parse values themselves.

## Context & Background

- The endpoint is implemented in `MasterDataRecordService.findRecords()`
  (`src/master-data/master-data-record.service.ts`).
- Records are fetched via Prisma's `$queryRawUnsafe`, which passes through raw values from
  the `pg` Node.js driver.
- The `pg` driver has a known behaviour: `DECIMAL`/`NUMERIC` PostgreSQL columns are returned
  as JavaScript **strings** (to avoid floating-point precision loss). `BOOLEAN` columns come
  back as JS booleans and `TIMESTAMP WITH TIME ZONE` as `Date` objects — but neither of these
  was being normalised to a consistent output format either.
- `MasterDataExternalApiService.coerceValue()` (`src/master-data/master-data-external-api.service.ts:130`)
  already solved this for `EXTERNAL_API` datasets. The `DATABASE` dataset path had no equivalent.
- A `fieldTypeMap` (built at line 233 of the record service) is already in scope at the point
  of the raw query — making coercion straightforward to apply.

## Findings

### Root Cause
`findRecords()` returned the raw `pg` rows directly without type normalisation. The `pg`
driver serialises `DECIMAL(20,5)` as a JS string to avoid precision loss. This is the primary
defect; `DATE` columns returned as `Date` objects (not ISO strings) were a secondary
inconsistency.

### Edge Cases
- **`null` / `undefined` values** — must pass through as `null`, not be coerced.
- **`id` column** — not in `fieldTypeMap`; `pg` already returns `INTEGER` primary keys as JS
  numbers, so unknown keys must bypass coercion.
- **Partial `_select` queries** — `fieldTypeMap` covers all dataset fields regardless of which
  subset is selected; unknown-key pass-through handles the `id` column correctly here too.
- **`EXTERNAL_API` path** — already handled by `externalApiService.fetchAndMapRecords()`;
  no change needed.

### Risks
- Calling `String(value)` on `unknown` triggers `@typescript-eslint/no-base-to-string`
  because `value` could be an object. For `TEXT` columns `pg` always returns a JS string,
  so a direct cast (`value as string`) is safe and satisfies the linter.

## Impact Assessment

- **Affected endpoint:** `GET /bpm/master-data/{code}/records` for `DATABASE` source datasets.
- **Affected field types:** `NUMBER` (returned as string `"123.45"` instead of `123.45`).
- **Consumers broken:** Any client code comparing `score === 100` or doing arithmetic on
  returned values without explicit `Number()` conversion.
- **Scope:** `master-data` module only. Write endpoints and system datasets (`USERS`,
  `ORG_UNITS`) are not affected.

## Recommended Approach

Extract a `MasterDataUtils.coerceRowValues(row, fieldTypeMap)` static method (parallel to the
existing `parseFieldValue`) and apply it in `findRecords()` immediately after the raw query.
This keeps coercion logic in one place, reuses the already-in-scope `fieldTypeMap`, and
mirrors the existing pattern used for `EXTERNAL_API` datasets.

**Alternatives considered:**
- Patching `pg` type parsers globally — rejected; too broad, affects unrelated queries.
- Coercing in the controller layer — rejected; service should own data shape, not the
  controller.
- Changing the SQL to cast columns (`CAST(score AS FLOAT)`) — rejected; more complex to
  maintain as schema evolves dynamically.
