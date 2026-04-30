# Implementation Plan — fe_validation Not Migrated on Form Export/Import

**Date:** 2026-04-14
**Linked Analysis:** analysis-fe-validation-migration.md

## Objective

Add `fe_validation` to the form export payload and restore it on import so that frontend validation rules survive cross-environment migrations.

## Scope

| File | Role |
|------|------|
| `src/migration/types/migration.types.ts` | Type definition for export payload |
| `src/migration/migration.service.ts` | Export (`buildFormPayload`) + import (`executeFormImport`) logic |
| `src/migration/migration.service.spec.ts` | Unit tests |

No schema migrations, no repository changes, no DTO changes required.

## Implementation Steps

### Step 1 — Extend `FormExportPayload` type

**File:** `src/migration/types/migration.types.ts`, `latest_revision` block (L19–30)

Add `fe_validation` after `form_schema`:

```typescript
latest_revision: {
  public_id: string;
  name: string;
  description: string | null;
  form_schema: Prisma.InputJsonValue;
  fe_validation: Prisma.InputJsonValue | null;   // ADD
  options: {
    can_withdraw: boolean;
    can_copy: boolean;
    can_draft: boolean;
    can_delegate: boolean;
  } | null;
};
```

> Do this first — the compiler will then flag all the missing usages in Step 2 and 3.

---

### Step 2 — Export: include `fe_validation` in `buildFormPayload()`

**File:** `src/migration/migration.service.ts`, inside the `return { ... }` at ~L409–433

In the `latest_revision` object, add after `form_schema`:

```typescript
fe_validation: (latestRevision.fe_validation as Prisma.InputJsonValue) ?? null,
```

`latestRevision` is `FormRevisionWithOptions` which includes the Prisma-typed `fe_validation: Json | null` column.

---

### Step 3 — Import: pass `fe_validation` in update path

**File:** `src/migration/migration.service.ts`, `updateRevision()` call at ~L1226–1236

Add `fe_validation` to the data object:

```typescript
await this.formRepository.updateRevision(
  payload.latest_revision.public_id,
  {
    name: payload.latest_revision.name,
    description: payload.latest_revision.description,
    form_schema: remappedSchema,
    fe_validation: payload.latest_revision.fe_validation,   // ADD
    state: RevisionState.ACTIVE,
    updated_by: userId,
  },
  tx,
);
```

---

### Step 4 — Import: pass `fe_validation` in create path

**File:** `src/migration/migration.service.ts`, `createRevision()` call at ~L1246–1269

Add `fe_validation` to the data object:

```typescript
const newRev = await this.formRepository.createRevision(
  {
    public_id: payload.latest_revision.public_id,
    form_id: form.id,
    name: payload.latest_revision.name,
    description: payload.latest_revision.description ?? undefined,
    form_schema: remappedSchema,
    fe_validation: payload.latest_revision.fe_validation,   // ADD
    version,
    state: RevisionState.ACTIVE,
    options: { create: ... },
    created_by: userId,
    updated_by: userId,
  },
  tx,
);
```

---

### Step 5 — Add unit tests

**File:** `src/migration/migration.service.spec.ts`

Inside the existing `describe('buildFormPayload — validator collection', ...)` block, update `buildFormWithSchema` helper to include `fe_validation` in the revision fixture, then add:

**Test A — non-null `fe_validation` is exported:**
```typescript
it('should include fe_validation in the exported payload', async () => {
  const feValidation = { rules: [{ field: 'email', type: 'required' }] };
  const form = {
    ...buildFormWithSchema({ root: [], entities: {} }),
    form_revisions: [
      {
        public_id: 'REV_PUB_ID',
        name: 'Rev 1',
        description: null,
        form_schema: { root: [], entities: {} },
        fe_validation: feValidation,
        options: null,
      },
    ],
  };
  const result = await (service as any).buildFormPayload(form);
  expect(result.latest_revision.fe_validation).toEqual(feValidation);
});
```

**Test B — null `fe_validation` is exported as null:**
```typescript
it('should export fe_validation as null when not set on the revision', async () => {
  const form = buildFormWithSchema({ root: [], entities: {} });
  // buildFormWithSchema omits fe_validation → coerces to null via ?? null
  const result = await (service as any).buildFormPayload(form);
  expect(result.latest_revision.fe_validation).toBeNull();
});
```

**Test C — `fe_validation` is forwarded on import (create path):**
Assert that `mockFormRepository.createRevision` is called with a `data` argument containing `fe_validation` equal to the payload value. Wire up a minimal `executeFormImport` call with `payload.latest_revision.fe_validation` set.

## Migration / Data Considerations

None. The `fe_validation` column already exists (`20260206091702_add_fe_validation_to_form_revision`). No new migration required.

**Existing imported forms** that lost their `fe_validation` data during prior imports will need to be re-imported from source to recover the data — this cannot be automated without access to the original source-env values.

## Testing Checklist

- [ ] Unit tests pass: `make test -- --testPathPattern=migration.service.spec`
- [ ] E2E suite passes: `make test-local-e2e`
- [ ] Manual: export a form with `fe_validation` set → import to another env → verify `form_revisions.fe_validation` column is non-null and matches source
- [ ] Manual: export a form without `fe_validation` → import → verify column remains `null` (no crash)
- [ ] TypeScript build passes: `make build`

## Rollback Plan

All changes are additive (a new field in type + three new key-value pairs in existing objects). Rolling back means reverting the three lines added in Steps 2–4 and the type change in Step 1. Since `fe_validation` is a nullable column, removing it from the write path simply leaves the column `null` again — no destructive schema changes.
