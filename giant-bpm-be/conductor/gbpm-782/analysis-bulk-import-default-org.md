# Analysis Report — Bulk Import Default Org Handling

**Date:** 2026-04-20

## Problem Statement

The `bulkImport` method in `MigrationService` contains logic for syncing a user's default org
preference (`userDefaultOrg`) when a `defaultOrgCode` is provided in the import payload. This
logic had two correctness bugs and one performance issue that could lead to data corruption,
silent data integrity gaps, and unnecessary memory pressure on large imports.

## Context & Background

`bulkImport` is a four-step transactional import:
1. Import `OrgUnit` records (create/update/soft-delete)
2. Import `User` records (create/update/soft-delete)
3. Import `OrgMembership` records (delta sync with cookie-cutter conflict resolution)
4. Sync `userDefaultOrg` preference for users where `defaultOrgCode` is set

Step 4 calls `syncUserDefaultOrgPreference()` which:
- Creates a fallback indefinite membership if none exists for the target org
- Upserts `userDefaultOrg` if the user has >1 active membership; deletes it if ≤1

`INDEFINITE_MEMBERSHIP_END_DATE` is `new Date('2999-12-31T23:59:59Z')`.

Soft delete in this system sets `deleted_at` on the record — `findUnique` returns soft-deleted
records unless explicitly filtered.

## Findings

### Bug 1 — Default org lookup does not filter soft-deleted orgs

**Location:** `migration.service.ts` step 4, `tx.orgUnit.findUnique({ where: { code } })`

`findUnique` has no `deleted_at: null` filter. If `defaultOrgCode` references an org that was
soft-deleted **in the same batch** (step 1 calls `deleteOrgUnit` which sets `deleted_at`),
the record is still returned. Control falls through to `syncUserDefaultOrgPreference`, which:
- Creates an active membership pointing to the deleted org
- Sets `userDefaultOrg` to the deleted org

This silently corrupts both the `orgMembership` and `userDefaultOrg` tables.

### Bug 2 — Silent skip when `defaultOrgCode` org not found

**Location:** `migration.service.ts` step 4, `if (orgUnit) { ... }`

When `defaultOrgCode` references an org that doesn't exist at all, the block is silently skipped.
The caller receives no error, the user ends up with no default org set, and no warning is surfaced.
This is a data integrity gap — the import appears successful but the desired state was not applied.

### Performance Issue — Active membership count done in JS instead of DB

**Location:** `migration.service.ts`, `syncUserDefaultOrgPreference`, "Check active counts" block

```typescript
const allMemberships = await tx.orgMembership.findMany({
  where: { user_id: userId },   // fetches ALL rows including full history
});
const activeCount = allMemberships.filter((m) => ...).length;
```

All membership rows for the user (including historical closed records) are loaded into the Node.js
process to compute a simple count. For users with long tenures this is unnecessary memory and I/O
pressure, especially within a transaction processing many users at once.

## Impact Assessment

| Issue | Impact |
|-------|--------|
| Bug 1 | Corrupt `orgMembership` and `userDefaultOrg` records for any user whose `defaultOrgCode` references an org deleted in the same batch. Affects routing and org resolution downstream. |
| Bug 2 | Silent no-op for users with a missing `defaultOrgCode` org. Import reports success but desired state is not applied. |
| Perf  | Memory and query overhead proportional to membership history depth. Low impact for small orgs; significant for long-running systems with dense membership history. |

## Recommended Approach

Collapse Bug 1 and Bug 2 into a single guard immediately after the `findUnique` call:

```typescript
if (!orgUnit || orgUnit.deleted_at) {
  throw new BadRequestException(
    `Default org '${item.defaultOrgCode}' for user '${item.code}' not found or is deleted`,
  );
}
```

Replace the `findMany`+filter pattern with a direct DB count:

```typescript
const activeCount = await tx.orgMembership.count({
  where: { user_id: userId, end_date: { gt: now } },
});
```

**Alternatives considered:**
- Soft-skip Bug 2 with a warning log instead of throwing — rejected because the caller has no
  visibility into whether the import fully succeeded, which defeats the purpose of the API.
- Separate `deleted_at` check from missing check — rejected as unnecessary complexity; both
  cases represent an unusable org and should be treated identically.
