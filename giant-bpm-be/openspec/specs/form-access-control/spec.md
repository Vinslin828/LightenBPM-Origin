# Form Access Control

## Purpose
TBD: Restrict the visibility and management of forms based on defined permissions.

## Requirements

### Requirement: Form Visibility Control
The system SHALL restrict the visibility of forms in listing and search APIs based on defined `FormPermission` records.

#### Scenario: User sees authorized forms
- **WHEN** a user lists available forms
- **THEN** only forms they created, forms granted to them individually, forms granted to their Org Unit, or public forms SHALL be returned

### Requirement: Default Deny Policy
The system SHALL deny access to any form that does not have an explicit permission record granting access to the user (or 'EVERYONE').

#### Scenario: User attempts to access restricted form
- **WHEN** a user attempts to access a form with no matching `FormPermission` record
- **THEN** the system SHALL return a "Forbidden" or "Not Found" error, unless the user is a Global Admin or the form Creator.

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

### Requirement: Batch Permission Management
The system SHALL support adding multiple form permission records in a single API request.

### Requirement: Query-based Permission Deletion
The system SHALL support deleting form permission records matching specific criteria (grantee_type, grantee_value, action).
