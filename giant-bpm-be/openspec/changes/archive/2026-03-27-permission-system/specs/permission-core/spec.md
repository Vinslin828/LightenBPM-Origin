## ADDED Requirements

### Requirement: Centralized Permission Logic
The system SHALL provide a centralized service (Permission Builder) to handle all authorization logic, ensuring consistency across the application.

#### Scenario: Permission check request
- **WHEN** a component requests a permission check for a user and a resource
- **THEN** the system SHALL return a boolean indicating whether the action is permitted based on the defined rules

### Requirement: Dynamic SQL Filter Generation
The system SHALL generate dynamic database filters (Prisma `where` clauses) to restrict data retrieval at the database level based on user permissions.

#### Scenario: Listing forms with filters
- **WHEN** a user requests a list of forms
- **THEN** the system SHALL apply a dynamically generated `where` clause that includes only forms the user is authorized to see

### Requirement: Support for Multiple Grantee Types
The permission system SHALL support various grantee types, including specific User IDs, Organization Units, Job Grades, and Public access.

#### Scenario: Granting access to an Org Unit
- **WHEN** a permission is granted to an Org Unit "X"
- **THEN** only users directly belonging to Org Unit "X" SHALL receive access. Sub-units are NOT included automatically.

### Requirement: Batch Permission Management
The system SHALL support adding multiple permission records in a single API request to improve administrative efficiency.

#### Scenario: Batch adding permissions
- **WHEN** an admin sends an array of permission definitions to the creation endpoint
- **THEN** the system SHALL create all valid permission records and return the created set.

### Requirement: Query-based Permission Deletion
The system SHALL support deleting permission records based on specific criteria (grantee_type, grantee_value, action) to facilitate bulk cleanup.

#### Scenario: Bulk deleting permissions for a user
- **WHEN** an admin requests deletion of permissions for a specific user ID
- **THEN** the system SHALL remove all permission records for that user on the specified resource.
