## ADDED Requirements

### Requirement: OrgMembership Overlapping Date Validation for CRUD
The system SHALL prevent the creation or update of any `OrgMembership` that results in an overlapping date range with an existing record for the same user and organization unit, regardless of the `assign_type`.

#### Scenario: Creating a new overlapping membership with different assignment type
- **WHEN** a user attempts to create an `OrgMembership` as `HEAD` for a user and org unit
- **AND** there is already an existing `USER` membership that overlaps with the provided date range
- **THEN** the system SHALL throw a `BadRequestException` and prevent the creation.

#### Scenario: Updating an existing membership to overlap
- **WHEN** a user attempts to update an existing `OrgMembership`'s date range
- **AND** the new range overlaps with ANOTHER existing record for the same user and org unit (excluding the record being updated itself)
- **THEN** the system SHALL throw a `BadRequestException` and prevent the update.
