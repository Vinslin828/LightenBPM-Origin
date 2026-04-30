# Implementation Plan — Attachment Permission Checking

**Date:** 2026-04-13
**Linked Analysis:** analysis-attachment-permission.md

## Objective

Allow approvers, escalated approvers, instance-share recipients, and admins to list and
download attachments on applications they have visibility into, while keeping write
operations (upload, confirm, update, delete) restricted to the applicant only.

## Scope

| File | Role |
|---|---|
| `src/attachment/attachment.module.ts` | Module wiring |
| `src/attachment/attachment.service.ts` | Core permission logic |
| `src/attachment/attachment.controller.ts` | Call-site signature update |

No Prisma schema changes. No migrations. No other modules touched.

## Implementation Steps

### 1. `src/attachment/attachment.module.ts` — add `PermissionModule`

Add `PermissionModule` to the `imports` array so `PermissionBuilderService` is injectable
into `AttachmentService`. Place before `forwardRef(() => InstanceModule)`.

```typescript
import { PermissionModule } from '../common/permission/permission.module';

@Module({
  imports: [PrismaModule, ConfigModule, PermissionModule, forwardRef(() => InstanceModule)],
  ...
})
```

**Gotcha:** `InstanceModule` imports `PermissionModule` for its own providers but does not
re-export it, so `AttachmentModule` must import it directly.

---

### 2. `src/attachment/attachment.service.ts` — inject service and add read check

**2a. Add imports at the top:**
```typescript
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import type { AuthUser } from '../auth/types/auth-user';
```

**2b. Add to constructor:**
```typescript
private readonly permissionBuilder: PermissionBuilderService,
```

**2c. Add `checkApplicationReadAccess` after `checkApplicationAccess`:**
```typescript
private async checkApplicationReadAccess(
  serialNumber: string,
  user: AuthUser,
) {
  const visibilityWhere =
    this.permissionBuilder.getInstanceVisibilityWhere(user);
  const instance = await this.workflowInstanceRepo.findBySerialNumber(
    serialNumber,
    visibilityWhere,
  );
  if (!instance) {
    throw new NotFoundException(`Application ${serialNumber} not found`);
  }
  return instance;
}
```

**2d. Update `listAttachments` signature and access check:**
- Change parameter `userId: number` → `user: AuthUser`
- Replace `this.checkApplicationAccess(serialNumber, userId)` →
  `this.checkApplicationReadAccess(serialNumber, user)`

**2e. Update `presignDownload` signature and access check:**
- Change parameter `userId: number` → `user: AuthUser`
- Replace `this.checkApplicationAccess(serialNumber, userId)` →
  `this.checkApplicationReadAccess(serialNumber, user)`

---

### 3. `src/attachment/attachment.controller.ts` — update call sites

**`listAttachments`:** pass `user` instead of `user.id`:
```typescript
return this.attachmentService.listAttachments(serialNumber, user, fieldKey);
```

**`presignDownload`:** pass `user` instead of `user.id`:
```typescript
return this.attachmentService.presignDownload(serialNumber, user, id);
```

No changes needed to route decorators, guards, or DTOs.

---

### 4. Build verification

```bash
make build   # includes lint + tsc
```

## Migration / Data Considerations

None. This is a service-layer logic change only. No schema changes, no migrations, no seed
updates required.

## Testing Checklist

### Unit tests (`src/attachment/attachment.service.spec.ts` — to be created)
- [ ] `listAttachments` — applicant can list attachments
- [ ] `listAttachments` — approver (`assignee_id` match) can list attachments
- [ ] `listAttachments` — escalated approver (`escalated_to` match) can list attachments
- [ ] `listAttachments` — unrelated user receives `NotFoundException`
- [ ] `presignDownload` — approver can get download URL
- [ ] `presignDownload` — unrelated user receives `NotFoundException`
- [ ] `presignUpload` — approver receives `ForbiddenException` (write stays restricted)
- [ ] `deleteAttachment` — approver receives `ForbiddenException`
- [ ] Write operations blocked when instance status is not `DRAFT` or `RUNNING`

### E2E scenarios
- [ ] Log in as an assigned approver; call `GET /applications/:sn/attachments` — expect `200`
- [ ] Log in as an assigned approver; call `GET /applications/:sn/attachments/:id/download` — expect `200`
- [ ] Log in as an approver; call `POST /applications/:sn/attachments/presign-upload` — expect `403`
- [ ] Log in as an unrelated user; call `GET /applications/:sn/attachments` — expect `404`
- [ ] Log in as admin; call all read endpoints — expect `200`

### Manual checks
- [ ] `make build` passes with no lint or type errors
- [ ] Swagger UI reflects no change to endpoint signatures (same DTOs)

## Rollback Plan

The change is isolated to three files with no schema impact. To revert:

1. Remove `PermissionModule` from `AttachmentModule` imports.
2. Delete `checkApplicationReadAccess` from `AttachmentService`.
3. Revert `listAttachments` and `presignDownload` signatures back to `userId: number`.
4. Revert controller call sites to pass `user.id` instead of `user`.
5. Run `make build` to confirm clean state.

All changes are in git history on the feature branch and can be reverted with a single
`git revert` or by checking out the prior commit.
