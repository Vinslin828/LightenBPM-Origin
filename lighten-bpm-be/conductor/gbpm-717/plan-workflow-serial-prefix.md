# Implementation Plan — Configurable Workflow Serial Number Prefix

**Date:** 2026-04-14
**Linked Analysis:** analysis-workflow-serial-prefix.md

## Objective

Replace the hard-coded `APP-{timestamp}` serial number format with a workflow-configurable `{PREFIX}-{YYYYMMDD}{XXXX}` format, backed by a concurrency-safe daily counter table.

## Scope

| Module / File | Type of Change |
|---|---|
| `prisma/schema.prisma` | Schema — add field + new model |
| `prisma/migrations/20260414000000_add_workflow_serial_config/` | Migration — new |
| `src/common/utils/serial-number.ts` | New utility |
| `src/workflow/dto/update-workflow.dto.ts` | DTO — add field |
| `src/workflow/dto/workflow.dto.ts` | DTO — add field + mapper |
| `src/workflow/repositories/workflow.repository.ts` | Repository — update |
| `src/instance/application.service.ts` | Service — replace serial gen logic |
| `src/flow-engine/workflow-engine.service.ts` | Cleanup — remove dead export |
| `e2e_tester/tests/test_workflow_management.py` | E2E — new + extended tests |
| `e2e_tester/tests/test_application_management.py` | E2E — new + format assertions |

## Implementation Steps

### 1. Schema changes — `prisma/schema.prisma`

Add to `Workflow` model:
```prisma
serial_prefix  String  @default("APP") @db.VarChar(3)
serial_counters WorkflowSerialCounter[]
```

Add new model after `Workflow`:
```prisma
model WorkflowSerialCounter {
  workflow_id Int
  date        String
  counter     Int      @default(0)

  @@id([workflow_id, date])
  @@map("workflow_serial_counters")

  workflow Workflow @relation(fields: [workflow_id], references: [id], onDelete: Cascade)
}
```

### 2. Migration — `prisma/migrations/20260414000000_add_workflow_serial_config/migration.sql`

```sql
ALTER TABLE "workflows" ADD COLUMN "serial_prefix" VARCHAR(3) NOT NULL DEFAULT 'APP';

CREATE TABLE "workflow_serial_counters" (
  "workflow_id"  INTEGER NOT NULL,
  "date"         TEXT    NOT NULL,
  "counter"      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "workflow_serial_counters_pkey" PRIMARY KEY ("workflow_id", "date")
);

ALTER TABLE "workflow_serial_counters"
  ADD CONSTRAINT "workflow_serial_counters_workflow_id_fkey"
  FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

> **Gotcha**: Remove the `public.` schema prefix from generated SQL (per CLAUDE.md convention) — already done here.

### 3. Regenerate Prisma client

```bash
make prisma
```

Must run after schema changes before any TypeScript compilation.

### 4. New utility — `src/common/utils/serial-number.ts`

```typescript
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

export async function generateWorkflowSerialNumber(
  workflowId: number,
  prefix: string,
  issueDate: Date,
  tx: PrismaTransactionClient,
): Promise<string> {
  const dateStr = formatIssueDate(issueDate);
  const rows = await tx.$queryRaw<Array<{ counter: number }>>`
    INSERT INTO "workflow_serial_counters" ("workflow_id", "date", "counter")
    VALUES (${workflowId}, ${dateStr}, 1)
    ON CONFLICT ("workflow_id", "date")
    DO UPDATE SET "counter" = "workflow_serial_counters"."counter" + 1
    RETURNING "counter"
  `;
  const paddedSeq = String(rows[0].counter).padStart(4, '0');
  return `${prefix}-${dateStr}${paddedSeq}`;
}

function formatIssueDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
```

### 5. Update `UpdateWorkflowDto` — `src/workflow/dto/update-workflow.dto.ts`

Add (with imports for `IsString`, `MaxLength`, `Matches`):
```typescript
@IsOptional()
@IsString()
@MaxLength(3)
@Matches(/^[A-Z0-9]+$/, { message: 'serial_prefix must be uppercase alphanumeric' })
serial_prefix?: string;
```

### 6. Update `WorkflowDto` — `src/workflow/dto/workflow.dto.ts`

Add field:
```typescript
@ApiProperty({ description: 'Serial number prefix for applications in this workflow', example: 'APP' })
serial_prefix: string;
```

In `toWorkflowDto`, add:
```typescript
dto.serial_prefix = workflow.serial_prefix;
```

### 7. Update `WorkflowRepository.updateWorkflow` — `src/workflow/repositories/workflow.repository.ts`

Change destructuring and `tx.workflow.update` data:
```typescript
const { tags, is_active, serial_prefix } = data;
// ...
data: { is_active, serial_prefix, updated_by }
```

Prisma ignores `undefined` fields — omitting `serial_prefix` will not overwrite existing value.

### 8. Update `ApplicationService.createInstanceData` — `src/instance/application.service.ts`

- Inject `PrismaService` in constructor.
- Import `generateWorkflowSerialNumber` from `../common/utils/serial-number`.
- Import `PrismaService` from `../prisma/prisma.service`.
- Remove `export function generateAppSerialNumber()` and its usage.
- Replace serial number generation:

```typescript
const db = tx ?? this.prisma;
const workflow = await db.workflow.findUniqueOrThrow({
  where: { id: workflowRevision.workflow_id },
  select: { id: true, serial_prefix: true },
});
const serial_number = await generateWorkflowSerialNumber(
  workflow.id,
  workflow.serial_prefix,
  new Date(),
  db,
);
```

### 9. Remove dead code — `src/flow-engine/workflow-engine.service.ts`

Delete:
```typescript
export function generateAppSerialNumber() {
  return `APP-${new Date().getTime()}`;
}
```

### 10. E2E tests

See "Testing Checklist" section below.

## Migration / Data Considerations

- **Existing applications**: No data migration needed. `APP-{timestamp}` serials remain valid permanently.
- **Existing workflows**: All get `serial_prefix = 'APP'` from the column `DEFAULT` — no backfill required.
- **Counter table starts empty**: First submission per workflow per day inserts `counter = 1`; subsequent ones increment. This is correct.
- **Apply migration**: `make migrate-dev name=add_workflow_serial_config` (requires local DB to be in clean migration state).

## Testing Checklist

### Unit Tests
- [ ] `src/common/utils/serial-number.spec.ts` (new)
  - [ ] `formatIssueDate` pads month/day correctly (e.g. `2026-01-05` → `20260105`)
  - [ ] Returns `HR-202601010001` for counter=1, prefix=HR, date=2026-01-01
  - [ ] Returns `APP-202601010099` for counter=99 (zero-padded to `0099`)
- [ ] `src/workflow/dto/update-workflow.dto.spec.ts`
  - [ ] `serial_prefix: 'hr'` fails (lowercase)
  - [ ] `serial_prefix: 'ABCD'` fails (4 chars, exceeds max 3)
  - [ ] `serial_prefix: 'HR'` passes
  - [ ] Omitting `serial_prefix` leaves field `undefined`

### E2E Tests (`make test-local-e2e`)
- [ ] `test_get_workflow` — asserts `serial_prefix == "APP"` on new workflow
- [ ] `test_update_workflow_serial_prefix` (new) — valid update to "HR" succeeds; lowercase/4-char rejected with 400
- [ ] `test_application_lifecycle_and_withdraw_running` — `serial_number` matches `^[A-Z0-9]{1,3}-\d{12}$`
- [ ] `test_create_and_submit_application` — `serial_number` matches format regex
- [ ] `test_custom_prefix_serial_number` (new) — set prefix "TST", submit app, assert `^TST-\d{12}$`

### Manual Checks
- [ ] Apply migration on a fresh local DB: `make db-dev-up && make migrate-dev`
- [ ] Submit two applications concurrently for the same workflow; verify distinct sequence numbers (`0001`, `0002`)
- [ ] Confirm old `APP-{timestamp}` serials on existing apps are still queryable
- [ ] Verify Swagger UI at `/bpm/openapi` shows `serial_prefix` in `WorkflowDto` and `UpdateWorkflowDto`

## Rollback Plan

1. Revert the Prisma schema changes (remove `serial_prefix` field from `Workflow`, remove `WorkflowSerialCounter` model).
2. Run `make prisma` to regenerate the client.
3. Restore `generateAppSerialNumber` in `application.service.ts` and revert all call-site changes.
4. Drop the migration: `ALTER TABLE workflows DROP COLUMN serial_prefix; DROP TABLE workflow_serial_counters;`
5. Remove the migration directory `prisma/migrations/20260414000000_add_workflow_serial_config/`.
6. Restore the orphan export in `workflow-engine.service.ts` if any downstream code depended on it (none currently does).
