## ADDED Requirements

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
