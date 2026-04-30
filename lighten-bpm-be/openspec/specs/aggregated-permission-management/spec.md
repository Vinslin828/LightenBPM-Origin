# Aggregated Permission Management

## Purpose
TBD: Standardize and aggregate permission responses for better API usability and auditability.

## Requirements

### Requirement: Aggregated Permission Retrieval
The system SHALL aggregate permission actions under their respective grantees when returning permission lists for forms, workflows, and application instances.

#### Scenario: Retrieval of multiple permissions for a single grantee
- **WHEN** an authenticated user retrieves permissions for a resource (Form, Workflow, or Instance)
- **AND** a single grantee has multiple permissions or shares
- **THEN** the system SHALL return a single entry for that grantee
- **AND** that entry SHALL contain an `actions` or `shares` array listing all granted details

#### Scenario: Retrieval of permissions for multiple grantees
- **WHEN** an authenticated user retrieves permissions for a resource (Form, Workflow, or Instance)
- **AND** multiple grantees have permissions
- **THEN** the system SHALL return an array containing one entry per unique grantee

### Requirement: Standardized Aggregated Response Format
The aggregated response structure SHALL be consistent across Form, Workflow, and Instance share modules.

#### Scenario: Comparison of Permission and Share response structure
- **WHEN** comparing the response of GET `/forms/{id}/permissions` and GET `/instance/{sn}/shares`
- **THEN** both SHALL use a grouped structure where actions/shares are nested under the grantee (user/entity)
- **AND** both SHALL include the resource identifier (e.g., `form_id` or `workflow_instance_id`) at the grantee level

### Requirement: Exposure of Hidden Permission Metadata
The `InstanceShare` records returned in the API response SHALL include the `permission` field as stored in the database.

#### Scenario: Viewing share permission type
- **WHEN** an aggregated instance share response is retrieved
- **THEN** each object in the `shares` array SHALL include the `permission` string (e.g., "VIEW")

### Requirement: Audit Data Preserved in Aggregation
The unique ID and creator details of each individual permission or share entry SHALL be preserved within the aggregated actions list to support auditing.
