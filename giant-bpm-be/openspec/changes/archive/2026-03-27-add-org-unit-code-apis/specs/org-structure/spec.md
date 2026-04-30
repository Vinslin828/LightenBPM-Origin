## ADDED Requirements

### Requirement: Manage Org Unit by Code
The system SHALL provide API endpoints to retrieve, update, and delete Organization Units using their unique `code` identifier.

#### Scenario: Retrieve by Code
- **WHEN** a client requests `GET /org-units/code/SALES`
- **THEN** the system returns the Org Unit details for "SALES".

#### Scenario: Update by Code
- **WHEN** a client requests `PATCH /org-units/code/SALES` with new data
- **THEN** the system updates the Org Unit identified by "SALES".

### Requirement: Query Members by Org Code
The system SHALL provide API endpoints to list heads and members of an Organization Unit using its `code`.

#### Scenario: Get Heads by Code
- **WHEN** a client requests `GET /org-units/code/SALES/heads`
- **THEN** the system returns the list of heads for the "SALES" unit.
