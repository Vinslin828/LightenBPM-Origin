## ADDED Requirements

### Requirement: Support API Fetch Button in Form Schema
The system SHALL support the inclusion of an `API_FETCH` component within the form schema definition.

#### Scenario: Validating form schema with API fetch button
- **WHEN** a client submits a form schema containing a component with `type: "API_FETCH"`
- **AND** the component configuration includes `function` (string)
- **THEN** the system SHALL accept and persist the form schema.
