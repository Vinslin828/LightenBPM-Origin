## 1. Schema & Models

- [x] 1.1 Update `prisma/schema.prisma` with `FormPermission`, `WorkflowPermission`, and `InstanceShare` models
- [x] 1.2 Add `GranteeType` and `PermissionAction` enums to the Prisma schema
- [x] 1.3 Create a new database migration using `make migrate-dev name=add_permission_system`
- [x] 1.4 Update Prisma client and verify the new models are accessible

## 2. Core Permission Logic

- [x] 2.1 Create the `PermissionModule` and `PermissionBuilderService` in `src/common/permission`
- [x] 2.2 Implement `getFormVisibilityWhere(user)` in `PermissionBuilderService` with explicit "Default Deny" logic (unless Creator/Admin/Public)
- [x] 2.3 Implement `getInstanceVisibilityWhere(user)` in `PermissionBuilderService`
- [x] 2.4 Implement `canPerformAction(user, resource, action)` for individual checks
- [x] 2.5 Add unit tests for `PermissionBuilderService` logic (different user scenarios)

## 3. Form Module Integration

- [x] 3.1 Refactor `FormService.findAll` to use `PermissionBuilderService` for filtering
- [x] 3.2 Add permission checks to `FormService.create`, `update`, and `delete`
- [x] 3.3 Create a new controller/endpoints for managing `FormPermission` records
    - [x] Support batch creation (array in body)
    - [x] Support query-based deletion (grantee_type, grantee_value, action)
- [x] 3.4 Update DTOs to support permission assignment in form creation/updates

## 4. Instance Module Integration

- [x] 4.1 Refactor `InstanceService` listing methods to apply visibility filters
- [x] 4.2 Refactor `ApplicationRepository.listAvailableApplications` to apply workflow-centric `USE` permission filters
- [x] 4.3 Implement `InstanceShare` management APIs
    - [x] Support batch sharing (array in body)
    - [x] Support query-based deletion (user_id)
- [x] 4.4 Ensure `WorkflowEngine` respects visibility rules when retrieving instance details

## 5. Workflow Module Integration

- [x] 5.1 Update `WorkflowService` to use `PermissionBuilderService` for listing and actions
- [x] 5.2 Add permission checks to Workflow create/update/delete operations
- [x] 5.3 Expose endpoints for managing `WorkflowPermission`
    - [x] Support batch creation (array in body)
    - [x] Support query-based deletion (grantee_type, grantee_value, action)

## 6. Verification & Standards

- [x] 6.1 Run `make lint` and `make format` to ensure code quality
- [x] 6.2 Run unit tests with `make test`
- [x] 6.3 Create an E2E test case for permission filtering (e.g., User A cannot see User B's private form)
- [x] 6.4 Run E2E tests with `make test-local-e2e`
