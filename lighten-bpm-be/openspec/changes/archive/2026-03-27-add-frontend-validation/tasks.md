# Tasks: Add Frontend Validation

- [x] **Database**
    - [x] Add `fe_validation` to `FormRevision` in `prisma/schema.prisma`
    - [x] Run `make migrate-dev name=add_fe_validation_to_form_revision`
- [x] **DTOs**
    - [x] Update `CreateFormRevisionDto`
    - [x] Update `UpdateFormRevisionDto`
    - [x] Update `CreateFormDto`
    - [x] Update response DTOs/Interfaces
- [x] **Logic**
    - [x] Update Form Repository to handle `fe_validation`
    - [x] Update Form Service to pass `fe_validation`
- [x] **API Documentation**
    - [x] Update Controller Swagger decorators
    - [x] Run `make openapi-doc` to refresh the spec
- [x] **Verification**
    - [x] Add unit test for the repository change
    - [x] Add unit test for the service change
    - [x] Run E2E tests to verify persistence
