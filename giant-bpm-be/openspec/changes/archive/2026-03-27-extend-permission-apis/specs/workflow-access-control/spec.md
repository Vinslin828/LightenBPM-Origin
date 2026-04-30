## MODIFIED Requirements

### Requirement: Workflow Management Control
The system SHALL restrict the ability to edit, delete, or publish workflow definitions, or manage their access rules, to users with `MANAGE` permission or Global Admins.

#### Scenario: Non-authorized user edits workflow
- **WHEN** a user without `MANAGE` permission attempts to update a workflow definition
- **THEN** the system SHALL reject the request with a "Forbidden" error

#### Scenario: User with MANAGE permission manages access rules
- **WHEN** a user with `MANAGE` permission on a workflow attempts to add, delete, clear, or set workflow permissions
- **THEN** the system SHALL allow the operation

#### Scenario: User without MANAGE permission manages access rules
- **WHEN** a user without `MANAGE` permission on a workflow attempts to modify its access rules
- **THEN** the system SHALL reject the request with a "Forbidden" error
