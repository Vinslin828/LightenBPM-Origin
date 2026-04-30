## Purpose
TBD: Provide a unified and robust bulk import mechanism for core system resources.

## Requirements

### Requirement: Bulk Import of Users, OrgUnits, and OrgMemberships
The system SHALL provide a single API endpoint to bulk import multiple Users, Organization Units, and OrgMemberships in a single request.

#### Scenario: Successful import of all resources
- **WHEN** an admin provides valid arrays of Users, OrgUnits, and OrgMemberships
- **THEN** the system SHALL create all resources and return a success message

### Requirement: Atomic Rollback on Failure
The system MUST process all resources in a single import request within a database transaction. If any single row fails (including validation failures like date overlaps), the entire import SHALL be rolled back.

#### Scenario: Single row failure causes rollback
- **WHEN** the 5th user in a list of 10 users has an invalid organization code
- **THEN** the system SHALL rollback all previous 4 users and return a detailed error message

#### Scenario: Overlap failure causes rollback
- **WHEN** the 3rd membership in a list of 10 has a date overlap with an existing record
- **THEN** the system SHALL rollback all previous changes in the transaction and return a detailed error message indicating the overlap at index 3.

### Requirement: Detailed Error Reporting with Row Context
The system SHALL return error messages that explicitly indicate the type of resource and the index of the row that caused the failure.

#### Scenario: Error reporting for invalid user data
- **WHEN** an import fails at the 23rd User record
- **THEN** the system SHALL return an error message containing "Failed at User index 23" or similar context

### Requirement: Code-Based Relationship Resolution
The system SHALL allow resolving relationships (e.g., parent organization, default organization, membership user) using logical `code` identifiers instead of internal database `id`s.

#### Scenario: Resolving OrgUnit parent by code
- **WHEN** an OrgUnit is imported with a `parentCode`
- **THEN** the system SHALL look up the internal ID of the parent using that code and establish the hierarchy correctly

### Requirement: Upsert Support for Existing Data
The system SHALL support updating existing records during bulk import if a record with the same logical `code` (for Users and OrgUnits) or same composite key (for OrgMemberships) already exists.

#### Scenario: Updating an existing user name
- **WHEN** a User import contains a `code` that already exists in the system but with a different `name`
- **THEN** the system SHALL update the existing user record with the new name instead of returning an error

### Requirement: OrgMembership Overlapping Date Validation
The system SHALL ensure that `OrgMembership` records within a bulk import payload, and against existing database records, do not have overlapping date ranges for the same user and organization unit, regardless of their `assignType`.

#### Scenario: Overlapping date range in payload (Different assignType)
- **WHEN** a bulk import payload contains two `OrgMembership` records for the same user and org unit (e.g., one as `USER`, one as `HEAD`)
- **AND** the date ranges overlap (`start_date < existing_end_date` AND `end_date > existing_start_date`)
- **THEN** the system SHALL reject the entire import and return a `BadRequestException`.

#### Scenario: Overlap with existing database record
- **WHEN** a bulk import payload contains an `OrgMembership` record that overlaps with an existing record in the database for the same user and org unit
- **THEN** the system SHALL reject the entire import and return a `BadRequestException`.
