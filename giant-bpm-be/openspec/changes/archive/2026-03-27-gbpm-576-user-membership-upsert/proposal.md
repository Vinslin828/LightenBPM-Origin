## Why

Currently, the user's default organization is tightly coupled to the `User` table via `default_org_id`. This creates data inconsistency between the user's profile and their actual active memberships in the `OrgMembership` table, which negatively impacts permission checks, reporting, and organizational management. Furthermore, the handling of indefinite memberships and bulk imports needs to be aligned with this new decoupled architecture.

## What Changes

- **Remove `default_org_id`**: Remove the `default_org_id` column from the `User` table to decouple users from specific organizations.
- **Dynamic Default Org Resolution**: Implement a robust, deterministic resolution logic for a user's default organization:
  1. **Exactly 1 active membership**: It is the automatic, undeniable default.
  2. **Multiple active memberships**: 
     - Use the explicitly configured `UserDefaultOrg` preference if valid and active.
     - Fallback: If no valid preference exists, select the active membership with the earliest `start_date`.
  3. **0 active memberships**: Fall back to the system-reserved `UNASSIGNED` organization.
- **Indefinite Memberships**: Standardize the representation of "no end date" for memberships by using a far-future constant (`2999-12-31`) instead of allowing nulls, maintaining backward compatibility with existing date-comparison queries.
- **New `UserDefaultOrg` Table**: Introduce a separate mapping table to record a user's default organization preference when they have multiple active memberships.
- **New Configuration APIs**: Create new endpoints to manage a user's default organization preference.
- **Maintain DTO Compatibility**: Keep `defaultOrgId` and `defaultOrgCode` in the `UserDto` structure, derived dynamically, to prevent frontend disruption.
- **Flow Engine Updates**: Update flow engine execution components to use the dynamic resolution instead of direct database property access.
- **Bulk Import Fix**: Update `MigrationService.bulkImport` to correctly respect and synchronize the `defaultOrgCode` from import payloads into the new `UserDefaultOrg` preference table.

## Capabilities

### New Capabilities
- `user-membership-sync`: Dynamically resolves user-organization membership records and defaults based on active memberships and explicit user preferences, maintaining consistency across the system and during data imports.

### Modified Capabilities
<!-- No existing capabilities found in openspec/specs/. -->

## Impact

- **Services**: `UserService` and `UserRepository` will compute default organizations dynamically using the new deterministic rules.
- **Controllers**: New API endpoints in `UserController` for `UserDefaultOrg` preference management.
- **Data Model**: Removed `default_org_id` from `User`. Added `UserDefaultOrg` table. `OrgMembership` uses far-future dates for indefinite assignments.
- **Migration**: `MigrationService` will accurately synchronize user preferences during bulk data ingestion.
- **Flow Engine**: Node executors and profile retrieval will depend on the resolved logic.