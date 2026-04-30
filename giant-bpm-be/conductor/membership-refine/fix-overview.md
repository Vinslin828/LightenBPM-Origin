# Membership Issues — Fix Overview & Discussion Guide (Revised)

## Authoritative Constraint (Do Not Violate)

> **One active membership per `(User, OrgUnit)` pair at all times, regardless of `assignType`.**

This rule is established in `01-active-memberships.md` and confirmed by the GBPM-711
resolution (documented in `06-membership-sync-review.md`). The 400 error for any cross-type
overlap is **correct and intentional**. The cookie-cutter logic in `MigrationService` is
also assignType-agnostic: a remote USER record will truncate or delete a local HEAD record
that overlaps the same window, because the remote system is the single source of truth.

**Any fix that relaxes the overlap guard (i.e., allowing HEAD + USER to coexist for the
same (User, OrgUnit) pair) contradicts this constraint and must not be implemented.**

---

## Issues Covered

| Ticket | Title |
|--------|-------|
| GBPM-721 | `defaultOrgId`/`defaultOrgCode` blank in org-unit member list |
| GBPM-708 | Soft-deleted user still appears in org member lists |
| GBPM-691 | HEAD user incorrectly appears in the "Users" section |
| GBPM-704 | Can't change default org when user has two active memberships |

---

## Dependency Chain

```
Fix 721 (data layer)
  └─► Fix 708 + API Extension (filtering layer)
          └─► Fix 691 (preference count + correct /users default)
                  └─► Fix 704 (default-org update flow)
```

Each fix can be merged independently on its own branch as long as the preceding ones have
landed.

---

## Root Cause Map

### GBPM-721 — Wrong `defaultOrgId`/`defaultOrgCode` in org-unit member list

`findOrgUnitById` (and every related `findOrgUnit*` method) includes `user: true` inside the
`members` relation — no `org_memberships` or `default_org_preference`. `UserDto.fromPrisma`
cannot resolve the default org and falls back to `0` / `""`.

**Fix 1**: Expand all `findOrgUnit*` Prisma includes to include
`user.org_memberships.org_unit` and `user.default_org_preference.org_unit`.

---

### GBPM-708 — Soft-deleted users in org member lists

Soft-delete sets `deleted_at` on the User row only. Membership records remain. All membership
queries filter by `end_date > now` but have no `user.deleted_at: null` guard.

**Fix 2a** (bug fix): Add `user: { deleted_at: null }` to all membership `where` clauses.

**Fix 2b** (API extension): Add a `ListOrgMembersQueryDto` to `GET /org-units/:id/users`
with `assignType` (USER/HEAD/ALL), `status` (active/expired/all), and `includeDeleted` query
params so consumers can query the membership history they actually need.

---

### GBPM-691 — HEAD user incorrectly appears in "Users" section

**The constraint** means a user can only be HEAD **or** USER for a given org — not both.
"Users section" (`GET /org-units/:id/users`) should show only `assign_type = USER` members.
"Heads section" (`GET /org-units/:id/heads`) shows only `assign_type = HEAD`.

**Root cause A — Display**: `findOrgUnitUserMemberships` has no `assign_type` filter. HEAD
members bleed into the "Users" section even though they hold no USER membership. The fix is
to default `assignType = USER` in the `/users` endpoint (via the query DTO introduced in Fix 2).

**Root cause B — Preference count**: `syncMembershipAndPreference` counts ALL active
memberships (HEAD + USER) when deciding whether to persist a `UserDefaultOrg` preference
record. A user with one USER org and one HEAD org (different orgs) incorrectly gets a
preference record even though they only have a single USER-org choice. Count should be
`assign_type = USER` only.

**What is NOT a bug**: The 400 when admin tries to add HEAD while USER membership exists is
**correct**. The proper admin workflow is: PATCH the existing membership to close it (set
`endDate`), then POST the new HEAD membership. This is by design.

**Secondary note** — `GET /org-units/:id` `members` array: this field shows all active org
members regardless of type (HEAD + USER), which is appropriate for the org-detail "full
picture" view. It is intentionally different from the type-filtered `/users` endpoint.

---

### GBPM-704 — Can't change default org

Three compounding issues:

1. **Display** (resolved by Fix 721): UI reads `defaultOrgId: 0` from the org-unit detail
   endpoint after a change — looks like the change had no effect.
2. **Preference count** (resolved by Fix 691 / root cause B): HEAD memberships are counted
   in `syncMembershipAndPreference`, creating false preference records.
3. **Response mismatch**: `PATCH /users/{id}/default-org` returns `UserDefaultOrgDto`. The
   frontend must do a separate GET to see the updated `defaultOrgId`. Return `UserDto` instead.

---

## Fix Summary Table

| # | Ticket | Files | Risk | Depends on |
|---|--------|-------|------|------------|
| 1 | 721 | `org-unit.repository.ts`, `common.types.ts` | Low | — |
| 2 | 708 + API | `list-org-members-query.dto.ts` (new), `org-unit.repository.ts`, `.service.ts`, `.controller.ts` | Medium | Fix 1 |
| 3 | 691 | `user.service.ts` | Low | Fix 2 |
| 4 | 704 | `user.service.ts`, `user.controller.ts` | Low-medium | Fix 1, 3 |

---

## Open Questions for Team Discussion

### Q1 — Default `assignType` for `GET /org-units/:id/users`

**Recommended**: `USER` (semantically correct — "Users" = regular USER-type members only).
HEAD members appear only in `GET /org-units/:id/heads`.

**Backward-compatibility risk**: If the frontend currently relies on `/users` returning
HEAD-type members (e.g., to build the org members list), changing the default to `USER` will
break it. Consumers must migrate to `?assignType=ALL`.

Confirm with frontend team what the current `/users` call is used for.

### Q2 — `GET /org-units/:id` `members` array

Currently shows all active members (HEAD + USER) — the "full picture". Keep as-is, or filter
to USER only (matching the `/users` default)?

**Recommended**: Keep as-is. It serves a different purpose (org-detail view vs. filtered
member list).

### Q3 — `PATCH /users/:id/default-org` response type

Change from `UserDefaultOrgDto` to `UserDto` so the frontend gets the resolved `defaultOrgId`
in one round trip. Confirm with frontend that this contract change is acceptable.

### Q4 — `GET /org-units/memberships/user/:userId`

Currently always returns active memberships for a user, no type or date filtering. Should this
endpoint also gain `status` and `includeDeleted` query params as part of Fix 2?

### Q5 — Admin role-switch workflow

With the one-membership constraint, changing a user's role (USER → HEAD) requires:
1. PATCH existing membership → set `endDate` to today
2. POST new membership with the new `assignType`

Should the API expose a dedicated "role switch" endpoint that performs this atomically? Or is
the two-step manual flow acceptable for now?

---

## Implementation Order

| Step | Fix | Branch name suggestion |
|------|-----|------------------------|
| 1 | GBPM-721 | `fix/gbpm-721-org-member-default-org` |
| 2 | GBPM-708 + API ext | `fix/gbpm-708-membership-list-api` |
| 3 | GBPM-691 | `fix/gbpm-691-preference-count-and-users-filter` |
| 4 | GBPM-704 | `fix/gbpm-704-default-org-update` |

After all four land on `develop`, run the full E2E suite (`make test-local-e2e`) against a
clean DB before promoting to `staging`.
