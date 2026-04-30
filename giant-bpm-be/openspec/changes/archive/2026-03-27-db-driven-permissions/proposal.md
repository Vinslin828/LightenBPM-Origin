# Proposal: Database-Driven Permission Checks (Prefetched via AuthGuard)

## Problem Statement
The current implementation of the permission system in `PermissionBuilderService` (`canPerformAction` and `getGranteeFilters`) relies on string-based comparisons of `defaultOrgCode` and `bpmRole`. This is incorrect because:
1. Permissions are granted to `org_unit.id` (Integers), not codes.
2. Users can have multiple organizational memberships and roles (via the `org_memberships` table), which the current system ignores.
3. Performing database queries directly inside `PermissionBuilderService` leads to "async infectiousness" across the codebase and performance overhead from redundant queries.

## Proposed Solution
Refactor the system to pre-fetch all user memberships and roles once per request in the `AuthGuard`.
1.  **Enhance `AuthUser`**: Add `orgIds: number[]` and `roleIds: number[]` arrays to the session user object.
2.  **Request-Scoped Fetching**: Update `AuthGuard` (or the underlying `UserService`) to fetch all active `org_memberships` for the user, separating them into `orgIds` and `roleIds` based on the `OrgUnitType`.
3.  **Synchronous Permission Logic**: Revert `PermissionBuilderService` methods to be **synchronous**. Since the user's IDs are already present in the `AuthUser` object, the service can perform O(1) array lookups without querying the database.
4.  **Correct Scoping**: Update `canPerformAction` and `getGranteeFilters` to use these numerical ID arrays, ensuring full visibility across all assigned units and roles.

## Success Criteria
- [ ] `PermissionBuilderService` methods are synchronous and performant.
- [ ] Users correctly gain visibility and action permissions based on **all** their organizational memberships and roles.
- [ ] Redundant database queries for memberships are eliminated (performed once per request).
- [ ] `AuthUser` lightweight metadata is preserved while carrying the necessary numerical ID context.
