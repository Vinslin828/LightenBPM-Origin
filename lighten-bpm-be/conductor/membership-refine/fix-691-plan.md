# Fix Plan: GBPM-691 — Default org resolution with HEAD/USER priority

## Status

- [x] `resolveDefaultOrg` — fallback sorts by HEAD > USER, then oldest `created_at`
- [x] `syncMembershipAndPreference` — count all active memberships (any assign type)
- [x] Unit tests updated and expanded
- [x] Linting (`make lint`)
- [x] All unit tests pass

**Committed:** `ea07e03`

---

## Constraint Reminder

> **One active membership per `(User, OrgUnit)` pair at any time, regardless of assignType.**

HEAD and USER cannot coexist for the same `(User, OrgUnit)` pair. The overlap guard in
`findOverlappingMembership` is correct and intentional.

**No change to the overlap guard.**

---

## Requirements

1. A user can have at most one active membership per org (HEAD **or** USER — not both).
2. If a user belongs to multiple orgs, the `UserDefaultOrg` table decides the default.
3. If no preference exists, apply fallback rules:
   - **3a**: HEAD membership takes priority over USER
   - **3b**: Oldest `created_at` wins when types are tied

---

## What Changed

### `src/user/user.service.ts`

#### `resolveDefaultOrg` — Case 3 fallback

**Before:** Sorted by `start_date` only, no assign_type priority.

**After:**
```typescript
// Case 3: Multiple active memberships, no valid preference
// Priority: HEAD > USER, then earliest created_at
const sorted = [...activeMemberships].sort((a, b) => {
  if (a.assign_type !== b.assign_type) {
    return a.assign_type === AssignType.HEAD ? -1 : 1;
  }
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
});
return sorted[0].org_unit;
```

#### `syncMembershipAndPreference` — active count

**Before:** Counted only `assign_type: AssignType.USER` memberships. This incorrectly
suppressed preference creation for a user with HEAD in OrgA + USER in OrgB (USER count = 1),
meaning an explicit `defaultOrgCode=OrgB` request would be silently discarded.

**After:** Counts all active memberships regardless of type. Preference is meaningful
whenever a user belongs to more than one org, regardless of assign type.

---

## What is NOT a Bug

The 400 when admin adds HEAD while USER membership already exists (for the same org) is
**correct**. The workflow for a role switch (USER → HEAD) within the same org is:
1. `PATCH /org-units/memberships/:id` — set `endDate` to today on the existing membership
2. `POST /org-units/memberships` — create the new HEAD membership starting today

---

## Unit Tests (`src/user/user.service.spec.ts`)

- `should pick the earliest created_at membership when same type and no preference`
- `should prefer HEAD over USER membership when no preference is set`
- `should respect valid preference even if a HEAD membership exists`
- `should fallback to UNASSIGNED when no active memberships exist`
