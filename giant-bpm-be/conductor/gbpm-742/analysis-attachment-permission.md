# Analysis Report — Attachment Permission Checking

**Date:** 2026-04-13

## Problem Statement

The attachment feature (GBPM-475) applies an overly restrictive applicant-only permission
check to all attachment operations, including read-only ones (list, download). Approvers,
escalated approvers, and instance-share recipients are blocked from viewing attachments
on applications they legitimately need to review.

## Context & Background

The attachment feature was built as part of GBPM-475 and introduces a direct-to-S3 upload
architecture using presigned URLs. Two flows exist:

- **Flow A** — Upload to an existing application (`/applications/{serial_number}/attachments/…`)
- **Flow B** — Draft flow for pre-submission attachments (`/attachments/drafts/{draft_id}/…`)

All application-scoped attachment endpoints (`GET`, `POST`, `PATCH`, `DELETE`) go through
`AttachmentService.checkApplicationAccess(serialNumber, userId, checkEditStatus?)`, which
hard-codes the guard:

```typescript
if (instance.applicant_id !== userId) {
  throw new ForbiddenException(...)
}
```

The rest of the codebase (comments, routing, nodes, workflow history, application detail)
uses `PermissionBuilderService.getInstanceVisibilityWhere(user)` to build a Prisma WHERE
clause that allows access to:
- The applicant (`applicant_id`)
- Users with an `instance_share` record
- Assigned approvers (`approval_tasks.assignee_id`)
- Escalated approvers (`approval_tasks.escalated_to`)
- Admins (unrestricted, returns `{}`)

`AttachmentService` did not use this mechanism, creating an inconsistency.

## Findings

### Root Cause
`checkApplicationAccess` was written with a single concern (applicant write-protection) and
then reused for read operations without adapting the guard logic. The `checkEditStatus`
parameter only adds a status check on top of the applicant check — it never relaxes it.

### Affected Operations
| Endpoint | Operation type | Incorrectly blocked? |
|---|---|---|
| `GET /applications/:sn/attachments` | READ | Yes — approvers blocked |
| `GET /applications/:sn/attachments/:id/download` | READ | Yes — approvers blocked |
| `POST /applications/:sn/attachments/presign-upload` | WRITE | No (applicant-only is correct) |
| `POST /applications/:sn/attachments` (confirm) | WRITE | No |
| `PATCH /applications/:sn/attachments/:id` | WRITE | No |
| `DELETE /applications/:sn/attachments/:id` | WRITE | No |

### `PermissionBuilderService` availability
`PermissionModule` exports `PermissionBuilderService`, but `AttachmentModule` did not import
it. `InstanceModule` (which `AttachmentModule` imports via `forwardRef`) imports
`PermissionModule` for its own use but does not re-export it, so it was unavailable to
`AttachmentService`.

### Security consideration
For read operations, returning `403 Forbidden` when a user lacks access leaks the existence
of the application. The fix returns `404 Not Found` for both "not found" and "no visibility"
cases, consistent with how other services handle this.

## Impact Assessment

- **Approvers** cannot list or download attachments on applications assigned to them, breaking
  the review workflow entirely when attachments are involved.
- **Escalated approvers** face the same block.
- **Instance-share recipients** (CC'd users) cannot view attachments even when they have
  explicit VIEW permission on the application.
- No data integrity or security regression — write operations (upload, delete, update) were
  correctly restricted and remain so.

Scope: `src/attachment/` module, all environments. No database or migration impact.

## Recommended Approach

Split the single `checkApplicationAccess` method into two purpose-specific private methods:

1. **`checkApplicationReadAccess(serialNumber, user: AuthUser)`** — uses
   `PermissionBuilderService.getInstanceVisibilityWhere(user)` passed to
   `workflowInstanceRepo.findBySerialNumber(serialNumber, visibilityWhere)`. Returns `404`
   if the instance is not found or the user has no visibility. Used by `listAttachments`
   and `presignDownload`.

2. **`checkApplicationAccess(serialNumber, userId, checkEditStatus)`** (unchanged) — retains
   the current applicant-only + status guard. Used by all write operations.

`PermissionModule` must be added to `AttachmentModule` imports.

**Alternative considered:** Add a boolean `readOnly` flag to `checkApplicationAccess`.
Rejected because it conflates two distinct security concerns in a single method and makes
call sites harder to read.
