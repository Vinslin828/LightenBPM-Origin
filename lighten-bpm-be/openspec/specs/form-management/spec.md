# Form Management

## Purpose
TBD: Manage form definitions, revisions, and their lifecycle.

## Requirements

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

## Frontend Validation (validation)

This section defines the structure of the `validation` field in Form API DTOs. This field is mapped to the `fe_validation` column in the `FormRevision` database table. It is intended for the Frontend to store and retrieve complex validation logic that is not processed by the Backend.

### Data Mapping
| Layer | Property Name |
| :--- | :--- |
| **API (Request/Response)** | `validation` |
| **Database (PostgreSQL)** | `fe_validation` |

### Data Structure

The `fe_validation` column stores a JSON object with the following structure:

#### FEValidation Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `validation` | `Object` | The root container for validation logic. |

#### Validation Container
| Field | Type | Description |
| :--- | :--- | :--- |
| `required` | `Boolean` | A global flag indicating if the form or a specific context requires validation. |
| `validators` | `Array<ValidatorItem>` | A list of custom script-based validators. |

#### ValidatorItem
| Field | Type | Description |
| :--- | :--- | :--- |
| `key` | `String` | A unique identifier for the validator (e.g., `validator_1770290851936`). |
| `listenFieldIds` | `Array<String>` | List of Form Field IDs that should trigger this validation when changed. |
| `code` | `String` | The JavaScript code containing the validation logic (e.g., `function validation() { ... }`). |
| `description` | `String` | (Optional) Documentation for what this validator does. |
| `errorMessage` | `String` | The message to display to the user if the validation returns `false`. |

### Usage Guidelines
1. **Dumb Persistence**: The Backend must accept any valid JSON matching this structure without attempting to parse or execute the `code` strings.
2. **Sanitization**: The Frontend is responsible for sanitizing and safely executing the `code` snippets (e.g., via a sandbox).
3. **Synchronization**: Field IDs in `listenFieldIds` should correspond to keys in the `form_schema`. The Backend does not enforce this referential integrity.
