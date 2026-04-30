## ADDED Requirements

### Requirement: OrgMembership Overlapping Date Validation
The system SHALL ensure that `OrgMembership` records within a bulk import payload, and against existing database records, do not have overlapping date ranges for the same user and organization unit, regardless of their `assignType`.

#### Scenario: Overlapping date range in payload (Different assignType)
- **WHEN** a bulk import payload contains two `OrgMembership` records for the same user and org unit (e.g., one as `USER`, one as `HEAD`)
- **AND** the date ranges overlap (`start_date < existing_end_date` AND `end_date > existing_start_date`)
- **THEN** the system SHALL reject the entire import and return a `BadRequestException`.

#### Scenario: Overlap with existing database record
- **WHEN** a bulk import payload contains an `OrgMembership` record that overlaps with an existing record in the database for the same user and org unit
- **THEN** the system SHALL reject the entire import and return a `BadRequestException`.

## MODIFIED Requirements

### Requirement: Atomic Rollback on Failure
The system MUST process all resources in a single import request within a database transaction. If any single row fails (including validation failures like date overlaps), the entire import SHALL be rolled back.

#### Scenario: Overlap failure causes rollback
- **WHEN** the 3rd membership in a list of 10 has a date overlap with an existing record
- **THEN** the system SHALL rollback all previous changes in the transaction and return a detailed error message indicating the overlap at index 3.
