# Tasks: Database-Driven Permission Checks (Prefetched via AuthGuard)

## Phase 1: Authentication & User Context
- [x] Update `AuthUser` interface in `src/auth/types/auth-user.ts` to include `orgIds` and `roleIds`.
- [x] Modify `UserRepository` to include `org_memberships` and `org_unit` type in retrieval methods.
- [x] Update `AuthGuard` or `UserService.fromPrisma` to populate `orgIds` and `roleIds`.

## Phase 2: Reverting Permission Builder to Synchronous
- [x] Revert `PermissionBuilderService` methods to synchronous signatures.
- [x] Implement `ORG_UNIT` and `ROLE` logic using the pre-fetched `orgIds` and `roleIds` arrays.
- [x] Update `getGranteeFilters` to use numerical array lookups.

## Phase 3: Cleanup Call Sites
- [x] Remove `await` keywords from `FormService` permission calls.
- [x] Remove `await` keywords from `WorkflowService` permission calls.
- [x] Remove `await` keywords from `ApplicationService` permission calls.
- [x] Fix any TypeScript errors resulting from signature changes.

## Phase 4: Verification
- [x] Update unit tests for `PermissionBuilderService` to be synchronous.
- [x] Update service unit tests to remove `async` mocking for permissions.
- [x] Run `make lint` and `make test`.
- [x] Run E2E tests to ensure visibility logic is correct across all org units/roles.
