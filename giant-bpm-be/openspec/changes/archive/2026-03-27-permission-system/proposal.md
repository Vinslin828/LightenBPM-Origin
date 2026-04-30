## Why

Currently, the BPM system lacks a fine-grained permission model. All authenticated users can potentially see and interact with all forms and instances unless hardcoded logic prevents it. To support enterprise-scale deployments, we need a robust system to control visibility and actions based on user identity, organizational hierarchy, and job levels. This ensures data privacy and operational security.

## What Changes

- **Hybrid RBAC/ABAC Model**: Implementation of a flexible access control system combining role-based and attribute-based rules.
- **Form Permissions**: New APIs and database schemas to define who can view, submit, or manage specific forms based on User ID, Org Unit, or Job Grade.
- **Instance Visibility**: Dynamic filtering of application instances (listing/searching) based on the user's role in the workflow (applicant, approver, CC'd) or organizational authority (manager).
- **Permission Builder Service**: A centralized service to generate Prisma `where` clauses for data-level filtering and to perform action-level authorization checks.
- **Database Schema Updates**: Introduction of `form_permissions` and `instance_shares` tables to store explicit access rules.
- **Batch Operation Support**: Permission and sharing APIs support array-based creation and query-based bulk deletion for improved administrative efficiency.

## Capabilities

### New Capabilities
- `form-access-control`: Define and enforce visibility and usage rules for form templates.
- `instance-access-control`: Dynamic visibility logic for application instances based on workflow participation and organizational hierarchy.
- `permission-core`: Centralized logic for building permission filters and performing individual action checks.

### Modified Capabilities
<!-- No existing spec files found in openspec/specs/ -->

## Impact

- **Database**: New tables in PostgreSQL via Prisma migrations.
- **Prisma Schema**: Update `schema.prisma` with new models and relations.
- **API**: Modification of `FormController` and `InstanceController` (or equivalent) to integrate permission filtering.
- **Common**: New guards and services in `src/common/permission`.
