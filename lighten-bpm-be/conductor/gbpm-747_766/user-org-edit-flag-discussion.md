# GBPM-747: User Management Org-Editing Feature Flag — Discussion

## Background

Commit `1c2a76a8da4e879661d329221c544f25c8db6916` introduced the feature flag system for GBPM-747 and covered:

| Flag | Env Var | Applied To |
|------|---------|-----------|
| `hardDeleteEnabled` | `FEATURE_HARD_DELETE_ENABLED` | `DELETE /users/:id/hard`, org-unit, form, workflow, application |
| `orgUnitWriteEnabled` | `FEATURE_ORG_UNIT_WRITE_ENABLED` | Org-unit create/update/delete endpoints |
| `orgMembershipWriteEnabled` | `FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED` | `POST/PATCH/DELETE /org-units/memberships` |

## Gap Analysis

The original commit missed **all ordinary user write endpoints**. The current state of `user.controller.ts`:

| Endpoint | Has Flag? | Notes |
|----------|-----------|-------|
| `GET /users` | — | Read-only, no flag needed |
| `GET /users/me` | — | Read-only |
| `GET /users/:id` | — | Read-only |
| `GET /users/code/:code` | — | Read-only |
| `GET /users/:id/default-org` | — | Read-only |
| `POST /users` | ❌ Missing | Creates user + assigns to UNASSIGNED org |
| `PATCH /users/:id` | ❌ Missing | Updates user profile fields |
| `PATCH /users/code/:code` | ❌ Missing | Updates user profile by code (bulk-import path) |
| `DELETE /users/:id` | ❌ Missing | Soft delete |
| `DELETE /users/code/:code` | ❌ Missing | Soft delete by code |
| `PATCH /users/:id/restore` | ❌ Missing | Restores soft-deleted user |
| `PATCH /users/:id/default-org` | ❌ Missing | Writes USER-type `org_membership` record |
| `DELETE /users/:id/hard` | ✅ `hardDeleteEnabled` | Already covered |

## Proposed Fix

### New flag: `userWriteEnabled`

Add a new flag covering all standard user CRUD operations (excluding hard-delete which is already separately gated).

**Env var:** `FEATURE_USER_WRITE_ENABLED`

**Endpoints to guard:**

| Endpoint | Flag to Apply |
|----------|---------------|
| `POST /users` | `userWriteEnabled` |
| `PATCH /users/:id` | `userWriteEnabled` |
| `PATCH /users/code/:code` | `userWriteEnabled` |
| `DELETE /users/:id` | `userWriteEnabled` |
| `DELETE /users/code/:code` | `userWriteEnabled` |
| `PATCH /users/:id/restore` | `userWriteEnabled` |
| `PATCH /users/:id/default-org` | `orgMembershipWriteEnabled` |

`PATCH /users/:id/default-org` uses the existing `orgMembershipWriteEnabled` flag because its sole side-effect is creating or updating a USER-type `org_membership` record — it is semantically an org membership write, not a user profile write.

### Changes Required

**1. `src/common/feature-flag/feature-flag.service.ts`** — add the new getter:

```typescript
get userWriteEnabled(): boolean {
  return (
    this.config.get<string>('FEATURE_USER_WRITE_ENABLED', 'false') === 'true'
  );
}
```

**2. `src/user/user.controller.ts`** — apply guards. No new imports needed; `FeatureFlagGuard` and `RequireFeature` are already imported.

```typescript
// POST /users
@Post()
@RequireFeature('userWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)

// PATCH /users/:id
@Patch(':id')
@RequireFeature('userWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)

// PATCH /users/code/:code
@Patch('code/:code')
@RequireFeature('userWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)

// DELETE /users/:id
@Delete(':id')
@RequireFeature('userWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)

// DELETE /users/code/:code
@Delete('code/:code')
@RequireFeature('userWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)

// PATCH /users/:id/restore
@Patch(':id/restore')
@RequireFeature('userWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)

// PATCH /users/:id/default-org  (uses existing flag)
@Patch(':id/default-org')
@RequireFeature('orgMembershipWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)
```

Note: `@UseGuards(AuthGuard)` at the class level still applies. The per-handler `@UseGuards(AuthGuard, FeatureFlagGuard)` re-declares `AuthGuard` inline — this is the same pattern already used by `DELETE /users/:id/hard` and all org-unit write endpoints, so it is consistent.

**3. Environment / deployment config** — add `FEATURE_USER_WRITE_ENABLED=false` to all environment templates (`.env.example`, ECS task definitions, etc.) alongside the existing `FEATURE_*` vars.

## Flag Summary (Complete Picture)

| Flag | Env Var | Default | Covers |
|------|---------|---------|--------|
| `hardDeleteEnabled` | `FEATURE_HARD_DELETE_ENABLED` | `false` | Hard-delete on users, org-units, forms, workflows, applications |
| `orgUnitWriteEnabled` | `FEATURE_ORG_UNIT_WRITE_ENABLED` | `false` | Org-unit create / update / delete |
| `orgMembershipWriteEnabled` | `FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED` | `false` | Org membership POST/PATCH/DELETE + user default-org PATCH |
| `userWriteEnabled` *(new)* | `FEATURE_USER_WRITE_ENABLED` | `false` | User create / update / soft-delete / restore |

## Out of Scope

- `POST /users` and `PATCH /users/:id` accept a `defaultOrgId` field but do **not** write `org_membership` directly — `syncMembershipAndPreference` is only called from the `default-org` sub-endpoint. These are covered by `userWriteEnabled`, not `orgMembershipWriteEnabled`.
- Read endpoints (`GET *`) require no flag.
- `DELETE /users/:id/hard` is already correctly covered by `hardDeleteEnabled`.

## Status

Pending implementation.
