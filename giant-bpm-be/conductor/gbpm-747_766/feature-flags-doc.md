# Feature Flags — User Write, Org-Unit Write & Hard Delete Control

**Ticket:** GBPM-747 / GBPM-766
**Date:** 2026-04-22
**Commit:** `848932d`

---

## Overview

Four environment-variable-driven feature flags are introduced to control write and hard-delete operations at the backend level. Flags default to **disabled (`false`)** so production environments are locked down without explicit configuration. Local development enables all flags via `.env`.

The implementation lives in `src/common/feature-flag/` and is reusable across any module via `@RequireFeature()` + `FeatureFlagGuard`.

---

## Flags

### `FEATURE_USER_WRITE_ENABLED`

| Property | Value |
|---|---|
| Default | `false` |
| Purpose | Controls creation, update, soft-deletion, and restore of users |
| Set to `true` to enable | User write operations allowed |
| Set to `false` (or unset) | All gated endpoints return `403 Forbidden` |

**Impacted endpoints:**

| Method | Path | Handler |
|---|---|---|
| `POST` | `/users` | `createUser` |
| `PATCH` | `/users/:id` | `updateUser` |
| `PATCH` | `/users/code/:code` | `updateUserByCode` |
| `PATCH` | `/users/:id/restore` | `restoreUser` |
| `DELETE` | `/users/:id` | `deleteUser` |
| `DELETE` | `/users/code/:code` | `deleteUserByCode` |

> Note: `PATCH /users/:id/default-org` is gated separately under `FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED` because it writes a USER-type `org_membership` record rather than the user profile itself.

---

### `FEATURE_ORG_UNIT_WRITE_ENABLED`

| Property | Value |
|---|---|
| Default | `false` |
| Purpose | Controls creation, update, and soft-deletion of organization units |
| Set to `true` to enable | Org-unit write operations allowed |
| Set to `false` (or unset) | All gated endpoints return `403 Forbidden` |

**Impacted endpoints:**

| Method | Path | Handler |
|---|---|---|
| `POST` | `/org-units` | `create` |
| `PATCH` | `/org-units/:id` | `update` |
| `DELETE` | `/org-units/:id` | `remove` |

---

### `FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED`

| Property | Value |
|---|---|
| Default | `false` |
| Purpose | Controls creation, update, and soft-deletion of org-unit memberships (includes role assignments, since roles are modeled as org units) |
| Set to `true` to enable | Membership write operations allowed |
| Set to `false` (or unset) | All gated endpoints return `403 Forbidden` |

**Impacted endpoints:**

| Method | Path | Handler |
|---|---|---|
| `POST` | `/org-units/memberships` | `createOrgMembership` |
| `PATCH` | `/org-units/memberships/:id` | `updateOrgMembership` |
| `DELETE` | `/org-units/memberships/:id` | `deleteOrgMembership` |
| `PATCH` | `/users/:id/default-org` | `updateDefaultOrgPreference` |

---

### `FEATURE_HARD_DELETE_ENABLED`

| Property | Value |
|---|---|
| Default | `false` |
| Purpose | Controls all hard-delete (permanent deletion) endpoints across every module. These endpoints are hidden from Swagger (`@ApiExcludeEndpoint`) and intended for development/maintenance use only. Should remain `false` in all production-facing environments. |
| Set to `true` to enable | Hard-delete operations allowed (admin check still applies) |
| Set to `false` (or unset) | All gated endpoints return `403 Forbidden` before admin check is reached |

**Impacted endpoints:**

| Method | Path | Controller | Handler |
|---|---|---|---|
| `DELETE` | `/org-units/:id/hard` | `OrgUnitController` | `hardRemove` |
| `DELETE` | `/org-units/code/:code/hard` | `OrgUnitController` | `hardRemoveByCode` |
| `DELETE` | `/org-units/memberships/:id/hard` | `OrgUnitController` | `hardDeleteOrgMembership` |
| `DELETE` | `/users/:id/hard` | `UserController` | `hardDeleteUser` |
| `DELETE` | `/form/:form_id/hard` | `FormController` | `deleteForm` |
| `DELETE` | `/form/revisions/:id` | `FormController` | `deleteFormRevision` |
| `DELETE` | `/workflow/:workflow_id/hard` | `WorkflowController` | `deleteWorkflow` |
| `DELETE` | `/workflow/revisions/:revision_id` | `WorkflowController` | `deleteWorkflowRevision` |
| `DELETE` | `/applications/:serial_number/force` | `ApplicationController` | `forceDeleteApplicationInstance` |

---

## Error Response

When a flag is disabled, the endpoint returns:

```json
{
  "statusCode": 403,
  "message": "This operation is currently disabled by system configuration",
  "error": "Forbidden"
}
```

---

## Environment Configuration

### Production / Staging / UAT

Do not set these flags (or explicitly set to `false`). All write and hard-delete operations are disabled by default.

```env
# Not required — absence defaults to false
FEATURE_ORG_UNIT_WRITE_ENABLED=false
FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED=false
FEATURE_HARD_DELETE_ENABLED=false
FEATURE_USER_WRITE_ENABLED=false
```

### Local Development & E2E Testing

Set all flags to `true` in `.env` to allow normal operation:

```env
FEATURE_ORG_UNIT_WRITE_ENABLED=true
FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED=true
FEATURE_HARD_DELETE_ENABLED=true
FEATURE_USER_WRITE_ENABLED=true
```

---

## Implementation Reference

| File | Role |
|---|---|
| `src/common/feature-flag/feature-flag.service.ts` | Reads env vars via `ConfigService`, exposes boolean getters |
| `src/common/feature-flag/feature-flag.guard.ts` | NestJS `CanActivate` guard — throws `403` when flag is disabled |
| `src/common/feature-flag/feature-flag.decorator.ts` | `@RequireFeature(key)` decorator that sets route metadata |
| `src/common/feature-flag/feature-flag.module.ts` | Exports service and guard; imports `ConfigModule` for self-contained DI |

**Modules that import `FeatureFlagModule`:**
`OrgUnitModule`, `FormModule`, `UserModule`, `WorkflowModule`, `InstanceModule`
