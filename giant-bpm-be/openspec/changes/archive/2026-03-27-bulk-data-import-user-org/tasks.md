## 1. DTO Definitions

- [x] 1.1 Create `src/migration/dto/bulk-import.dto.ts` with User, OrgUnit, and OrgMembership import structures.

## 2. Repository Refactoring (Transaction Support)

- [x] 2.1 Update `UserRepository` methods (`createUser`, `findUserByCode`, etc.) to accept optional `tx: PrismaTransactionClient`.
- [x] 2.2 Update `OrgUnitRepository` methods (`createOrgUnit`, `createOrgMembership`, `findOrgUnitByCode`, etc.) to accept optional `tx: PrismaTransactionClient`.

## 3. Migration Service Implementation

- [x] 3.1 Implement `bulkImport` in `MigrationService` wrapped in a transaction.
- [x] 3.2 Implement OrgUnit bulk creation logic with `parentCode` resolution.
- [x] 3.3 Implement User bulk creation logic with `defaultOrgCode` resolution.
- [x] 3.4 Implement OrgMembership bulk creation logic with `userCode` and `orgUnitCode` resolution.
- [x] 3.5 Implement detailed error reporting with row index capture.
- [x] 3.6 Refactor `bulkImport` to use upsert logic for all resources (Update if code exists).

## 4. API Controller Integration

- [x] 4.1 Add `POST /import/bulk` endpoint to `MigrationController` with Admin authorization.

## 5. Verification

- [x] 5.1 Create a unit test or reproduction script to verify successful bulk import.
- [x] 5.2 Verify transactional rollback by inducing a failure in the middle of a request.
- [x] 5.3 Run full E2E test suite: `make test-local-e2e`.
