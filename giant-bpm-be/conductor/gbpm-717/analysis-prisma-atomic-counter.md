# Analysis Report — Why $queryRaw for the Serial Number Counter

**Date:** 2026-04-14

## Problem Statement

During the GBPM-717 implementation review, the question arose: why does
`generateWorkflowSerialNumber` in `src/common/utils/serial-number.ts` use
`tx.$queryRaw` for the counter upsert instead of Prisma's standard ORM `upsert`
method? This document records the technical rationale so the decision is
preserved for future maintainers.

## Context & Background

- The serial number format is `{PREFIX}-{YYYYMMDD}{XXXX}`, where `XXXX` is a
  zero-padded 4-digit daily counter per workflow.
- The counter must never produce duplicates — duplicate `serial_number` values
  cause a hard `UNIQUE` constraint failure on `ApplicationInstance`.
- `generateWorkflowSerialNumber` is always called inside a
  `TransactionService.runTransaction()` block, so it receives a
  `PrismaTransactionClient` (`tx`).
- The counter is stored in `workflow_serial_counters (workflow_id PK, date PK,
  counter INT)`.

## Findings

### Prisma `upsert` with `{ increment: 1 }` returns the stale value

Prisma's upsert with an increment expression:

```typescript
const row = await tx.workflowSerialCounter.upsert({
  where: { workflow_id_date: { workflow_id, date: dateStr } },
  create: { workflow_id, date: dateStr, counter: 1 },
  update: { counter: { increment: 1 } },
});
return row.counter; // ← returns the PRE-update value
```

Prisma's `update` returns the row state *before* the update was applied. Two
concurrent requests that both read `counter: 5` would both return `5` and
generate identical serial numbers ending in `0005`.

### `findUnique` + JS increment + `update` has a read-write race condition

```typescript
const existing = await tx.workflowSerialCounter.findUnique({ ... });
const next = (existing?.counter ?? 0) + 1;
await tx.workflowSerialCounter.upsert({ ..., update: { counter: next } });
return next;
```

Between the `findUnique` and the `upsert`, another concurrent transaction can
read the same `counter` value. Both write the same `next`, producing a
duplicate.

### Raw SQL `INSERT ... ON CONFLICT ... RETURNING` is the only correct pattern

```sql
INSERT INTO "workflow_serial_counters" ("workflow_id", "date", "counter")
VALUES ($1, $2, 1)
ON CONFLICT ("workflow_id", "date")
DO UPDATE SET "counter" = "workflow_serial_counters"."counter" + 1
RETURNING "counter"
```

PostgreSQL executes this as a single atomic statement:
1. Acquires a row lock on the `(workflow_id, date)` key.
2. Performs the insert or increment inside the lock.
3. Returns the *post-update* counter value via `RETURNING`.

No other transaction can interleave between steps 1–3. This is the only
approach that is both atomic and returns the correct new value.

### Summary comparison

| Approach | Atomic? | Returns new value? | Verdict |
|---|---|---|---|
| `findUnique` + JS `+1` + `update` | No — race condition | Yes | Unsafe |
| Prisma `upsert` `{ increment: 1 }` | Yes (DB-level) | No — stale | Unusable |
| `$queryRaw` INSERT … ON CONFLICT … RETURNING | Yes | Yes | Correct |

## Impact Assessment

If a non-atomic approach were used under concurrent load:
- Two applications submitted simultaneously for the same workflow on the same
  day could receive identical `serial_number` values.
- The `UNIQUE` constraint on `ApplicationInstance.serial_number` would cause one
  insert to fail with a 500 error, resulting in a lost application submission.
- The probability is low under light load but increases linearly with concurrent
  submission volume.

## Recommended Approach

Use `tx.$queryRaw` with the PostgreSQL atomic upsert pattern (as implemented).
This is not a workaround — it is the idiomatic PostgreSQL solution for
concurrent counter generation. The approach is:

- **Atomic**: Single SQL statement, no interleave window.
- **Rollback-safe**: Runs inside the same Prisma transaction as the
  `ApplicationInstance` insert; a rollback undoes the counter increment.
- **Correct return value**: `RETURNING counter` yields the post-increment value
  needed to construct the serial number.

Alternatives (`SELECT FOR UPDATE`, application-level sequences, `COUNT(*)`) were
all evaluated and rejected — see `analysis-workflow-serial-prefix.md` for the
full alternatives analysis.
