## Why

Currently, the permission-related APIs return a flat list of permission rules. This means if a single grantee (e.g., "EVERYONE" or a specific "USER") has multiple permissions (e.g., "VIEW" and "USE"), they are returned as multiple separate entries in the response. This format is inefficient for frontend consumption and makes it harder to visualize the aggregate permissions granted to a specific entity. Refactoring to an aggregated response format will improve API clarity and frontend efficiency.

## What Changes

- **Aggregated Permission Response**: Modify the response structure of permission retrieval APIs to group permission actions by their unique grantee (grantee_type + grantee_value).
- **Consolidated Action List**: Instead of a single `action` property, each grantee entry will contain an `actions` array of objects, where each object includes the permission rule `id` and the `action` type.
- **DTO Refactoring**: Update existing `FormPermissionDto`, `WorkflowPermissionDto`, `InstanceShareDto`, and related response DTOs to reflect the new nested structure.
- **Instance Share Enhancement**: Include the missing `permission` field in `InstanceShareDto` and align its response format with the aggregated permission pattern.
- **Breaking Change**: **BREAKING** - This change modifies the public API response structure for all permission listing and instance sharing endpoints (e.g., GET /forms/:id/permissions, GET /workflow/:id/permissions, GET /instance/:sn/shares).

## Capabilities

### New Capabilities
- `aggregated-permission-management`: Provides a more intuitive, grouped view of permissions and shares where actions/reasons are aggregated under their respective grantees for improved system readability and frontend integration.

### Modified Capabilities
<!-- No existing capabilities found in openspec/specs/ during previous investigation. -->

## Impact

- **API Layer**: All endpoints returning lists of form/workflow permissions or instance shares will have changed response schemas.
- **Frontend/Clients**: All clients consuming these APIs must be updated to handle the new aggregated format.
- **Documentation**: OpenAPI specifications must be updated to reflect the new nested DTO structures.
- **Affected Files**: `src/form/dto/form-permission.dto.ts`, `src/workflow/dto/workflow-permission.dto.ts`, `src/instance/dto/instance-share.dto.ts`, `src/form/form.service.ts`, `src/workflow/workflow.service.ts`, `src/instance/application.service.ts`, and their respective controllers.
