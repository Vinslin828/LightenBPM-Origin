## 1. Repository Enhancements

- [x] 1.1 Implement `setPermissions` in `FormRepository` (transactional deleteMany + create)
- [x] 1.2 Implement `setPermissions` in `WorkflowRepository` (transactional deleteMany + create)
- [x] 1.3 Implement `setShares` in `InstanceShareRepository` (transactional deleteMany + query)

## 2. Form Module Implementation

- [x] 2.1 Implement `setFormPermissions` in `FormService`
- [x] 2.2 Update `FormService` permission methods (`list`, `add`, `delete`, `set`) to check for `MANAGE` permission for non-admins
- [x] 2.3 Add `PUT /:form_id/permissions` endpoint to `FormController`
- [x] 2.4 Update `FormController` authorization logic for permission endpoints

## 3. Workflow Module Implementation

- [x] 3.1 Implement `setWorkflowPermissions` in `WorkflowService`
- [x] 3.2 Update `WorkflowService` permission methods (`list`, `add`, `delete`, `set`) to check for `MANAGE` permission for non-admins
- [x] 3.3 Add `PUT /:workflow_id/permissions` endpoint to `WorkflowController`
- [x] 3.4 Update `WorkflowController` authorization logic for permission endpoints

## 4. Instance Module Implementation

- [x] 4.1 Implement `setInstanceShares` in `ApplicationService`
- [x] 4.2 Update `ApplicationService` share methods to ensure proper authorization (Admin or Applicant)
- [x] 4.3 Add `PUT /:serial_number/shares` endpoint to `ApplicationController`
- [x] 4.4 Update `ApplicationController` authorization logic for share endpoints

## 5. Verification & Standards

- [x] 5.1 Create a verification script `dev-utils/ts-node/verify_permission_apis.ts`
- [x] 5.2 Verify `clear` behavior (DELETE without query) for all modules
- [x] 5.3 Verify `set` behavior (PUT) for all modules
- [x] 5.4 Verify refined authorization (MANAGE permission for non-admins)
- [x] 5.5 Run `make lint` and `make format`
- [x] 5.6 Run E2E tests with `make test-local-e2e`

## 6. Guidelines & Best Practices

- [x] 6.1 Update `GEMINI.md` with Type Safety & Prisma Conventions to prevent unsafe `any` usage
