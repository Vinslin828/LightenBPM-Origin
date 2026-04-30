# Membership Sync Review & GBPM-711 Resolution

## Canonical Business Rule

**One active membership per `(User, OrgUnit)` pair at all times, regardless of `assignType`.**

A user can hold either `USER` or `HEAD` for a given org — never both concurrently. Transitioning
between roles ("role-switch") is a manual admin action: close the existing membership first (PATCH
to set `endDate`), then create the new one. This is the authoritative rule defined in
`01-active-memberships.md`.

---

## GBPM-711 Resolution

**Decision: The 400 error is correct. The issue reporter's expectation was wrong.**

The ticket expected `HEAD` and `USER` to be "independent" concurrent roles. This contradicts the
one-active-membership rule. The correct admin flow is:

1. PATCH the existing `USER` membership — set `endDate` to the intended HEAD start date.
2. POST a new `HEAD` membership starting from that date.

No code change is required to "fix" the 400. The error message is intentionally informative.

---

## Logic Matrix — Final State

| Path | Overlap handling | assignType scope |
|---|---|---|
| **Manual API** (`POST /org-units/memberships`, `PATCH`) | Reject any overlap → `400` | All types equally |
| **Bulk import** (`POST /import/bulk`) | Cookie-cutter delta sync | All types equally (remote is source of truth) |
| **User create/update** (`defaultOrgCode`) | Idempotent: extend existing USER or create new USER | `USER` only |

---

## Files Changed (commits `4408f88` → `82eb6de`)

### `src/org-unit/org-unit.service.ts`

`createOrgMembership` and `updateOrgMembership` both use `findOverlappingMembership` and reject
**any** overlap with `400 BadRequestException`, regardless of `assignType`. No special handling for
cross-type overlaps — the simple guard is the intended behaviour.

### `src/org-unit/repository/org-unit.repository.ts`

No net change from the pre-711 state. `findAllOverlappingMemberships` (added in the delta-sync
commit) is used exclusively by the bulk import path. `findOverlappingMembership` is used by the
manual API path.

### `src/user/user.service.ts` — `syncMembershipAndPreference`

**Bug fixed.** The `findFirst` query now filters by `assign_type: AssignType.USER`. Previously it
queried any active membership, so if a user already held an active `HEAD` membership in that org,
setting `defaultOrgCode` would silently extend the `HEAD` record to indefinite instead of creating
a separate `USER` membership — violating the one-active-membership rule and leaving the user
without a `USER` assignment.

### `e2e_tester/tests/test_org_management.py`

Added `test_org_membership_cross_type_overlap_prevented`: verifies that a `HEAD` POST is rejected
with `400` when a `USER` membership already covers the same date range for the same user and org.
This locks in the "any overlap → reject" behaviour across assignType boundaries.

---

## Remaining Known Gap

### `src/migration/migration.service.ts` — cookie-cutter is assignType-agnostic

The bulk import applies cookie-cutter resolution across all `assignType` values indiscriminately.
If an external system syncs a `USER` record, it will truncate or delete any local `HEAD` record
that overlaps the same window. This is intentional: the remote system is the source of truth for
the bulk import path and is acceptable as long as the external system is always authoritative for
memberships it manages.

If a future requirement arises where bulk import should only overwrite records of the same
`assignType`, add an `assign_type` filter to the `findAllOverlappingMemberships` call inside
`MigrationService.bulkImport` and scope the cookie-cutter loop accordingly.
