# Fix Plan: GBPM-708 + Membership API Extension

## Status
- [ ] Bug fix: deleted-user guard in all membership queries
- [ ] New `ListOrgMembersQueryDto`
- [ ] Repository: flexible `findOrgUnitMemberships`
- [ ] Service updated to pass query DTO
- [ ] Controller: query params exposed on `/users` endpoint
- [ ] Default `assignType = USER` confirmed with frontend team
- [ ] Linting (`make lint`)
- [ ] E2E tests

**Depends on:** Fix 721

---

## Problem (GBPM-708)

Soft-deleting a user (`DELETE /bpm/users/:id`) only sets `deleted_at` on the User row.
Membership records are untouched and have no `user.deleted_at: null` guard. The deleted
user continues to appear in:
- `GET /bpm/org-units/{id}/users`
- `GET /bpm/org-units/{id}/heads`
- `GET /bpm/org-units/{id}` (`members` array)

---

## API Extension Rationale

This fix is the right moment to make the membership listing endpoints genuinely useful.
Currently `/users` and `/heads` are hard-coded: always active, always one assign_type, no
control over deleted users. Consumers need:

- **By membership status**: active (default), expired (history), or all-time
- **By assign type**: USER-only (default for `/users`), HEAD-only (the `/heads` endpoint),
  or ALL combined
- **By user deletion status**: exclude deleted (default), or include them

Note: `GET /bpm/users` already has `?includeDeleted` and `?search` — no change there.

---

## Assign Type Default Decision

> **Default for `GET /org-units/:id/users`: `assignType = USER`**

This makes the "Users" endpoint semantically correct — it returns only regular USER-type
members. HEAD members appear only via `GET /org-units/:id/heads` or `?assignType=HEAD`.

**⚠️ Backward-compatibility risk**: If the frontend currently relies on the `/users`
endpoint returning HEAD-type members, this default change will break it. Consumers that
need all member types must migrate to `?assignType=ALL`. **Confirm with frontend team
before landing this fix.**

The `GET /org-units/:id` `members` array (in the org-detail response) is NOT affected — it
continues to show ALL active members (HEAD + USER) as the "full org picture" view.

---

## Files to Change

### New file: `src/org-unit/dto/list-org-members-query.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum MembershipStatusFilter {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  ALL = 'all',
}

export enum AssignTypeFilter {
  USER = 'USER',
  HEAD = 'HEAD',
  ALL = 'ALL',
}

export class ListOrgMembersQueryDto {
  @ApiProperty({
    required: false,
    enum: AssignTypeFilter,
    default: AssignTypeFilter.USER,
    description: 'Filter by membership assign type. Defaults to USER.',
  })
  @IsOptional()
  @IsEnum(AssignTypeFilter)
  assignType?: AssignTypeFilter;

  @ApiProperty({
    required: false,
    enum: MembershipStatusFilter,
    default: MembershipStatusFilter.ACTIVE,
    description: 'Filter by membership time status. Defaults to active memberships only.',
  })
  @IsOptional()
  @IsEnum(MembershipStatusFilter)
  status?: MembershipStatusFilter;

  @ApiProperty({
    required: false,
    default: false,
    description: 'Include soft-deleted users in the response.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
```

### `src/org-unit/repository/org-unit.repository.ts`

**1. Replace** `findOrgUnitUserMemberships` and `findOrgUnitUserMembershipsByCode` with
flexible methods that accept the query DTO:

```typescript
async findOrgUnitMemberships(
  orgUnitId: number,
  query?: ListOrgMembersQueryDto,
): Promise<OrgMember[]> {
  const now = new Date();
  const where: Prisma.OrgMembershipWhereInput = { org_unit_id: orgUnitId };

  // Assign type filter (default: USER)
  const assignType = query?.assignType ?? AssignTypeFilter.USER;
  if (assignType !== AssignTypeFilter.ALL) {
    where.assign_type = assignType as AssignType;
  }

  // Status filter (default: active)
  const status = query?.status ?? MembershipStatusFilter.ACTIVE;
  if (status === MembershipStatusFilter.ACTIVE)  where.end_date = { gt: now };
  if (status === MembershipStatusFilter.EXPIRED) where.end_date = { lte: now };
  // 'all' → no date filter

  // Deleted users guard (GBPM-708 fix)
  if (!query?.includeDeleted) {
    where.user = { deleted_at: null };
  }

  return this.prisma.orgMembership.findMany({
    where,
    include: {
      user: {
        include: {
          org_memberships: { include: { org_unit: true } },
          default_org_preference: { include: { org_unit: true } },
        },
      },
    },
  });
}

async findOrgUnitMembershipsByCode(
  code: string,
  query?: ListOrgMembersQueryDto,
): Promise<OrgMember[]> {
  // Same structure — replace `org_unit_id: orgUnitId` with `org_unit: { code }`
}
```

**2. Update** `findOrgUnitHeadMemberships` and `findOrgUnitHeadMembershipsByCode` to also
add `user: { deleted_at: null }` (GBPM-708 fix), keeping the `assign_type: HEAD` filter:

```typescript
async findOrgUnitHeadMemberships(orgUnitId: number): Promise<OrgMember[]> {
  return this.prisma.orgMembership.findMany({
    where: {
      org_unit_id: orgUnitId,
      assign_type: AssignType.HEAD,
      end_date: { gt: new Date() },
      user: { deleted_at: null },    // ← add
    },
    include: {
      user: {
        include: {
          org_memberships: { include: { org_unit: true } },
          default_org_preference: { include: { org_unit: true } },
        },
      },
    },
  });
}
```

**3. Apply** the deleted-user guard to the `members` include inside `findOrgUnitById` (and
related `findOrgUnit*` methods — this combines with the deep include from Fix 721):

```typescript
members: {
  where: {
    end_date: { gt: now },
    user: { deleted_at: null },    // ← GBPM-708
  },
  include: {
    user: {
      include: {                   // deep include from Fix 721
        org_memberships: { include: { org_unit: true } },
        default_org_preference: { include: { org_unit: true } },
      },
    },
  },
},
```

### `src/org-unit/org-unit.service.ts`

- Update `getOrgUnitMembers(orgUnitId, query?)` to pass `query` to `findOrgUnitMemberships`.
- Update `getOrgUnitMembersByCode(code, query?)` similarly.
- `getOrgUnitHeads` and `getOrgUnitHeadsByCode` continue to call `findOrgUnitHeadMemberships`
  (no query param — they are HEAD-only convenience endpoints).

### `src/org-unit/org-unit.controller.ts`

Add `@Query() query: ListOrgMembersQueryDto` to:
- `getOrgUnitUsers` (`GET :id/users`) → pass to `getOrgUnitMembers`
- Code-based variant (`GET code/:code/users`) → pass to `getOrgUnitMembersByCode`

`getOrgUnitHeads` and `getOrgUnitHeadsByCode` remain parameter-free.

---

## Verification

1. Create user → assign to org → soft-delete user →
   `GET /org-units/{id}/users` must not include them.
2. `GET /org-units/{id}/users?includeDeleted=true` must include soft-deleted users.
3. `GET /org-units/{id}/users` (no params) → only USER-type memberships.
4. `GET /org-units/{id}/users?assignType=HEAD` → only HEAD-type memberships.
5. `GET /org-units/{id}/users?assignType=ALL` → all membership types.
6. `GET /org-units/{id}/users?status=expired` → only expired memberships.
7. `GET /org-units/{id}/users?status=all` → all dates (active + expired).
8. `GET /org-units/{id}` `members` array excludes soft-deleted users.
9. `GET /org-units/{id}/heads` excludes soft-deleted users.

E2E tests to add in `test_org_management.py`:
- `test_deleted_user_removed_from_org_members`
- `test_deleted_user_removed_from_org_heads`
- `test_deleted_user_in_org_members_with_include_deleted`
- `test_org_members_filter_by_assign_type_user`
- `test_org_members_filter_by_assign_type_head`
- `test_org_members_filter_by_assign_type_all`
- `test_org_members_filter_by_status_expired`
- `test_org_members_filter_by_status_all`

Run `make lint` after implementation.
