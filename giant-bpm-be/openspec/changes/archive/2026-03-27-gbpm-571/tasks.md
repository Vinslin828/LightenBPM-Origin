# Tasks: Refactor Application Visibility (GBPM-571)

## Phase 1: DTO Updates
- [x] Update `ApplicationsFilterEnum` in `src/instance/dto/list-applications-query.dto.ts` to include `VISIBLE`
- [x] Add `serialNumber` and `applicantId` to `ListApplicationsQueryDto` in `src/instance/dto/list-applications-query.dto.ts`

## Phase 2: Repository Updates
- [x] Update `listSubmittedApplicationInstances` in `ApplicationRepository` to support `serialNumber` and `applicantId` filters.
- [x] Ensure the sorting and pagination logic remains robust for all filters.

## Phase 3: Service Updates
- [x] Refactor `listApplications` in `ApplicationService` to apply logic based on `filter`:
    - `SUBMITTED`: Stricter filter on `applicant_id === user.id`.
    - `APPROVING`: Call `listApprovingApplicationInstances`.
    - `VISIBLE`: Use `permissionBuilder.getInstanceVisibilityWhere(user)`.

## Phase 4: Verification
- [x] Update existing unit tests for `ApplicationController` and `ApplicationService`.
- [x] Add new test cases for `VISIBLE` filter and search parameters in unit tests.
- [x] Verify that `listApplications` (with `SUBMITTED` filter) no longer shows shared applications.
- [x] Run `make lint` and `make test`.

## Phase 5: E2E Test Updates
- [x] Update `test_instance_sharing` in `e2e_tester/tests/test_permission_system_filtering.py` to use `filter=visible`.
- [x] Add search filter tests to `e2e_tester/tests/test_application_management.py`.
- [x] Run E2E tests to verify system-wide correctness.
