## ADDED Requirements

### Requirement: Execute Script via API
The system SHALL provide an API endpoint to execute user-defined JavaScript logic for external API fetches.

#### Scenario: Successful execution
- **WHEN** a client sends a `POST` request to `/bpm/execution/fetch`
- **AND** the payload contains a valid JavaScript `function` body
- **THEN** the system SHALL execute the logic in a secure sandbox
- **AND** return the direct JSON-serialized result of the logic's `return` statement.

#### Scenario: Execution timeout
- **WHEN** the execution exceeds the configured execution timeout (e.g., 5 seconds)
- **THEN** the system SHALL terminate the execution
- **AND** return a `408 Request Timeout` response.

#### Scenario: Script runtime error
- **WHEN** the script throws a runtime error or contains syntax errors
- **THEN** the system SHALL return a `400 Bad Request` response with error details.

### Requirement: Restricted Execution Environment
The system SHALL provide a restricted environment for snippet execution to ensure security and prevent unauthorized access.

#### Scenario: Restricted access to global objects
- **WHEN** a snippet attempts to access restricted global objects (e.g., `process`, `require`, `fs`)
- **THEN** the system SHALL block the access
- **AND** return an error response.

#### Scenario: Provided fetch utility
- **WHEN** a snippet uses the provided `fetch` utility
- **THEN** the system SHALL allow the fetch call to execute
- **AND** enforce specific security constraints (e.g., restricted headers).
