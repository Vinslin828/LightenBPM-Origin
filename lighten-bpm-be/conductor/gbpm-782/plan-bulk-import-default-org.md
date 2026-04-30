# Implementation Plan — Bulk Import Default Org Handling

**Date:** 2026-04-20
**Linked Analysis:** analysis-bulk-import-default-org.md

## Objective

Fix two data-correctness bugs and one performance issue in `MigrationService.bulkImport()` default
org handling, with no schema changes required.

## Scope

| File | Change type |
|------|-------------|
| `src/migration/migration.service.ts` | Logic fix (2 locations) |

No migrations, no schema changes, no other modules affected.

## Implementation Steps

### Step 1 — Guard against missing/deleted org in `bulkImport` step 4

**File:** `src/migration/migration.service.ts`, inside the step 4 loop (~line 300)

Replace:
```typescript
const orgUnit = await tx.orgUnit.findUnique({
  where: { code: item.defaultOrgCode },
});
if (orgUnit) {
  await this.syncUserDefaultOrgPreference(userId, orgUnit.id, creatorId, tx);
}
```

With:
```typescript
const orgUnit = await tx.orgUnit.findUnique({
  where: { code: item.defaultOrgCode },
});
if (!orgUnit || orgUnit.deleted_at) {
  throw new BadRequestException(
    `Default org '${item.defaultOrgCode}' for user '${item.code}' not found or is deleted`,
  );
}
await this.syncUserDefaultOrgPreference(userId, orgUnit.id, creatorId, tx);
```

**Gotcha:** The throw is inside a `try/catch` that wraps per-user processing? No — step 4 has no
per-item try/catch, so the throw correctly bubbles up and rolls back the entire transaction.

---

### Step 2 — Replace `findMany`+filter with `count` in `syncUserDefaultOrgPreference`

**File:** `src/migration/migration.service.ts`, inside `syncUserDefaultOrgPreference` (~line 1581)

Replace:
```typescript
const allMemberships = await tx.orgMembership.findMany({
  where: { user_id: userId },
});
const activeCount = allMemberships.filter((m) => {
  const end = m.end_date
    ? new Date(m.end_date)
    : INDEFINITE_MEMBERSHIP_END_DATE;
  return end.getTime() > now.getTime();
}).length;
```

With:
```typescript
const activeCount = await tx.orgMembership.count({
  where: { user_id: userId, end_date: { gt: now } },
});
```

**Gotcha:** Verify `INDEFINITE_MEMBERSHIP_END_DATE` is still used elsewhere in the method before
removing the import. It is used in the fallback membership `create` call above — keep the import.

---

### Step 3 — Build verification

```bash
make build
make lint
```

Both must pass clean.

## Migration / Data Considerations

None. All changes are service-layer logic only. No Prisma schema changes, no migrations, no seed
updates required.

## Testing Checklist

- [ ] Unit test: `bulkImport` with `defaultOrgCode` pointing to a non-existent org → expect `BadRequestException`
- [ ] Unit test: `bulkImport` with org soft-deleted in same batch and referenced as `defaultOrgCode` → expect `BadRequestException`
- [ ] Unit test: `syncUserDefaultOrgPreference` with user having 1 active membership → `userDefaultOrg` deleted
- [ ] Unit test: `syncUserDefaultOrgPreference` with user having 2+ active memberships → `userDefaultOrg` upserted to correct org
- [ ] Unit test: `syncUserDefaultOrgPreference` with user having 0 active memberships → `userDefaultOrg` deleted
- [ ] E2E: full `bulkImport` payload with valid `defaultOrgCode` completes successfully
- [ ] E2E: full `bulkImport` payload with deleted `defaultOrgCode` org rolls back entire transaction

## Rollback Plan

Both changes are isolated to `migration.service.ts`. To revert:

```bash
git revert HEAD   # if committed as a standalone commit
# or
git checkout HEAD~1 -- src/migration/migration.service.ts
```

No data migration is needed to roll back — the fix only prevents future corruption; it does not
repair existing corrupted rows. If corrupt `userDefaultOrg` rows were written before the fix,
they must be corrected manually via a one-off SQL script.
