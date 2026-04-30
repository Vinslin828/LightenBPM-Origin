## 1. Repository Implementation

- [x] 1.1 Add `findOverlappingMembership` to `OrgUnitRepository` in `src/org-unit/repository/org-unit.repository.ts`.
- [x] 1.2 Implement overlap logic: `start_date < endDate` AND `end_date > startDate` with `user_id` and `org_unit_id` filters (ignoring `assign_type`).

## 2. Service Layer Validation

- [x] 2.1 Update `createOrgMembership` in `src/org-unit/org-unit.service.ts` to check for overlaps and throw `BadRequestException`.
- [x] 2.2 Update `updateOrgMembership` in `src/org-unit/org-unit.service.ts` to check for overlaps (excluding current ID) and throw `BadRequestException`.

## 3. Bulk Import Enhancement

- [x] 3.1 Update `bulkImport` in `src/migration/migration.service.ts` to validate overlaps during membership updates in the bulk loop.
- [x] 3.2 Update `bulkImport` in `src/migration/migration.service.ts` to validate overlaps during membership creation in the bulk loop.
- [x] 3.3 Ensure descriptive error messages (e.g., "Failed at OrgMembership index ... overlap detected") are returned.

## 4. Verification

- [x] 4.1 Create a reproduction script `dev-utils/ts-node/reproduce_issue.ts` to verify overlapping constraints.
- [x] 4.2 Run E2E tests using `make test-local-e2e` to ensure no regressions and verify new validation rules.
- [x] 4.3 Manually verify single CRUD overlap prevention via API.
- [x] 4.4 Manually verify bulk import overlap prevention and rollback via API.
