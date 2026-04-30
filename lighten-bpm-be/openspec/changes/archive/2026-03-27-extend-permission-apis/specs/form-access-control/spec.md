## MODIFIED Requirements

### Requirement: Form Management Control
The system SHALL restrict the ability to edit, delete, or manage access rules for form definitions to users with `MANAGE` permission or Global Admins.

#### Scenario: Non-admin edits form
- **WHEN** a user without `MANAGE` permission attempts to update a form definition
- **THEN** the system SHALL reject the request with a "Forbidden" error

#### Scenario: User with MANAGE permission manages access rules
- **WHEN** a user with `MANAGE` permission on a form attempts to add, delete, clear, or set form permissions
- **THEN** the system SHALL allow the operation

#### Scenario: User without MANAGE permission manages access rules
- **WHEN** a user without `MANAGE` permission on a form attempts to modify its access rules
- **THEN** the system SHALL reject the request with a "Forbidden" error
