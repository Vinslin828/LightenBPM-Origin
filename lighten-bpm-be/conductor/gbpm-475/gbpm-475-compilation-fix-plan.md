# Fix Compilation Errors (Attachment Feature Refactor)

## Objective
Address the 4 compilation errors raised during `make dev` introduced after the `gbpm-475` attachment feature refactor. 

## Key Context
The errors relate to:
1. Missing imports for decorators `ApiPropertyOptional` and `IsString`.
2. A stale re-export reference to `InstanceAttachment` (which was removed in the refactor in favor of the new unified `Attachment` model).

## Implementation Steps

### 1. Fix Missing Decorator Imports

**File: `src/attachment/dto/pending-upload-response.dto.ts`**
-   Update line 1 to include `ApiPropertyOptional` from `'@nestjs/swagger'`.

**File: `src/instance/dto/create-application-instance.dto.ts`**
-   Update line 3 to include `IsString` from `'class-validator'`.

### 2. Update Removed Prisma Model Reference

**File: `src/common/types/common.types.ts`**
-   Replace the `InstanceAttachment` export (line 49) with `Attachment` within the `@prisma/client` named exports list.

## Verification & Testing
1.  Run `make build` and `make dev` to confirm the code compiles without any TypeScript or runtime errors.
2.  All previously mentioned compilation errors must be resolved.