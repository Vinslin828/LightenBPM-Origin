# Analysis Report — System Build Config: Feature Toggle for Org-Unit Write Operations

**Date:** 2026-04-21

## Problem Statement

Teams require the ability to disable specific write operations in org-unit management (create/update/delete org units and memberships) via backend configuration, without modifying the role/permission structure or hiding UI elements. The frontend remains unchanged; the backend enforces the restriction.

## Context & Background

- The BPM backend is a NestJS REST API backed by PostgreSQL via Prisma ORM.
- Org units and org memberships are managed through a single `OrgUnitController` at `src/org-unit/org-unit.controller.ts`.
- Role management is **not a separate module** — roles are modeled as `OrgUnit` records with `type === ROLE`. User-to-role assignment uses the same membership endpoints.
- Guards are applied **per-controller** using `@UseGuards(AuthGuard)` at class level, with manual `isAdminUser()` checks inside handlers. There is no global guard registration.
- A feature flag pattern already exists: `NOTIFICATION_ENABLED` env var in `src/notification/sqs.service.ts` (string `'true'`/`'false'`, default `'false'`).
- `ConfigModule.forRoot({ isGlobal: true })` is configured in `src/app.module.ts`, so `ConfigService` is injectable everywhere.

## Findings

### Affected Endpoints (from ticket)

| Method | Path | Handler |
|--------|------|---------|
| POST | `/org-units` | `create()` |
| PATCH | `/org-units/:id` | `update()` |
| DELETE | `/org-units/:id` | `remove()` |
| POST | `/org-units/memberships` | `createOrgMembership()` |
| PATCH | `/org-units/memberships/:id` | `updateOrgMembership()` |
| DELETE | `/org-units/memberships/:id` | `deleteOrgMembership()` |

### Out-of-Scope Write Endpoints (ticket does not mention)

- `PATCH /org-units/:id/restore`
- `DELETE /org-units/:id/hard`
- `PATCH /org-units/code/:code` (byCode variants)
- `DELETE /org-units/code/:code`
- `DELETE /org-units/code/:code/hard`

These may also need gating — needs confirmation.

### No Existing Mechanism for Route-Level Feature Flags

There is currently no reusable guard or decorator for feature toggling at the route level. The only feature flag (`NOTIFICATION_ENABLED`) is checked inside the service method, not at the guard layer. A guard-based approach is cleaner for HTTP-level blocking.

### Error Response Alignment

The ticket requests a "no-permission alert" shown by the frontend, implying the backend should return **HTTP 403 Forbidden**. This is consistent with NestJS's `ForbiddenException` default shape.

## Impact Assessment

- **Affected modules:** `org-unit` only (controller + module wiring)
- **New module:** `src/common/feature-flag/` (guard, decorator, service, module)
- **No database changes:** purely runtime configuration
- **No API contract changes:** existing response shapes unchanged; new 403 added when disabled
- **No breaking changes to read endpoints:** GET routes are unaffected
- **Deployment impact:** requires env var changes per environment; default is `true` (enabled) so existing envs are safe without config changes

## Recommended Approach

Introduce a reusable `FeatureFlagGuard` + `@RequireFeature()` decorator pattern in `src/common/feature-flag/`. A `FeatureFlagService` reads env vars via `ConfigService`. The guard reads the feature key from route metadata and throws `ForbiddenException` if the flag is disabled.

This approach is preferred over:
- **Inline checks in handlers** — repetitive, hard to maintain, not reusable
- **Single combined flag** — too coarse; org-unit create/update/delete and membership operations may need independent control
- **Database-driven feature flags** — over-engineered for this use case; env vars are sufficient and match deployment model
