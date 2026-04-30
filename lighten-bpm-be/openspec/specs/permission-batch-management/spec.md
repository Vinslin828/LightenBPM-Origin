# Permission Batch Management

## Purpose
TBD: Handle batch operations for permissions and shares across various resources.

## Requirements

### Requirement: Resource Permission Clearing
The system SHALL allow users with `MANAGE` permission (or Global Admins) to clear all permission rules for a specific Form, Workflow, or ApplicationInstance.

#### Scenario: Admin clears form permissions
- **WHEN** a Global Admin sends a `DELETE` request to `/form/:form_id/permissions` without query parameters
- **THEN** all permission records for that form SHALL be removed

#### Scenario: Manager clears workflow permissions
- **WHEN** a user with `MANAGE` permission on a workflow sends a `DELETE` request to `/workflow/:workflow_id/permissions` without query parameters
- **THEN** all permission records for that workflow SHALL be removed

### Requirement: Resource Permission Batch Set
The system SHALL allow users with `MANAGE` permission (or Global Admins) to batch set (overwrite) all permission rules for a specific Form, Workflow, or ApplicationInstance.

#### Scenario: Admin overwrites form permissions
- **WHEN** a Global Admin sends a `PUT` request to `/form/:form_id/permissions` with an array of new permission rules
- **THEN** all existing permission records for that form SHALL be replaced by the new set in a single transaction

#### Scenario: Manager overwrites workflow permissions
- **WHEN** a user with `MANAGE` permission on a workflow sends a `PUT` request to `/workflow/:workflow_id/permissions` with an array of new permission rules
- **THEN** all existing permission records for that workflow SHALL be replaced by the new set in a single transaction

#### Scenario: Applicant overwrites instance shares
- **WHEN** the Applicant of an instance sends a `PUT` request to `/application/:serial_number/shares` with an array of new user IDs and reasons
- **THEN** all existing share records for that instance SHALL be replaced by the new set in a single transaction
