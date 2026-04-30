# Implementation Plan — Master Data Record Type Coercion

**Date:** 2026-04-16
**Linked Analysis:** analysis-type-coercion.md
**Commit:** `07765e1` on branch `develop`
**Status:** COMPLETED

## Objective

Ensure `GET /master-data/{code}/records` returns `NUMBER`, `BOOLEAN`, and `DATE` field values
as their declared JavaScript types rather than raw `pg` driver strings.

## Scope

| Module | File | Role |
|--------|------|------|
| `master-data` | `src/master-data/utils.ts` | New `coerceRowValues` utility method |
| `master-data` | `src/master-data/master-data-record.service.ts` | Apply coercion in `findRecords()` |
| `e2e_tester` | `e2e_tester/tests/test_master_data.py` | New type-coercion E2E test |

## Implementation Steps

1. **Add `MasterDataUtils.coerceRowValues()` to `utils.ts`** (after `parseFieldValue` ~line 109)
   - Signature: `static coerceRowValues(row: Record<string, unknown>, fieldTypeMap: Map<string, FieldType>): Record<string, unknown>`
   - `null`/`undefined` → pass through as `null`
   - Key not in `fieldTypeMap` (e.g. `id`) → pass through as-is
   - `NUMBER` → `Number(value)`
   - `BOOLEAN` → `Boolean(value)`
   - `DATE` → `value instanceof Date ? value.toISOString() : new Date(value as string).toISOString()`
   - `TEXT` → `value as string` (not `String(value)` — avoids lint rule `no-base-to-string`)

2. **Apply coercion in `findRecords()` in `master-data-record.service.ts`** (~line 308)
   - Rename `items` → `rawItems` from the `$queryRawUnsafe` call
   - Map: `const items = rawItems.map(row => MasterDataUtils.coerceRowValues(row, fieldTypeMap))`
   - `fieldTypeMap` is already in scope (built at line 233); no additional parameters needed
   - The `EXTERNAL_API` branch (lines 208–228) is untouched

3. **Add `test_master_data_type_coercion` to `test_master_data.py`**
   - Create a dataset with `TEXT`, `NUMBER`, `BOOLEAN`, `DATE` fields
   - Insert one fully-populated record and one with all nullable fields set to `None`
   - Assert `isinstance(score, (int, float))` — not string
   - Assert `isinstance(active, bool)`
   - Assert `isinstance(effective_date, str)` and contains expected date substring
   - Assert null fields return `None`
   - Cleanup dataset in `finally` block

## Migration / Data Considerations

None — this is a pure read-path fix. No schema changes, no Prisma migration, no seed updates.
Existing stored data is unaffected.

## Testing Checklist

- [x] `make lint` — clean (fixed `no-base-to-string` by using `value as string`)
- [x] `make test` — 1246 unit tests all pass
- [x] E2E `test_master_data_type_coercion` — PASSED
- [x] All existing `test_master_data.py` tests — 8/8 PASSED
- [x] All existing `test_master_data_external_api.py` tests — 5/5 PASSED
- [ ] Manual smoke test against dev environment with mixed-type dataset (optional)

## Rollback Plan

Revert commit `07765e1`:

```bash
git revert 07765e1
```

This removes `coerceRowValues` from `utils.ts`, restores the original direct assignment in
`findRecords()`, and removes the new E2E test. No database changes to undo.
