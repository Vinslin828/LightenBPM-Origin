## Context

The BPM system currently lacks a centralized and fine-grained permission model. Authorization logic is scattered and mostly limited to basic authentication checks. This design establishes a unified "Hybrid Access Control Model" (RBAC + ABAC) implemented natively within the application's data access layer (Prisma).

## Goals / Non-Goals

**Goals:**
- Implement a centralized `PermissionBuilder` service for all modules.
- Ensure database-level filtering for performance and pagination consistency.
- Support hierarchical permissions based on Organizational Units.
- Provide a clear schema for granting form-level and instance-level access.

**Non-Goals:**
- Integration with external policy engines like Casbin or OPA (intentionally avoided for performance and simplicity).
- Real-time permission updates for active user sessions (will rely on token refresh or per-request database checks).
- Complex attribute-based logic beyond User ID, Org Unit, and Job Grade for this iteration.

## Decisions

### 1. Native Prisma Filtering over Casbin
- **Decision**: Implement permission logic directly in TypeScript/Prisma instead of using Casbin.
- **Rationale**: Casbin's "fetch-then-filter" approach is inefficient for large datasets and breaks server-side pagination. By building Prisma `where` clauses, the database handles filtering efficiently.
- **Alternatives**: Casbin (rejected for performance), custom middleware (rejected for lack of type safety and complexity in query injection).

### 2. Database Schema for Permissions
- **Decision**: Introduce `FormPermission`, `WorkflowPermission`, and `InstanceShare` models.
- **Rationale**: Separate tables for permissions provide clear referential integrity and allow for easier indexing and querying compared to JSON blobs.
- **Default Behavior**: **Closed by Default**. If no permission record exists for a resource, access is DENIED (unless the user is an Admin or the Creator). Public resources must have an explicit `EVERYONE` permission record.
- **Grantee Types**: `USER`, `ORG_UNIT`, `JOB_GRADE`, `ROLE`, `EVERYONE`.

### 3. Flat Org Unit Permissions
- **Decision**: Permissions granted to an Org Unit apply **strictly** to that unit only. There is no automatic inheritance to child units.
- **Rationale**: 
    - **Simplicity**: Database queries use simple equality checks (`user.orgId == permission.orgId`) rather than complex path matching.
    - **Explicit Control**: Allows precise inclusions/exclusions (e.g., granting to Parent and Child A, but not Child B) without complex "deny" rules.
    - **Frontend flexibility**: The UI can handle "Select All Children" logic by sending a list of all relevant Org Unit IDs.

### 4. Permission Actions & Resource Hierarchy
- **Decision**: Define `VIEW`, `USE`, and `MANAGE` actions.
    - **Form Definitions**: `MANAGE` (Edit/Publish), `VIEW` (See in list).
    - **Workflow Definitions**: `MANAGE` (Edit flow logic), `USE` (Start new instance), `VIEW` (See flow diagram/history).
    - **Application (Workflow Context)**: `USE` (Start/Apply), `VIEW` (See in list).
- **Instance Hierarchy**: Access to an `ApplicationInstance` implies cascading access to its components:
    - **Applicant**: `VIEW` AppInstance -> `VIEW` FormInstance (Read-only after submit) -> `VIEW` Workflow Status.
    - **Approver**: `VIEW` AppInstance -> `VIEW` FormInstance -> `EDIT` ApprovalTask (Decision).

### 5. Form-Workflow Binding Permissions
- **Decision**: The "Apply" (Start Instance) permission is controlled exclusively by the **Workflow's `USE` action**.
- **Rationale**: 
    - **Business Governance**: Access to start a process is typically governed by the process definition (workflow) and who is allowed to participate in that business flow, rather than just who can see the data structure (form).
    - **Binding as Contract**: The act of binding a form to a workflow by an administrator constitutes an implicit authorization for that form to be used within the context of the authorized workflow.

### 6. API Design for Batch Operations
- **Decision**: Use a single endpoint for both single and batch additions by accepting an array in the request body.
- **Rationale**:
    - **Simplicity**: Reduces the number of endpoints to manage.
    - **Consistency**: Batch operations return an array of created records, matching the behavior of single additions (which are just a batch of one).
- **Decision**: Implement query-based deletion criteria (e.g., `DELETE .../permissions?grantee_value=10`).
- **Rationale**: Allows administrators to revoke all permissions for a specific entity (user, org unit) in one call.

## Risks / Trade-offs

- **[Risk] New Department "Data Drift"**:
    - **Problem**: Since permissions are flat, creating a new sub-department under an authorized parent does *not* automatically grant access to the new unit.
    - **Mitigation**: Administrators must explicitly update permissions when adding new organizational units. Future feature: "Smart Groups" or background sync jobs.
- **[Risk] Complex SQL queries** → **Mitigation**: Use Prisma's fluent API and ensure proper indexing on `grantee_type` and `grantee_value` columns.
- **[Risk] Permission logic fragmentation** → **Mitigation**: Strictly enforce that all modules use the `PermissionBuilder` service rather than implementing their own checks.
- **[Risk] Performance hit on large permission tables** → **Mitigation**: Use composite indexes and potentially denormalize "Public" forms to avoid permission table joins where possible.

## Migration Plan

1.  **Phase 1**: Update `schema.prisma` and run `make migrate-dev`.
2.  **Phase 2**: Implement `PermissionBuilderService` in `src/common/permission`.
3.  **Phase 3**: Refactor `FormService` to use the permission builder for listing and action checks.
4.  **Phase 4**: Refactor `InstanceService` for visibility filtering.
5.  **Phase 5**: Update UI/Frontend (out of scope for this backend change but noted).
