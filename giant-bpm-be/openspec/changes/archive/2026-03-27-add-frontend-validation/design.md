# Design: Add Frontend Validation (fe_validation)

## 1. Database Changes
- **File**: `prisma/schema.prisma`
- **Model**: `FormRevision`
- **Change**: Add `fe_validation Json?` column.

```prisma
model FormRevision {
  // ... existing fields
  fe_validation Json?
  // ...
}
```

## 2. DTO Updates
We need to allow the new field to pass through the API.

- **Files**:
    - `src/form/dto/create-form-revision.dto.ts`
    - `src/form/dto/update-form-revision.dto.ts`
    - `src/form/dto/form-revision-response.dto.ts` (or similar)
- **Change**: Add `fe_validation` property with `@IsOptional()` and `@IsObject()` decorators.

## 3. Repository and Service Updates
- **File**: `src/form/repositories/form-revision.repository.ts` (or `form.repository.ts`)
- **Change**: Ensure `fe_validation` is included in the `create`, `update`, and `find` queries.
- **File**: `src/form/form.service.ts`
- **Change**: Pass `fe_validation` from the DTO to the repository.

## 4. API Documentation
- Update Swagger decorators in the controller to reflect the new field in the response and request bodies.

## 5. Verification Plan
- **Unit Tests**: Update repository and service tests to include `fe_validation`.
- **E2E Tests**: Add a test case to create a form revision with `fe_validation` and verify it can be retrieved correctly.
