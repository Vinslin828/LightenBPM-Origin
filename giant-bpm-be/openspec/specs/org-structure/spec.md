# org-structure Specification

## Purpose
TBD - created by archiving change add-org-unit-code-apis. Update Purpose after archive.
## Requirements
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

### Requirement: Org Unit Identification by Code
The system SHALL identify Organization Units primarily by their unique `code` in all external APIs and inter-entity relationships.

#### Scenario: User Assignment
- **WHEN** assigning a user to an organization
- **THEN** the request MUST provide the `org_unit_code` (String)
- **AND** the system MUST validate the code exists.

#### Scenario: Organization Hierarchy
- **WHEN** creating a child organization unit
- **THEN** the parent MUST be specified by `parent_code` (String).

#### Scenario: User Default Organization
- **WHEN** creating or updating a user
- **THEN** the `default_org` MUST be referenced by its `code`.

