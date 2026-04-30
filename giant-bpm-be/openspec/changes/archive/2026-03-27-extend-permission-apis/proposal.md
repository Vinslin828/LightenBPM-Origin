## Why

The current permission management APIs (Form, Workflow, and Instance Shares) are limited to individual additions or deletions. Administrators need more efficient ways to completely reset (clear) or overwrite (set) permission rules for a specific resource without making multiple API calls. Additionally, the system currently restricts permission management to global admins, but it should also allow users with `MANAGE` permission on a specific resource to manage its access rules.

## What Changes

- **Clear API**: Support clearing all permission/share records for a specific Form, Workflow, or ApplicationInstance. This will be implemented by ensuring `DELETE /.../permissions` (without query parameters) correctly handles the "clear all" scenario.
- **Set API**: Support batch setting (overwriting) permission/share records for a specific Form, Workflow, or ApplicationInstance. This will be implemented via a new `PUT /.../permissions` endpoint.
- **Refined Authorization**: Update permission management APIs to allow both Global Admins and users with `MANAGE` permission on the resource to perform these operations.
- **Improved Documentation**: Update DTOs and OpenAPI documentation to clearly explain the behavior of these new and updated endpoints.

## Capabilities

### New Capabilities
- `permission-batch-management`: Explicit batch operations for clearing and overwriting resource-level permissions and instance shares.

### Modified Capabilities
- `form-access-control`: Update requirements to allow `MANAGE` permission holders to manage form permissions.
- `workflow-access-control`: Update requirements to allow `MANAGE` permission holders to manage workflow permissions.
- `permission-core`: Update core logic to support batch "set" operations.

## Impact

- **API**: New `PUT` endpoints in `FormController`, `WorkflowController`, and `ApplicationController`. Updated `DELETE` behavior documentation.
- **Services**: New `set...Permissions/Shares` methods in `FormService`, `WorkflowService`, and `ApplicationService`. Updated authorization checks.
- **Repositories**: New `set...` methods in `FormRepository`, `WorkflowRepository`, and `InstanceShareRepository` with transactional support.
- **DTOs**: Updated `DeletePermissionsQueryDto` and potentially new DTOs for batch set operations.
