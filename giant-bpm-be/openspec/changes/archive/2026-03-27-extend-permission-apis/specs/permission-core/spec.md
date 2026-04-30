## MODIFIED Requirements

### Requirement: Batch Permission Management
The system SHALL support adding or overwriting multiple permission records in a single API request to improve administrative efficiency.

#### Scenario: Batch adding permissions
- **WHEN** an authorized user sends an array of permission definitions to the creation endpoint
- **THEN** the system SHALL create all valid permission records and return the created set.

#### Scenario: Batch setting (overwriting) permissions
- **WHEN** an authorized user sends an array of permission definitions to the set (PUT) endpoint
- **THEN** the system SHALL replace all existing permission records for that resource with the new set in a single transaction.
