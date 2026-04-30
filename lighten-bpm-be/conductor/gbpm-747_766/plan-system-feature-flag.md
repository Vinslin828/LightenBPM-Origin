# Implementation Plan — System Build Config: Feature Toggle for Org-Unit Write Operations

**Date:** 2026-04-21
**Linked Analysis:** analysis-system-feature-flag.md

## Objective

Introduce a reusable env-var-driven feature flag system and apply it to disable six org-unit write endpoints via backend configuration.

## Scope

| Area | Files |
|------|-------|
| New module | `src/common/feature-flag/feature-flag.service.ts` |
| | `src/common/feature-flag/feature-flag.guard.ts` |
| | `src/common/feature-flag/feature-flag.decorator.ts` |
| | `src/common/feature-flag/feature-flag.module.ts` |
| Modified | `src/org-unit/org-unit.module.ts` |
| Modified | `src/org-unit/org-unit.controller.ts` |
| Env config | `.env` (local), `.env.test` (test), deployment env vars |

## Implementation Steps

### Step 1 — Create `FeatureFlagService`

**File:** `src/common/feature-flag/feature-flag.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureFlagService {
  constructor(private config: ConfigService) {}

  get orgUnitWriteEnabled(): boolean {
    return this.config.get<string>('FEATURE_ORG_UNIT_WRITE_ENABLED', 'true') === 'true';
  }

  get orgMembershipWriteEnabled(): boolean {
    return this.config.get<string>('FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED', 'true') === 'true';
  }
}
```

### Step 2 — Create `@RequireFeature()` decorator

**File:** `src/common/feature-flag/feature-flag.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';

export const FEATURE_FLAG_KEY = 'featureFlag';

export const RequireFeature = (key: keyof FeatureFlagService) =>
  SetMetadata(FEATURE_FLAG_KEY, key);
```

### Step 3 — Create `FeatureFlagGuard`

**File:** `src/common/feature-flag/feature-flag.guard.ts`

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from './feature-flag.decorator';
import { FeatureFlagService } from './feature-flag.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlags: FeatureFlagService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const key = this.reflector.get<keyof FeatureFlagService>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );
    if (!key) return true;

    const enabled = this.featureFlags[key] as boolean;
    if (!enabled) {
      throw new ForbiddenException('This operation is currently disabled by system configuration');
    }
    return true;
  }
}
```

### Step 4 — Create `FeatureFlagModule`

**File:** `src/common/feature-flag/feature-flag.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from './feature-flag.guard';

@Module({
  providers: [FeatureFlagService, FeatureFlagGuard],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagModule {}
```

### Step 5 — Wire into `OrgUnitModule`

**File:** `src/org-unit/org-unit.module.ts`

Add `FeatureFlagModule` to the `imports` array.

**Gotcha:** `FeatureFlagGuard` uses `Reflector` — NestJS provides `Reflector` automatically when the guard is instantiated via DI inside a module context. No manual `Reflector` registration needed.

### Step 6 — Apply decorators to `OrgUnitController`

**File:** `src/org-unit/org-unit.controller.ts`

For each of the six targeted handlers, add `@RequireFeature(...)` and append `FeatureFlagGuard` to the existing `@UseGuards(AuthGuard)`:

```typescript
// Group A: org-unit write operations
@Post()
@RequireFeature('orgUnitWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)
create(...) {}

@Patch(':id')
@RequireFeature('orgUnitWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)
update(...) {}

@Delete(':id')
@RequireFeature('orgUnitWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)
remove(...) {}

// Group B: membership write operations
@Post('memberships')
@RequireFeature('orgMembershipWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)
createOrgMembership(...) {}

@Patch('memberships/:id')
@RequireFeature('orgMembershipWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)
updateOrgMembership(...) {}

@Delete('memberships/:id')
@RequireFeature('orgMembershipWriteEnabled')
@UseGuards(AuthGuard, FeatureFlagGuard)
deleteOrgMembership(...) {}
```

**Ordering constraint:** `@RequireFeature` must appear before `@UseGuards` for the metadata to be set before the guard reads it. In NestJS, decorator order on a method does not matter for metadata reading (Reflector reads at runtime), but keep it consistent with convention.

### Step 7 — Add env vars to local config

Add to `.env` and `.env.test`:
```
FEATURE_ORG_UNIT_WRITE_ENABLED=true
FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED=true
```

Document in `.env.example` if present. For staging/prod, set to `false` via environment variable injection in ECS task definition.

### Step 8 — Lint and format

```bash
make lint
make format
```

## Migration / Data Considerations

None. This is a purely runtime configuration change — no schema changes, no Prisma migrations, no seed changes.

## Testing Checklist

- [ ] Unit test `FeatureFlagGuard`: enabled flag → `canActivate` returns `true`
- [ ] Unit test `FeatureFlagGuard`: disabled flag → throws `ForbiddenException` with correct message
- [ ] Unit test `FeatureFlagService`: env var `'false'` → getter returns `false`; missing env var → defaults to `true`
- [ ] E2E: `POST /org-units` with `FEATURE_ORG_UNIT_WRITE_ENABLED=false` → `403`
- [ ] E2E: `GET /org-units` with `FEATURE_ORG_UNIT_WRITE_ENABLED=false` → `200` (read unaffected)
- [ ] E2E: `POST /org-units/memberships` with `FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED=false` → `403`
- [ ] E2E: `POST /org-units` with both flags `true` → normal `201` response
- [ ] Manual: verify alert message matches frontend expectations ("This operation is currently disabled by system configuration")

## Rollback Plan

1. Set `FEATURE_ORG_UNIT_WRITE_ENABLED=true` and `FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED=true` in the target environment — **no redeploy needed** if env vars are hot-reloaded; otherwise redeploy the ECS task.
2. If code must be reverted: remove the `@RequireFeature` decorators and `FeatureFlagGuard` from `UseGuards` in `org-unit.controller.ts`. The `FeatureFlagModule` can remain as dead code or be removed in a follow-up cleanup.
