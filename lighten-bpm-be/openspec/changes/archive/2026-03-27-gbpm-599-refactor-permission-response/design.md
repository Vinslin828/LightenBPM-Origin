## Context

Currently, both `Form` and `Workflow` permission APIs return a flat array of permission objects. When a single entity (like "EVERYONE" or a specific "USER") has multiple permissions, they appear as multiple entries in the response array. This makes it difficult for frontend applications to manage and display permissions logically.

## Goals / Non-Goals

**Goals:**
- Provide a clear, grouped response format where actions are nested under a single grantee entry.
- Standardize the aggregation logic for both form and workflow permissions.
- Minimize duplication of logic by defining common transformation patterns.

**Non-Goals:**
- Changing the underlying database schema (Prisma models).
- Modifying how permissions are checked during runtime (this is purely a representation/API change).

## Decisions

### 1. Unified Aggregated DTO Pattern
- **Decision**: Introduce new "Aggregated" DTOs for Form permissions, Workflow permissions, and Instance shares.
- **Structure (Example for Form/Workflow)**:
  ```typescript
  export class AggregatedPermissionActionDto {
    id: number;
    action: PermissionAction;
  }

  export class AggregatedFormPermissionDto {
    grantee_type: GranteeType;
    grantee_value: string;
    form_id: number;
    actions: AggregatedPermissionActionDto[];
  }
  ```
- **Structure (Example for Instance Share)**:
  ```typescript
  export class AggregatedInstanceShareActionDto {
    id: number;
    permission: string; // e.g., "VIEW"
    reason?: string;
    created_by: number;
    created_at: Date;
  }

  export class AggregatedInstanceShareDto {
    user_id: number;
    workflow_instance_id: number;
    shares: AggregatedInstanceShareActionDto[];
  }
  ```
- **Rationale for Instance Share Aggregation**:
  - **Architectural Symmetry**: Ensures that all permission-like responses (Form, Workflow, Instance) follow the same "Grantee -> Actions/Shares" hierarchy, simplifying frontend implementation.
  - **Audit & Reason Grouping**: A single user may be shared an instance multiple times for different reasons or by different creators. Aggregation avoids "duplicate-looking" rows in the UI and clearly groups the context of the user's access.
  - **Data Integrity**: `InstanceShareDto` is currently missing the `permission` field defined in the Prisma schema; this refactoring provides a clean opportunity to expose this missing metadata.
  - **Future Proofing**: While currently only `VIEW` is used, the database schema supports `permission` as a string, allowing for future expansion (e.g., `EDIT` or `MANAGE` shares) without another breaking change.

### 2. Service-Layer Transformation
- **Decision**: Implement the aggregation logic in the Service layer (e.g., `FormService.getPermissions`, `WorkflowService.getPermissions`, and `ApplicationService.listInstanceShares`).
- **Implementation**:
  - Fetch raw flat records from the repository.
  - Group them using a `Map` or `reduce` operation keyed by the appropriate grantee identifier (e.g., `grantee_type + grantee_value` for general permissions, `user_id` for instance shares).
  - Map the grouped result to the new aggregated DTO structure.
- **Rationale**: The service layer is responsible for business representation logic. Keeping it out of the repository ensures the repository remains focused on raw data access.

### 3. Shared Utility for Aggregation (Optional)
- **Decision**: If the logic becomes repetitive, create a shared utility function in `src/common/utils/permission-utils.ts` to perform the grouping.
- **Rationale**: Prevents code duplication between `FormService` and `WorkflowService`.

## Risks / Trade-offs

- **[Risk] Breaking Changes** → [Mitigation] This is explicitly marked as a breaking change. Communication with frontend consumers is required.
- **[Risk] OpenAPI Sync** → [Mitigation] Ensure the `@ApiResponse` decorators in controllers are updated to point to the new aggregated DTOs.
- **[Risk] Sorting/Consistency** → [Mitigation] Ensure the order of aggregated entries (and actions within them) is consistent (e.g., sort by grantee then by action).
