# Implementation Plan — Atomic Counter via $queryRaw

**Date:** 2026-04-14
**Linked Analysis:** analysis-prisma-atomic-counter.md

## Objective

Document and validate that `generateWorkflowSerialNumber` uses a PostgreSQL
atomic upsert (`$queryRaw`) to ensure the daily serial counter never produces
duplicate values under concurrent load.

## Scope

| File | Role |
|---|---|
| `src/common/utils/serial-number.ts` | Counter generation — the `$queryRaw` call |
| `src/instance/application.service.ts` | Call site — passes `tx` from surrounding transaction |
| `prisma/schema.prisma` | `WorkflowSerialCounter` model definition |
| `prisma/migrations/20260414000000_add_workflow_serial_config/` | Counter table DDL |

## Implementation Steps

The implementation is complete. These steps describe what was done and any
follow-up validation required.

### 1. Counter table (done)

`workflow_serial_counters (workflow_id, date, counter)` with composite PK
`(workflow_id, date)`. Created in migration
`20260414000000_add_workflow_serial_config/migration.sql`.

**Gotcha:** The `date` column is `TEXT` (storing `'YYYYMMDD'`), not a `DATE`
type. This simplifies comparison and avoids timezone conversion at the DB layer.

### 2. Atomic upsert utility (done)

`src/common/utils/serial-number.ts` — `generateWorkflowSerialNumber(workflowId,
prefix, issueDate, tx)`:
- Formats `issueDate` to `'YYYYMMDD'` string via `formatIssueDate`.
- Executes the atomic upsert via `tx.$queryRaw`.
- Returns `${prefix}-${dateStr}${paddedSeq}` where `paddedSeq` is the new
  counter zero-padded to 4 digits.

**Why `$queryRaw` and not Prisma `upsert`:** Prisma's `upsert` with
`{ increment: 1 }` returns the pre-update row value. Only `$queryRaw` with
`RETURNING counter` yields the post-increment value atomically. See
`analysis-prisma-atomic-counter.md` for full rationale.

### 3. Call site (done)

`src/instance/application.service.ts` — `createInstanceData` passes `db` (which
is `tx ?? this.prisma`) to `generateWorkflowSerialNumber`. When called inside
`TransactionService.runTransaction()`, `tx` is always defined, so the counter
increment is part of the surrounding transaction and rolls back if the
application insert fails.

### 4. Unit tests (pending)

Write `src/common/utils/serial-number.spec.ts`:
- Mock `tx.$queryRaw` to return `[{ counter: 1 }]`, `[{ counter: 99 }]`, etc.
- Assert `formatIssueDate` pads month/day correctly (e.g. `2026-01-05` →
  `'20260105'`).
- Assert return value for `counter=1, prefix='HR', date=2026-01-01` is
  `'HR-202601010001'`.
- Assert return value for `counter=99` pads to `'0099'`.

### 5. Migration application (pending)

Apply `20260414000000_add_workflow_serial_config` on target environments. Was
blocked locally due to pre-existing migration state mismatch. SQL is correct
and idempotent — apply once DB is in a clean migration state.

```bash
make migrate-dev name=add_workflow_serial_config  # local
# or apply migration SQL directly on staging/prod via CI pipeline
```

## Migration / Data Considerations

- `ALTER TABLE "workflows" ADD COLUMN "serial_prefix" VARCHAR(3) NOT NULL
  DEFAULT 'APP'` — no backfill needed; existing workflows get `'APP'`
  automatically.
- `CREATE TABLE "workflow_serial_counters"` — starts empty; first insert per
  `(workflow_id, date)` sets `counter = 1`.
- Existing `APP-{timestamp}` serial numbers on pre-existing applications are
  unaffected and remain permanently valid.

## Testing Checklist

### Unit tests
- [ ] `src/common/utils/serial-number.spec.ts` (new)
  - [ ] `formatIssueDate` pads single-digit month/day
  - [ ] Returns correct serial for `counter=1`
  - [ ] Returns correct serial for `counter=99` (zero-pads to `0099`)
  - [ ] Counter value from mock is used (not hardcoded)

### E2E (already passing)
- [x] `test_get_workflow` — asserts `serial_prefix == "APP"` on new workflow
- [x] `test_update_workflow_serial_prefix` — valid/invalid prefix, 200/400
- [x] `test_application_lifecycle_and_withdraw_running` — serial matches
  `^[A-Z0-9]{1,3}-\d{12}$`
- [x] `test_create_and_submit_application` — serial matches format regex
- [x] `test_custom_prefix_serial_number` — sets prefix `TST`, asserts
  `^TST-\d{12}$`

### Manual checks
- [ ] Apply migration on a fresh local DB (`make db-dev-up && make migrate-dev`)
- [ ] Submit two applications concurrently for the same workflow; verify
  distinct sequence numbers (`0001`, `0002`)
- [ ] Verify Swagger UI at `/bpm/openapi` shows `serial_prefix` in
  `WorkflowDto` and `UpdateWorkflowDto`

## Rollback Plan

1. Revert `src/common/utils/serial-number.ts` — restore
   `generateAppSerialNumber` and its call in `application.service.ts`.
2. Remove `serial_prefix` field from `WorkflowDto`, `UpdateWorkflowDto`, and
   `WorkflowRepository.updateWorkflow`.
3. Remove `serial_prefix` from `prisma/schema.prisma` and delete the
   `WorkflowSerialCounter` model.
4. Run `make prisma` to regenerate the Prisma client.
5. Drop migration:
   ```sql
   ALTER TABLE "workflows" DROP COLUMN "serial_prefix";
   DROP TABLE "workflow_serial_counters";
   ```
6. Delete `prisma/migrations/20260414000000_add_workflow_serial_config/`.
