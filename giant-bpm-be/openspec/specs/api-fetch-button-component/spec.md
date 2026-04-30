# API Fetch Component

The API Fetch component allows users to trigger external API calls from within a form. It stores a user-defined JavaScript function that is executed on the backend in a secure sandbox.

## Requirements

### Requirement: API Fetch Button Component Definition
The system SHALL define a new form component type `API_FETCH` to support user-defined fetch logic.

#### Scenario: Storing function in component config
- **WHEN** a form revision is created with a component of type `API_FETCH`
- **AND** the component configuration contains a `function` property
- **THEN** the system SHALL persist the component configuration.

### Requirement: Button Trigger Behavior
The system SHALL define the behavior for the API fetch button when triggered.

#### Scenario: Button click behavior
- **WHEN** the user clicks an `API_FETCH` in the form
- **THEN** the system SHALL send the configured `function` to the backend for execution.
- **AND** the system SHALL return the execution result to the frontend.
