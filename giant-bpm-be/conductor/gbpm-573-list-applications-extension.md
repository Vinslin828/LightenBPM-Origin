# Implementation Plan: Extend Application List API (GET /bpm/applications)

This plan describes how to extend the existing application listing API to support new filtering requirements from the FE design change.

## Objective
Extend the `GET /bpm/applications` endpoint to support separate "tabs" for:
- **My Submissions**: Applications submitted by the current user.
- **Shared to Me**: Applications shared with the current user by others.
- **All Applications**: Admin-only view of all application instances.
- **Approving**: Applications where the user is an active assignee or has historically been involved. Defaults to all statuses if `approvalStatus` is omitted.

## Key Files & Context
- `src/instance/dto/list-applications-query.dto.ts`: `ApplicationsFilterEnum` and `ListApplicationsQueryDto`.
- `src/instance/application.service.ts`: `listApplications` orchestration logic.
- `src/instance/repositories/application.repository.ts`: Data access for submitted and approving instances.
- `src/common/permission/permission-builder.service.ts`: Visibility logic (Shared, Applicant, Involved).

## Proposed Changes

### 1. Update `ApplicationsFilterEnum`
Add `SHARED` and `ALL` to the filter enum.

```typescript
// src/instance/dto/list-applications-query.dto.ts

export enum ApplicationsFilterEnum {
  SUBMITTED = 'submitted', // My submissions (Sent Box)
  APPROVING = 'approving', // Involved in approval (Inbox/Archive)
  SHARED = 'shared',       // Shared to me (Shared Box)
  ALL = 'all',             // All applications (Admin/Overall view)
  VISIBLE = 'visible',     // Broad visibility (Applicant OR Shared OR Involved)
}
```

### 2. Refine `ApplicationService.listApplications`
Implement the branch logic to handle the new filters.

- For **APPROVING**: No default `approvalStatus`, allowing for a combined Inbox/Archive view unless filtered explicitly.
- For **ALL**: Check `isAdminUser(user)` before allowing.
- For **SHARED**: Pass a specific `visibilityWhere` that only looks at `instance_shares`.

```typescript
// src/instance/application.service.ts

  async listApplications(
    user: AuthUser,
    query: ListApplicationsQueryDto,
  ): Promise<{ items: ApplicationInstanceDto[]; total: number }> {
    // 1. Handle Approving Filters (Inbox / Archive)
    if (query.filter === ApplicationsFilterEnum.APPROVING) {
      return this.applicationRepository.listApprovingApplicationInstances(
        user.id,
        query,
      );
    }

    // 2. Determine Visibility Scope for Sent Box / Shared Box / Admin View
    let visibilityWhere: Prisma.WorkflowInstanceWhereInput;

    switch (query.filter) {
      case ApplicationsFilterEnum.ALL:
        if (!isAdminUser(user)) {
          throw new ForbiddenException('Only admins can view all applications');
        }
        visibilityWhere = {}; // Unrestricted view for admins
        break;

      case ApplicationsFilterEnum.SHARED:
        visibilityWhere = {
          instance_shares: {
            some: { user_id: user.id },
          },
        };
        break;

      case ApplicationsFilterEnum.VISIBLE:
        visibilityWhere = this.permissionBuilder.getInstanceVisibilityWhere(user);
        break;

      case ApplicationsFilterEnum.SUBMITTED:
      default:
        visibilityWhere = { applicant_id: user.id };
        break;
    }

    return this.applicationRepository.listSubmittedApplicationInstances(
      user.id,
      query,
      visibilityWhere,
    );
  }
```

## Verification & Testing

### Automated Testing
1. **Linting**: Run `make lint` to ensure type safety and code style.
2. **E2E Tests**: Add a new test file `e2e_tester/tests/test_list_application_extension.py` to verify:
   - `filter=shared` returns only shared applications.
   - `filter=all` works for admin and returns 403 for normal users.
   - `filter=approving` without `approvalStatus` lists both pending and completed involvements.

### Manual Verification
1. Verify Swagger UI documentation at `/bpm/openapi` for updated enum values.
2. Test via `curl` or Postman with different filter combinations.
