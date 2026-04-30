# Analysis Report — Configurable Workflow Serial Number Prefix

**Date:** 2026-04-14

## Problem Statement

The application serial number generator (`generateAppSerialNumber`) hard-codes the format as `APP-{unix_timestamp}`. Customers need a human-readable, configurable format per workflow: `{PREFIX}-{YYYYMMDD}{XXXX}`, where the prefix is set by an admin and the suffix encodes the submission date plus a daily counter.

## Context & Background

- **Current implementation**: `export function generateAppSerialNumber() { return \`APP-${new Date().getTime()}\`; }` — duplicated in two files: `src/instance/application.service.ts:90` and `src/flow-engine/workflow-engine.service.ts:70`.
- **Call chain**: `ApplicationController.createApplication()` → `WorkflowEngineService.createInstance()` → `ApplicationService.createInstanceData()` where the serial number is generated and used to create `ApplicationInstance`, `WorkflowInstance`, and `FormInstance` records.
- **Serial number is a shared key**: `ApplicationInstance.serial_number` is `@unique`; all three instance tables link to it. A uniqueness collision would cause a hard failure on insert.
- **`Workflow` vs `WorkflowRevisions`**: The prefix is a per-workflow admin setting, not revision-specific. `WorkflowRevisions` carries `workflow_id`, so the parent `Workflow` row can be joined at serial-generation time.
- **No existing counter mechanism**: The codebase uses `autoincrement()` for primary keys and application-level `findFirst + version + 1` for revision versioning. No database sequence or counter table existed for this purpose.

## Findings

### Race Condition Risk
Two concurrent `createInstanceData` calls for the same workflow on the same date could both read the same `COUNT(*)` value before either writes, producing duplicate serial numbers. This risk is low with timestamp-based serials (millisecond granularity) but becomes very real with a date-based counter format.

### Orphan Export
`generateAppSerialNumber` in `workflow-engine.service.ts` is exported but never called from that file. The actual invocation is in `ApplicationService.createInstanceData`. This is dead code and a potential source of confusion.

### Transaction Coupling
`createInstanceData` is always called within a `TransactionService.runTransaction()` block. The counter increment must be part of the same transaction so that a rollback (e.g., downstream FK failure) also rolls back the counter, preventing wasted sequence numbers that would create visible gaps in serial numbers.

### Prefix Constraints
- Must be uppercase alphanumeric to prevent special characters from breaking the serial format.
- Maximum 3 characters (customer requirement) — keeps the total serial length bounded and visually clean.
- Default `APP` preserves backward compatibility for existing workflows.

## Impact Assessment

- **All new application submissions** are affected — the serial number format changes from `APP-1707829876543` to `APP-202601010001`.
- **Existing applications** are not affected — their `APP-{timestamp}` serials remain valid (no migration of existing data required).
- **Partial search** in `test_list_applications_search_filters` uses `sn[4:10]` as a partial match — this test still works since the prefix format changes but the partial slice still produces a valid substring.
- **Modules touched**: `instance`, `workflow`, `flow-engine`, `common/utils`, `prisma`.

## Recommended Approach

**PostgreSQL atomic upsert counter table** (`workflow_serial_counters` with composite PK `[workflow_id, date]`):

```sql
INSERT INTO workflow_serial_counters (workflow_id, date, counter)
VALUES ($1, $2, 1)
ON CONFLICT (workflow_id, date)
DO UPDATE SET counter = workflow_serial_counters.counter + 1
RETURNING counter
```

This is the only approach that is both atomic (no race condition) and rollback-safe (runs inside the same Prisma transaction).

**Alternatives rejected:**
- `COUNT(*) WHERE serial_number LIKE '{prefix}-{date}%'`: not atomic; race condition under concurrent submissions.
- `SELECT FOR UPDATE` on the counter row: requires the row to exist first; the first submission per workflow per day would fail.
- PostgreSQL `SEQUENCE`: not rollback-safe; a rolled-back transaction still increments the sequence, causing gaps.
- Prefix on `WorkflowRevisions`: semantically wrong — prefix is a workflow-level config, not a per-revision setting.
- Dedicated `PUT /workflow/:id/prefix` endpoint: adds unnecessary endpoint proliferation; the existing `PUT /workflow/:id` already handles workflow-level config updates.
