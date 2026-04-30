## Context

Currently, the system handles Users, OrgUnits, and memberships individually. Bulk data synchronization from external systems is a manual and error-prone process. The requirement is to automate this via a transactional bulk API.

## Goals / Non-Goals

**Goals:**
- Implement a transactional bulk import API for Users, OrgUnits, and memberships.
- Support logical code-based relationships.
- Provide detailed row-level error reporting.
- Refactor repositories to support multi-step transactions.

**Non-Goals:**
- Implementing a generic file upload/processing (e.g., CSV parser) in the backend. The API will accept JSON arrays.
- Automated data mapping from arbitrary external formats.

## Decisions

### 1. DTO Definitions
- **UserImportDto**: Includes `defaultOrgCode`.
- **OrgUnitImportDto**: Includes `parentCode`.
- **OrgMembershipImportDto**: Includes `orgUnitCode` and `userCode`.
- **BulkImportDto**: Contains arrays: `users`, `orgUnits`, `memberships`.

### 2. Transactional Orchestration
- Use `this.prisma.$transaction(async (tx) => { ... })` in `MigrationService`.
- Re-use or adapt existing repository methods to accept an optional `tx: PrismaTransactionClient`.

### 3. Execution Sequence
The order of operations is critical due to foreign key constraints:
1. **OrgUnits**: Created first so they can be parents of other OrgUnits or assigned to Users.
2. **Users**: Created next, linking to the previously created/existing OrgUnits.
3. **OrgMemberships**: Created last, linking Users to OrgUnits.

### 4. Code-to-ID Resolution
- Maintain local caches (e.g., `Map<string, number>`) within the transaction scope to map logical codes to internal IDs efficiently.
- Resolve `parentCode` for OrgUnits (defaulting to `UNASSIGNED` ID if not found/provided).

### 5. Error Handling
- Wrap each resource loop iteration in a `try-catch`.
- On error, throw a custom exception or a `BadRequestException` with a formatted message: `[Resource] index [X]: [Reason]`.
- This ensures the Prisma transaction rolls back everything on any single failure.

### 6. Upsert Strategy
To support updating existing data without duplication errors:
- **OrgUnits and Users**: Use Prisma `upsert` or check existence by `code` then `update`.
- **OrgMemberships**: Since they use composite unique keys or specific logic, ensure that re-importing the same user-org pair updates the existing record (startDate, endDate, note, assignType).
- **Service Logic**: Ensure that even when updating, all related code lookups are performed correctly.

## Risks / Trade-offs

- **[Risk] Transaction Timeout** → Very large datasets might exceed the default Prisma transaction timeout.
  - **Mitigation**: Advise clients to chunk large imports (e.g., 500 records per request) or increase timeout if strictly necessary.
- **[Trade-off] Multi-Pass vs Single-Pass** → Simple iteration through OrgUnits might fail if a child is provided before its parent.
  - **Decision**: Accept provided order for simplicity, assuming clients sort hierarchy correctly, OR implement a multi-pass approach if needed.
