# user-management Specification

## Purpose
TBD - created by archiving change refactor-user-id-to-external-id. Update Purpose after archive.
## Requirements
### Requirement: User Code
The system SHALL support storing a unique string-based **User Code** (e.g., Employee ID) for each user, alongside the internal integer ID.

#### Scenario: User Creation
- **WHEN** creating a new user
- **THEN** a `code` MUST be provided or generated.
- **AND** it MUST be unique across the system.

#### Scenario: User Lookup
- **WHEN** searching for a user internally
- **THEN** the system SHALL be able to resolve a user by their `code`.

