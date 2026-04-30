## 1. Schema and Migration

- [x] 1.1 Remove `default_org_id` and the `default_org` relation from the `User` model in `schema.prisma`.
- [x] 1.2 Add the new `UserDefaultOrg` model to `schema.prisma` mapping `user_id` to `org_unit_id` with a unique constraint on `user_id`.
- [x] 1.3 Generate and apply the Prisma migration for these schema changes.

## 2. Dynamic Resolution Logic Implementation

- [x] 2.1 Update `UserRepository` to remove references to `default_org_id`.
- [x] 2.2 Implement the dynamic resolution logic (1 active membership vs. multiple + `UserDefaultOrg` lookup vs. fallback to oldest active vs. fallback to `UNASSIGNED`).
- [x] 2.3 Update `UserDto.fromPrisma` mapping to seamlessly accept the dynamically resolved default organization ID and Code.
- [x] 2.4 Define `INDEFINITE_MEMBERSHIP_END_DATE` in `constants.ts` and update `OrgUnitService` and `UserService` to use this constant for indefinite memberships.

## 3. Flow Engine Updates

- [x] 3.1 Refactor `approval-node.executor.ts` to utilize the dynamic default organization resolution.
- [x] 3.2 Refactor `get-applicant-profile.executor.ts` to utilize the dynamic default organization resolution for enriching the applicant's profile.

## 4. Controller and API Integration

- [x] 4.1 Create new endpoints in `UserController` (or dedicated configuration controller) to GET and PUT the user's default organization preference (`UserDefaultOrg`).
- [x] 4.2 Implement validation to ensure the targeted organization is an active membership for that user.

## 5. Testing and Verification

- [x] 5.1 Update `UserService` and `UserRepository` unit tests to verify all resolution scenarios (0, 1, and multiple active memberships with/without preferences).
- [x] 5.2 Add unit tests for the new `UserDefaultOrg` API endpoints.
- [x] 5.3 Update Flow Engine unit tests to ensure applicant profile resolution functions correctly.
- [x] 5.4 Update Python E2E tests (`test_user_management.py` and `test_org_management.py`) to thoroughly verify the dynamic default org logic and bulk import behavior.
- [x] 5.5 Run local Python with the run e2e_tester skill

## 6. Migration & Bulk Import Integration

- [x] 6.1 Update `MigrationService.bulkImport` to explicitly synchronize `defaultOrgCode` from `UserImportDto` with the `UserDefaultOrg` table if the user has multiple active memberships.