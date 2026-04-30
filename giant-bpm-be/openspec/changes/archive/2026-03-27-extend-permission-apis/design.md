## Context

Currently, the BPM system provides individual adding/deleting endpoints for resource permissions and instance shares. Administrators need a way to completely reset or overwrite these rules in a single operation. The system also restricts these management operations to global admins, which is too restrictive for decentralized management.

## Goals / Non-Goals

**Goals:**
- Implement `clear` and `set` operations for permissions/shares on Form, Workflow, and ApplicationInstance resources.
- Support transactional "set" (overwrite) operations to ensure atomicity.
- Refine authorization to allow users with `MANAGE` permission to manage access rules.
- Maintain consistency across Form, Workflow, and Instance Share modules.

**Non-Goals:**
- Redesigning the core permission logic or database schema.
- Implementing permissions for other resources not requested.
- Real-time permission invalidation (will rely on existing mechanisms).

## Decisions

### 1. RESTful Path Design
- **Decision**: Use `DELETE /.../permissions` without query for `clear` and `PUT /.../permissions` for `set`.
- **Rationale**: 
    - `DELETE` on a collection resource without filters naturally implies clearing the collection.
    - `PUT` on a collection resource typically represents replacing the entire collection with the provided payload.
    - This follows standard RESTful conventions preferred by the user.

### 2. Transactional Overwrite (Set)
- **Decision**: Implement `set` operations as a `deleteMany` followed by a `createMany` (or multiple `create` calls) within a single database transaction.
- **Rationale**: 
    - Ensures the resource is never left without permissions if the creation fails.
    - Provides atomicity and consistency.
    - Simple to implement using `TransactionService.runTransaction`.

### 3. Refined Authorization
- **Decision**: Update controller checks to allow both Global Admins and users with `MANAGE` permission on the specific resource.
- **Rationale**: 
    - Align with the "Hybrid Access Control Model" established in the previous permission system design.
    - Allows for decentralized administration where resource owners can manage who else can see or use their resources.
- **Exception**: For `ApplicationInstance` shares, continue to allow both Global Admins and the Applicant (the owner/creator of the instance).

### 4. Consolidated Query DTOs
- **Decision**: Use a shared `DeletePermissionsQueryDto` for all resource permission deletions.
- **Rationale**: 
    - Reduces duplication.
    - Ensures consistent query parameters across different modules.

## Risks / Trade-offs

- **[Risk] Accidental Clear**: Calling `DELETE /.../permissions` without a query could accidentally clear all permissions if the client makes a mistake.
    - **Mitigation**: Clear documentation and potential implementation of a specific flag (e.g., `?clear_all=true`) if needed. However, the RESTful convention is to follow the user's preference for now.
- **[Risk] Performance for large batches**: Very large "set" operations could be slow or hit database limits.
    - **Mitigation**: Typically permission sets are small (tens or hundreds of records). If they exceed thousands, a background job or chunked processing would be needed, but for now, the batch size will be limited by standard request size limits.

## Migration Plan

1.  **Repository Layer**: Update repositories to add transactional `set` methods.
2.  **Service Layer**: Add `set` methods and update authorization logic.
3.  **Controller Layer**: Add `PUT` endpoints and update existing authorization checks.
4.  **Verification**: Automated tests to confirm both `clear` and `set` work as expected and respect authorization rules.
