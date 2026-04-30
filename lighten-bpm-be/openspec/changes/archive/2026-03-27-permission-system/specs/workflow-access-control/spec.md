## ADDED Requirements

### Requirement: Workflow Visibility Control
The system SHALL restrict the visibility of workflow definitions in listing and search APIs based on defined `WorkflowPermission` records.

#### Scenario: User sees authorized workflows
- **WHEN** a user lists available workflows
- **THEN** only workflows they created, workflows granted to them individually, or workflows granted to their Org Unit SHALL be returned

### Requirement: Default Deny Policy
The system SHALL deny access to any workflow that does not have an explicit permission record granting access to the user.

#### Scenario: User attempts to access restricted workflow
- **WHEN** a user attempts to access a workflow with no matching `WorkflowPermission` record
- **THEN** the system SHALL return a "Forbidden" or "Not Found" error, unless the user is a Global Admin or the workflow Creator.

### Requirement: Workflow Usage Control (Apply)
The system SHALL ensure that only authorized users can initiate a new application instance for a specific workflow.

#### Scenario: Unauthorized workflow usage
- **WHEN** a user attempts to submit an application using a workflow they do not have `USE` permission for
- **THEN** the system SHALL reject the request with a "Forbidden" error

### Requirement: Workflow Management Control
The system SHALL restrict the ability to edit, delete, or publish workflow definitions to users with `MANAGE` permission.

#### Scenario: Non-authorized user edits workflow
- **WHEN** a user without `MANAGE` permission attempts to update a workflow definition
- **THEN** the system SHALL reject the request with a "Forbidden" error

### Requirement: Batch Permission Management
The system SHALL support adding multiple workflow permission records in a single API request.

### Requirement: Query-based Permission Deletion
The system SHALL support deleting workflow permission records matching specific criteria (grantee_type, grantee_value, action).
