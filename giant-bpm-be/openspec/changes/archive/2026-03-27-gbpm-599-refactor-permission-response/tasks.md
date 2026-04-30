## 1. DTO Refactoring

- [x] 1.1 Create `AggregatedFormPermissionDto` and `AggregatedPermissionActionDto` in `src/form/dto/form-permission.dto.ts`
- [x] 1.2 Create `AggregatedWorkflowPermissionDto` in `src/workflow/dto/workflow-permission.dto.ts`
- [x] 1.3 Create `AggregatedInstanceShareDto` and `AggregatedInstanceShareActionDto` in `src/instance/dto/instance-share.dto.ts`
- [x] 1.4 Add `permission` field to `InstanceShareDto` and its aggregated variants

## 2. Core Service Refactoring

- [x] 2.1 Update `FormService.getFormPermissions` to implement aggregation logic
- [x] 2.2 Update `WorkflowService.getWorkflowPermissions` to implement aggregation logic
- [x] 2.3 Update `ApplicationService.listInstanceShares` in `src/instance/application.service.ts` to implement aggregation logic
- [x] 2.4 (Optional) Implement shared aggregation utility in `src/common/utils/permission-utils.ts`

## 3. Controller and API Documentation

- [x] 3.1 Update `FormController.getFormPermissions` return type and docs
- [x] 3.2 Update `WorkflowController.getWorkflowPermissions` return type and docs
- [x] 3.3 Update `ApplicationController.listInstanceShares` in `src/instance/application.controller.ts` return type and docs

## 4. Verification and Testing

- [x] 4.1 Update unit tests for `FormService` and `WorkflowService`
- [x] 4.2 Update unit tests for `ApplicationService` in `src/instance/application.service.spec.ts`
- [x] 4.3 Verify API response format for all three modules via manual testing


