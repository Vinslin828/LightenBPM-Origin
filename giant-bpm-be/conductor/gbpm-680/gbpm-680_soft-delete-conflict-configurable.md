# Soft Delete Conflict — Configurable Behavior + Enriched ConflictException

## Context

Parts 1–3 are already implemented: restore endpoints, `includeDeleted` filter, and graceful re-create
(auto-restore path). This refinement changes what `create()` does when a code matches a soft-deleted
record:

- **Default (constant = `false`):** throw a structured `ConflictException` — frontend leads the user
  to restore manually via `PATCH :id/restore`.
- **Optional (constant = `true`):** auto-restore the deleted record in-place (kept as a switch).
- The `ConflictException` carries `code`, `deletedId`, and `deletedAt` so the frontend has everything
  it needs to offer a one-click restore without a separate lookup.

---

## Changes

### 1. `src/common/constants.ts` — add constant

```typescript
/**
 * Controls behavior when creating a User/OrgUnit whose code belongs to a soft-deleted record.
 * false (default): throw a structured ConflictException; frontend handles restore manually.
 * true: auto-restore the deleted record in place.
 */
export const AUTO_RESTORE_ON_CREATE_CONFLICT = false;
```

### 2. `src/user/user.service.ts` — `create()`

Wrap the existing restore block with the constant check:

```typescript
if (existing.deleted_at) {
  if (AUTO_RESTORE_ON_CREATE_CONFLICT) {
    // existing auto-restore path (unchanged)
  } else {
    throw new ConflictException({
      code: 'USER_CODE_CONFLICT_DELETED',
      message: `User with code ${data.code} was previously deleted`,
      deletedId: existing.id,
      deletedAt: existing.deleted_at,
    });
  }
}
// active-conflict case stays unchanged
throw new ConflictException(`User with code ${data.code} already exists`);
```

### 3. `src/org-unit/org-unit.service.ts` — `create()`

Same pattern with `code: 'ORG_UNIT_CODE_CONFLICT_DELETED'`.

### Frontend contract (HTTP 409)

```json
{
  "statusCode": 409,
  "code": "USER_CODE_CONFLICT_DELETED",
  "message": "User with code X was previously deleted",
  "deletedId": 42,
  "deletedAt": "2026-03-01T12:00:00.000Z"
}
```

Frontend checks `code` field → shows "Restore?" prompt → calls `PATCH /users/42/restore`.

---

## Key Files

| File | Change |
|------|--------|
| `src/common/constants.ts` | Add `AUTO_RESTORE_ON_CREATE_CONFLICT = false` |
| `src/user/user.service.ts` | Wrap restore block; throw structured ConflictException |
| `src/org-unit/org-unit.service.ts` | Same |
| `e2e_tester/tests/test_user_management.py` | Add soft-delete conflict test |
| `e2e_tester/tests/test_org_management.py` | Add soft-delete conflict test |

## Verification

1. POST create with a soft-deleted user's code → 409 with `code: "USER_CODE_CONFLICT_DELETED"`, `deletedId`, `deletedAt`
2. POST create with an active user's code → 409 with plain message (no `deletedId`)
3. Flip constant to `true`, repeat step 1 → user is auto-restored (no error)
4. `make lint && make test`
5. `make test-local-e2e` — new e2e test cases should pass
