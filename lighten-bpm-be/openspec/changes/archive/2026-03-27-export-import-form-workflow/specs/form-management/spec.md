## ADDED Requirements

### Requirement: Export Form
The system SHALL provide an endpoint to export a Form and its latest revision into a portable JSON format.

#### Scenario: Successful Export
- **WHEN** an authorized user requests to export a valid Form
- **THEN** the system returns a JSON payload containing the Form's public_id, basic info, tags, and its latest revision details (schema, options)
- **AND** the payload includes a list of declared dependencies (e.g., Validation Registry items used in the schema)

### Requirement: Import Form Check
The system SHALL provide an endpoint to validate a Form Export JSON before execution, reporting any missing dependencies or conflicts.

#### Scenario: Check with Missing Dependencies
- **WHEN** a user submits a Form Export JSON containing a Validation rule that does not exist in the target environment
- **THEN** the system returns a Check Result with `can_proceed: false` (or warning depending on policy)
- **AND** the missing validation item is listed in `dependencies_check` with status `MISSING`

### Requirement: Import Form Execute
The system SHALL provide an endpoint to execute the import of a Form, performing an upsert operation based on `public_id`.

#### Scenario: Update Existing Form
- **WHEN** a user executes an import for a Form `public_id` that already exists
- **THEN** the system updates the existing Form's metadata and adds/updates the Revision
- **AND** internal IDs are preserved, but `public_id` matches the import source
