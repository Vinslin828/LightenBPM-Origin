# Spec: System Dataset Mutation Blocking

## ADDED Requirements

### Requirement: Block Record Creation for System Datasets
The system SHALL block any `POST` requests to create records in system datasets.

#### Scenario: Block user creation via master data
- **WHEN** user makes a `POST /master-data/USERS/records` with some data
- **THEN** system returns a 403 Forbidden with a clear message that system datasets are read-only.

### Requirement: Block Record Updates for System Datasets
The system SHALL block any `PATCH` requests to update records in system datasets.

#### Scenario: Block user update via master data
- **WHEN** user makes a `PATCH /master-data/USERS/records?id=1`
- **THEN** system returns a 403 Forbidden.

### Requirement: Block Record Deletion for System Datasets
The system SHALL block any `DELETE` requests to delete records in system datasets.

#### Scenario: Block user deletion via master data
- **WHEN** user makes a `DELETE /master-data/USERS/records?id=1`
- **THEN** system returns a 403 Forbidden.
