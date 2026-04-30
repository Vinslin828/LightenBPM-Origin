## Why

To maintain data integrity and a clean historical record, the system must ensure that `OrgMembership` date ranges for the same user and organization unit do not overlap, regardless of their assignment type. A user should only have one primary relationship with an organization unit at any given time (whether as a regular user or a head). Overlapping records can cause ambiguity in determining active roles and responsibilities, leading to potential business process failures.

## What Changes

- **OrgUnitRepository**: Introduce `findOverlappingMembership` to query for conflicting date ranges within the same user/org context, treating all `AssignType` values as mutually exclusive for the same period.
- **OrgUnitService**: Implement validation logic in `createOrgMembership` and `updateOrgMembership` to prevent saving overlapping records across any assignment type.
- **MigrationService**: Enhance the `bulkImport` process to perform overlapping checks for each membership record in the payload, ensuring consistency even during large-scale data updates.
- **Error Handling**: Standardize the `BadRequestException` message for overlap detections and ensure that bulk imports roll back the entire transaction upon failure.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `bulk-data-import`: Added requirement to validate that no record in the bulk payload (or existing database) causes a date range overlap for the same user and org unit (across all assignment types).
- `user-membership-sync`: Added requirement to validate that individual creation and update of memberships do not result in overlapping date ranges for the same user and org unit.

## Impact

- `src/org-unit/repository/org-unit.repository.ts`: New query method for overlap detection.
- `src/org-unit/org-unit.service.ts`: Validation in CRUD methods.
- `src/migration/migration.service.ts`: Validation in the `bulkImport` loop.
- Existing bulk import and organization membership E2E tests.
