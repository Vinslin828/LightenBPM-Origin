# Fix Plan: GBPM-704 — PATCH /users/:id/default-org returns full UserDto

## Status

- [x] Return `UserDto` from `PATCH /users/:id/default-org`
- [x] Membership validation accepts any active membership (HEAD or USER)
- [x] Linting (`make lint`)
- [x] All unit tests pass

**Commits:** `1edb6f1` (initial fix), `e215e9d` (corrected validation)

---

## Requirements

1. `PATCH /users/:id/default-org` must return a full refreshed `UserDto` so the frontend
   gets the resolved `defaultOrgId` in a single round trip.
2. The active-membership guard must accept **any** active membership (HEAD or USER).
   HEAD memberships are first-class under the HEAD > USER fallback rule (GBPM-691), so a
   user must be able to explicitly prefer a HEAD org just as validly as a USER org.
3. `GET /users/{id}/default-org` (read the raw preference) is unchanged — still returns
   `UserDefaultOrgDto`.

---

## What Changed

### `src/user/user.service.ts` — `updateDefaultOrgPreference`

**Return type:** Changed from `UserDefaultOrgDto` to `UserWithOrg` (serialized to `UserDto`
in the controller via `UserDto.fromPrisma`).

**Membership guard — initial commit `1edb6f1` (wrong):**
```typescript
// Incorrectly required USER-type only
const isActiveMembership = (user.org_memberships ?? []).some(
  (m) =>
    m.org_unit_id === orgUnitId &&
    m.assign_type === AssignType.USER &&   // ← wrong under GBPM-691 rules
    m.end_date > now &&
    m.start_date <= now,
);
```

**Membership guard — corrected in `e215e9d`:**
```typescript
// Accepts any active membership (HEAD or USER)
const isActiveMembership = (user.org_memberships ?? []).some(
  (m) =>
    m.org_unit_id === orgUnitId && m.end_date > now && m.start_date <= now,
);
```

The USER-only guard was based on the old assumption that default org is a "USER context."
Under the corrected GBPM-691 requirements, HEAD memberships participate in default-org
resolution (HEAD > USER fallback), so restricting the preference endpoint to USER-only
prevented users from explicitly confirming or overriding HEAD-driven defaults.

### `src/user/user.controller.ts` — `updateDefaultOrgPreference` handler

- `@ApiResponse` type updated to `UserDto`
- Handler return type updated to `Promise<UserDto>`
- Calls `UserDto.fromPrisma(user)` on the service result

---

## Edge Cases

| Scenario | Expected result |
|----------|----------------|
| User has 2 active USER memberships → set default to Org B | `200`, `defaultOrgId = OrgB` |
| User has HEAD in OrgA + USER in OrgB → set default to OrgA (HEAD) | `200`, `defaultOrgId = OrgA` |
| User has HEAD in OrgA + USER in OrgB → set default to OrgB (USER) | `200`, `defaultOrgId = OrgB` |
| Set default to expired membership | `400 BadRequest` |
| Set default to org with no membership | `400 BadRequest` |
| Non-admin user sets their own default org | `200` |
| Non-admin user sets another user's default org | `403 Forbidden` |
