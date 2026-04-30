# Instance Access Control

## Purpose
TBD: Control access to application instances based on user involvement or authority.

## Requirements

### Requirement: Application Instance Visibility
The system SHALL restrict the visibility of application instances based on the user's involvement in the workflow or organizational authority.

#### Scenario: Applicant views their own instance
- **WHEN** a user lists "My Applications"
- **THEN** all instances where they are the applicant SHALL be returned

#### Scenario: Approver views pending tasks
- **WHEN** a user lists "Waiting for Approval"
- **THEN** only instances where the user has an active `PENDING` approval task SHALL be returned

#### Scenario: Manager views subordinate instances
- **WHEN** a manager views applications from their department
- **THEN** instances submitted by users in their Org Unit (or sub-units) SHALL be visible

### Requirement: Hierarchical Instance Access
The system SHALL propagate access permissions from the parent `ApplicationInstance` to its child components (`FormInstance`, `WorkflowInstance`, `ApprovalTask`) based on the user's role.

#### Scenario: Applicant Access
- **WHEN** a user is the Applicant of an instance
- **THEN** they SHALL have `VIEW` access to the `ApplicationInstance`, `VIEW` access to the `FormInstance`, and `VIEW` access to the `WorkflowInstance` status/history.

#### Scenario: Approver Access
- **WHEN** a user is an assigned Approver
- **THEN** they SHALL have `VIEW` access to the `ApplicationInstance` and `FormInstance`, and `EDIT` access to their specific `ApprovalTask`.

### Requirement: Form Data Modification
The system SHALL restrict the modification of form data (`updateFormData`) to the Applicant, and only when the application is in a mutable state.

#### Scenario: Applicant updates Draft
- **WHEN** the Applicant updates a `DRAFT` instance
- **THEN** the system SHALL allow the update.

#### Scenario: Applicant updates Running instance (Restart)
- **WHEN** the Applicant updates a `RUNNING` instance
- **THEN** the system SHALL allow the update (triggering a workflow restart/re-evaluation if configured).

#### Scenario: Approver attempts update
- **WHEN** an Approver attempts to update the main form data
- **THEN** the system SHALL deny the request (Approvers should use `updateApproval` for decisions/comments).

### Requirement: Explicit Instance Sharing
The system SHALL allow instances to be explicitly shared with other users who are not part of the standard workflow or organizational hierarchy.

#### Scenario: Delegated viewing
- **WHEN** an instance is shared with User B using `InstanceShare`
- **THEN** User B SHALL be able to view the instance details

### Requirement: Batch Instance Sharing
The system SHALL support sharing an application instance with multiple users in a single API request.

### Requirement: Query-based Share Deletion
The system SHALL support deleting instance share records matching specific criteria (e.g., all shares for a specific user on an instance).
