## Context

Currently, the system allows multiple `OrgMembership` records for the same user, organization unit, and assignment type to have overlapping `start_date` and `end_date` periods. This leads to ambiguity in determining which membership is active at a given time and complicates historical reporting.

## Goals / Non-Goals

**Goals:**
- Enforce a strict non-overlapping date range rule for `OrgMembership` records with the same `user_id` and `org_unit_id`, regardless of `assign_type`.
- Implement validation in both the `OrgUnitService` (for single CRUD operations) and `MigrationService` (for bulk imports).
- Ensure that bulk imports roll back the entire transaction if any overlap is detected.

**Non-Goals:**
- Modifying the database schema to include complex temporal constraints.

## Decisions

### 1. Centralized Overlap Detection in Repository
- **Decision**: Add a `findOverlappingMembership` method to `OrgUnitRepository` that checks for any existing membership for the same user and org unit in the given time range.
- **Rationale**: A user should only have one active relationship with an OrgUnit at a time. If they are a `HEAD`, they are inherently a member (`USER`). Allowing multiple records for different roles at the same time complicates the data model and increases the risk of inconsistent state.
- **Alternative**: Checking overlaps per `assign_type`. This was rejected following a design review that concluded a user should not hold multiple roles simultaneously in the same OrgUnit as separate records.

### 2. Service-Level Validation for Single CRUD
- **Decision**: Update `OrgUnitService.createOrgMembership` and `OrgUnitService.updateOrgMembership` to call the repository's overlap check before proceeding.
- **Rationale**: This prevents invalid data from entering the system through the main API endpoints and allows for specific `BadRequestException` messages.

### 3. Loop-Based Validation in Bulk Import
- **Decision**: Perform the overlap check sequentially within the `bulkImport` loop in `MigrationService`.
- **Rationale**: Since `bulkImport` runs within a shared Prisma transaction, checking each record sequentially ensures that previous inserts/updates in the same transaction are visible to the overlap query.
- **Alternative**: Pre-validating the entire payload for internal overlaps. This was considered but rejected because it wouldn't account for overlaps with existing records in the database as effectively as the current approach within the transaction.

## Risks / Trade-offs

- **[Risk] Performance in Bulk Imports** → **Mitigation**: The overlap check relies on existing indices for `user_id`, `org_unit_id`, and `assign_type`. The query is targeted and efficient.
- **[Risk] Transaction Isolation** → **Mitigation**: The use of `TransactionService.runTransaction` ensures that the sequence of checks and writes is atomic and isolated from other concurrent operations.
