# system-dataset-schema-discovery Specification

## Purpose
TBD - created by archiving change gbpm-539-master-data-system-tables. Update Purpose after archive.
## Requirements
### Requirement: Get Schema for System Users (USERS)
The system SHALL return a hardcoded `DatasetDefinition` for the `USERS` code that describes the physical structure of the `users` table.

#### Scenario: Successfully retrieve USERS schema
- **WHEN** user makes a `GET /master-data/USERS` request
- **THEN** system returns a 200 OK with the hardcoded USERS dataset definition including fields like `code`, `name`, and `email`.

### Requirement: Get Schema for System Org Units (ORG_UNITS)
The system SHALL return a hardcoded `DatasetDefinition` for the `ORG_UNITS` code that describes the physical structure of the `org_units` table.

#### Scenario: Successfully retrieve ORG_UNITS schema
- **WHEN** user makes a `GET /master-data/ORG_UNITS` request
- **THEN** system returns a 200 OK with the hardcoded ORG_UNITS dataset definition.

