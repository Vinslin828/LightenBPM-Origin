# Fix Plan: GBPM-721 — `defaultOrgId`/`defaultOrgCode` blank in org-unit member list

## Status
- [ ] Implementation
- [ ] Linting (`make lint`)
- [ ] E2E tests

---

## Problem

`GET /bpm/org-units/{id}` returns `defaultOrgId: 0` and `defaultOrgCode: ""` for every user
in the `members` array. `GET /bpm/users/{id}` returns the correct values for the same user.

## Root Cause

`findOrgUnitById` (and every related `findOrgUnit*` method) includes `user: true` inside the
`members` relation. This fetches only the bare `User` row — no `org_memberships`, no
`default_org_preference`. When `OrgUnitDto.fromPrisma` calls `UserDto.fromPrisma(member.user)`,
the DTO's local-resolution logic (lines 74–93 of `user.dto.ts`) has nothing to work with and
falls back to `defaultOrgId: 0`, `defaultOrgCode: ""`.

`GET /bpm/users` works correctly because `userRepository.findAllUsers` uses `userInclude`
which already includes both relations.

---

## Files to Change

### `src/org-unit/repository/org-unit.repository.ts`

In every method that builds the org-unit `members` include, replace `user: true` with a deep
include:

```typescript
// Before
include: {
  user: true,
},

// After
include: {
  user: {
    include: {
      org_memberships: { include: { org_unit: true } },
      default_org_preference: { include: { org_unit: true } },
    },
  },
},
```

Methods to update (search for `include: { user: true }` inside a `members` block):
- `findAll` (~line 94)
- `findOrgUnitById` (~line 110)
- `findOrgUnitByCode` (~line 129)
- `findOrgUnitByIdIncludingDeleted` (~line 152)
- `findOrgUnitByCodeIncludingDeleted` (~line 171)

### `src/common/types/common.types.ts`

Check the `OrgUnitWithRelations` type. The `members` array currently types `user` as `User`.
Update it to reflect the deeper shape so TypeScript is satisfied without `as` casts:

```typescript
members?: (OrgMembership & {
  user: User & {
    org_memberships: (OrgMembership & { org_unit: OrgUnit })[];
    default_org_preference: (UserDefaultOrg & { org_unit: OrgUnit }) | null;
  };
})[];
```

---

## No Changes Needed In

- `src/org-unit/dto/org-unit.dto.ts` — `OrgUnitDto.fromPrisma` already delegates to `UserDto.fromPrisma`
- `src/user/dto/user.dto.ts` — `UserDto.fromPrisma` already handles these relations when present
- Service or controller layers

---

## Verification

1. `GET /bpm/org-units/{id}` → pick any user in `members` → `defaultOrgId` and `defaultOrgCode`
   must match `GET /bpm/users/{id}` for the same user.
2. `GET /bpm/org-units/code/{code}` → same check.
3. Add E2E test `test_org_unit_member_default_org_consistent` in `e2e_tester/tests/test_org_management.py`.
4. Run `make lint`.