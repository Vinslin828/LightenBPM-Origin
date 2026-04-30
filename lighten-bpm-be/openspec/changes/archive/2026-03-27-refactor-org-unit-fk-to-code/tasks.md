# Tasks: Refactor Org Unit to Code

## 1. Database Schema
- [x] 1.1 Update `OrgUnit` model in `schema.prisma`:
    - Add/Ensure `code` is `@unique`.
    - Change `parent_id` to `parent_code` (String?).
    - Update `parent` relation to point to `code`.
- [x] 1.2 Update `User` model in `schema.prisma`:
    - Change `default_org_id` to `default_org_code` (String).
    - Update `default_org` relation.
- [x] 1.3 Update `OrgMembership` model in `schema.prisma`:
    - Change `org_unit_id` to `org_unit_code` (String).
    - Update `org_unit` relation.
- [x] 1.4 Generate Prisma Migration (`make migrate-dev name=refactor_org_fk_to_code`).

## 2. Codebase Refactoring
- [x] 2.1 Update `prisma/seed.ts` to use codes for relationships.
- [x] 2.2 Update `CreateOrgUnitDto` / `UpdateOrgUnitDto`:
    - Ensure `parentCode` is used instead of `parentId`.
- [x] 2.3 Update `CreateUserDto` / `UpdateUserDto`:
    - Replace `defaultOrgId` with `defaultOrgCode`.
- [x] 2.4 Update `OrgMembership` DTOs.
- [x] 2.5 Refactor `OrgUnitService`:
    - Update `create`, `update`, `findOne` methods to handle `code`.
- [x] 2.6 Refactor `UserService`:
    - Fix relationship queries.
- [x] 2.7 Verify `ValidationRegistry` if it touches Org Units (unlikely but check).

## 3. Verification
- [x] 3.1 Run `make migrate-reset` to verify seed data works.
- [x] 3.2 Run `make test` to ensure unit tests pass.
- [x] 3.3 Run `make test-local-e2e` to ensure API works.