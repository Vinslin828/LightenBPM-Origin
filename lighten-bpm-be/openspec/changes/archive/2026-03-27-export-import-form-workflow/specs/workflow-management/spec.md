## ADDED Requirements

### Requirement: Export Workflow
The system SHALL provide an endpoint to export a Workflow and its latest revision into a portable JSON format.

#### Scenario: Successful Export
- **WHEN** an authorized user requests to export a valid Workflow
- **THEN** the system returns a JSON payload containing the Workflow's public_id, tags, and its latest revision (flow definition)
- **AND** the payload includes the bound Form's public_id
- **AND** the payload includes declared dependencies (OrgUnits by code, Users by code/email)

### Requirement: Import Workflow Check
The system SHALL provide an endpoint to validate a Workflow Export JSON before execution.

#### Scenario: Check with Missing Form
- **WHEN** a user submits a Workflow Export JSON that is bound to a Form `public_id` not present in the target environment
- **THEN** the system returns a Check Result with `can_proceed: false`
- **AND** the `related_form` dependency is marked as `MISSING` and `BLOCKING`

### Requirement: Import Workflow Execute
The system SHALL provide an endpoint to execute the import of a Workflow, upserting based on `public_id` and resolving dependencies.

#### Scenario: Insert New Workflow
- **WHEN** a user executes an import for a Workflow `public_id` that does not exist locally
- **THEN** the system creates a new Workflow and Workflow Revision
- **AND** it correctly resolves OrgUnit codes and User codes to local internal IDs
