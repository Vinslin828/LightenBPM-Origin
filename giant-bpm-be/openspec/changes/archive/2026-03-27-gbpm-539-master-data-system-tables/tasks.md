# Implementation Tasks

- [x] Task 1: Create `constants.ts` in `src/master-data` with `SYSTEM_DATASETS` definitions for `USERS` and `ORG_UNITS`.
- [x] Task 2: Modify `MasterDataSchemaService` to return `SYSTEM_DATASETS` when queried by code, and ignore them during physical table operations. Update `listDatasets` if needed.
- [x] Task 3: Modify `MasterDataRecordService` to resolve table names to `users` and `org_units` for system datasets in `findRecords`, and strictly block mutations (`createRecord`, `updateRecords`, `deleteRecords`).
- [x] Task 4: Add E2E tests in `e2e_tester/tests/test_master_data.py` to verify:
  - Reading schema for `USERS` / `ORG_UNITS` succeeds.
  - Reading records for `USERS` / `ORG_UNITS` succeeds.
  - Creating/Updating/Deleting records for `USERS` / `ORG_UNITS` throws a 403 Forbidden.
- [x] Task 5: Run linter, formatter, and local E2E tests to verify correctness.