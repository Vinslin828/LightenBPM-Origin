# Tasks: Revert Org Unit FK to ID

## 1. Database Schema
- [x] 1.1 Update `OrgUnit` model in `schema.prisma`:
    - Revert `parent_code` -> `parent_id` (Int?).
    - Update `parent` relation to point to `id`.
    - *Keep* `code` as `@unique`.
- [x] 1.2 Update `User` model in `schema.prisma`:
    - Revert `default_org_code` -> `default_org_id` (Int).
    - Update `default_org` relation.
- [x] 1.3 Update `OrgMembership` model in `schema.prisma`:
    - Revert `org_unit_code` -> `org_unit_id` (Int).
    - Update `org_unit` relation.
- [x] 1.4 Generate Prisma Migration (`make migrate-dev name=revert_org_fk_to_id`).

## 2. Codebase Refactoring
- [x] 2.1 Update `prisma/seed.ts`:
    - Adjust logic to create OrgUnits first, capture their IDs, and use IDs for creating Users/Memberships.
- [x] 2.2 Update `CreateUserDto` / `UpdateUserDto`:
    - Keep `defaultOrgCode` (String).
- [x] 2.3 Refactor `UserService`:
    - **Create/Update:** Add logic to find `OrgUnit` by `defaultOrgCode` -> get `id` -> save.
- [x] 2.4 Refactor `OrgUnitService`:
    - **Create/Update:** Add logic to find Parent `OrgUnit` by `parentCode` -> get `id` -> save.
- [x] 2.5 Refactor `OrgMembershipService` (if exists) or code handling memberships:
    - Resolve `orgUnitCode` -> `orgUnitId`.

## 3. Verification
- [x] 3.1 Run `make migrate-reset` to verify seed data works.
- [x] 3.2 Run `make test` to ensure unit tests pass.
- [x] 3.3 Run `make test-local-e2e` to ensure API works.
