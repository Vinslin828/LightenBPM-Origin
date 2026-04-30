# Spec: System Dataset Record Retrieval

## ADDED Requirements

### Requirement: Query Records for System Users (USERS)
The system SHALL query the physical `users` table directly when a request for `USERS/records` is made.

#### Scenario: List users with pagination and filtering
- **WHEN** user makes a `GET /master-data/USERS/records?_limit=5&code=admin`
- **THEN** system queries the physical `users` table and returns a list of matching records.

### Requirement: Query Records for System Org Units (ORG_UNITS)
The system SHALL query the physical `org_units` table directly when a request for `ORG_UNITS/records` is made.

#### Scenario: List org units
- **WHEN** user makes a `GET /master-data/ORG_UNITS/records`
- **THEN** system returns records from the physical `org_units` table.
