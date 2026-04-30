# Tasks: Expand Instance Sharing Permissions (GBPM-581)

## Phase 1: Data Provider Enhancement
- [x] Implement `isUserInvolvedAsApprover` in `src/instance/instance-data.service.ts`.
- [x] Add unit tests for `isUserInvolvedAsApprover` in `src/instance/instance-data.service.spec.ts`.

## Phase 2: Service Refactoring
- [x] Implement `checkCanManageShares` private helper in `src/instance/application.service.ts`.
- [x] Refactor `createInstanceShare` to use the helper.
- [x] Refactor `createInstanceShares` to use the helper.
- [x] Refactor `setInstanceShares` to use the helper.
- [x] Refactor `listInstanceShares` to use the helper.
- [x] Refactor `deleteInstanceSharesByQuery` to use the helper.

## Phase 3: Verification
- [x] Add unit tests in `src/instance/application.service.spec.ts` to verify approvers can share.
- [x] Run `make lint` and `make test`.
- [x] (Optional) Run E2E tests if relevant.
