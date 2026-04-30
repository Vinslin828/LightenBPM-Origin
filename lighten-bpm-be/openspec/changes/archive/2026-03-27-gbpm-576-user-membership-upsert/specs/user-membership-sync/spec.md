## ADDED Requirements

### Requirement: Dynamic Default Organization Resolution
The system SHALL dynamically determine a user's default organization based on their active memberships and explicitly configured preference.

#### Scenario: User has exactly 1 active membership
- **WHEN** the system resolves a user's default organization
- **AND** the user has exactly 1 active `OrgMembership` (where `end_date` > current date)
- **THEN** that organization SHALL be resolved as the default.

#### Scenario: User has multiple active memberships with a configured preference
- **WHEN** the system resolves a user's default organization
- **AND** the user has multiple active `OrgMembership` records
- **AND** there is a corresponding record in the `UserDefaultOrg` preference table for this user
- **THEN** the organization unit in `UserDefaultOrg` SHALL be resolved as the default.

#### Scenario: User has no active memberships (Fallback)
- **WHEN** the system resolves a user's default organization
- **AND** the user has zero active `OrgMembership` records
- **THEN** the system SHALL return the system-reserved `UNASSIGNED` organization (resolved by `ORG_CODE_UNASSIGNED`).

#### Scenario: User has multiple active memberships but NO preference set
- **WHEN** the system resolves a user's default organization
- **AND** the user has multiple active `OrgMembership` records
- **AND** there is NO record in the `UserDefaultOrg` preference table
- **THEN** the system SHALL return the active membership with the earliest `start_date` as the fallback default.

### Requirement: Indefinite Membership Assignment
The system SHALL consistently represent indefinite organizational memberships using a standard far-future date constraint.

#### Scenario: Creating an indefinite membership
- **WHEN** a membership is created or updated without an explicit end date
- **THEN** the system SHALL assign the standard far-future system constant (`2999-12-31`) as the `end_date`.

### Requirement: Bulk Import Preference Synchronization
The system SHALL ensure that bulk user imports accurately synchronize external default organization preferences with the internal dynamic resolution structure.

#### Scenario: Importing a user with a default organization preference
- **WHEN** a user is processed during a bulk import payload
- **AND** the `UserImportDto` specifies a valid `defaultOrgCode`
- **AND** the user has multiple resulting active memberships
- **THEN** the system SHALL upsert the `UserDefaultOrg` table to record this preference.

### Requirement: UserDefaultOrg API Management
The system SHALL provide endpoints for clients to manage a user's default organization preference.

#### Scenario: Updating default organization preference
- **WHEN** a client submits a valid request to update the user's default organization
- **THEN** the system SHALL ensure the targeted organization is one of the user's active memberships
- **AND** the system SHALL upsert the corresponding `UserDefaultOrg` record.

### Requirement: DTO Compatibility
The system SHALL preserve the existing structure of `UserDto` for API consumers.

#### Scenario: Serializing user payload
- **WHEN** user data is serialized for the API response
- **THEN** it SHALL include `defaultOrgId` and `defaultOrgCode` properties
- **AND** these properties SHALL be populated by the dynamic resolution logic.