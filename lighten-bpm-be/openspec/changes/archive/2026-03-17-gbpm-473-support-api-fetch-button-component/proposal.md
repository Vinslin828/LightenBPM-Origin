## Why

The Form Builder needs to support a new button component that allows users to trigger external API fetches during form filling. Currently, the system lacks a standardized way for the backend to execute user-defined fetch logic and return results to the frontend. This capability is essential for dynamic data enrichment and third-party integrations (e.g., fetching customer data from an ERP based on an ID).

## What Changes

- **New API Endpoint**: Implement a dedicated endpoint (e.g., `POST /bpm/execution/fetch`) that accepts a code snippet and input parameters, executes the fetch logic, and returns the API response.
- **Snippet Syntax**: Define a restricted JavaScript-based syntax for the fetch snippet, providing access to a controlled `fetch` utility and input context.
- **Form Component Support**: Update the Form Builder schema to include the "API Fetch Button" component, which stores the snippet and configuration.
- **Security & Sandboxing**: Implement a secure execution environment on the backend to prevent malicious code execution (e.g., using `vm2` or a similar sandboxing library).

## Capabilities

### New Capabilities
- `fetch-snippet-execution`: Provides the backend service and API for safely executing user-defined JavaScript snippets for external API calls.
- `api-fetch-component`: Defines the structure and behavior of the new fetch component within the form schema.

### Modified Capabilities
- `form-management`: Update the form schema and revision handling to support the new button component and its properties.

## Impact

- **Backend**: New controller and service for snippet execution; integration with a sandboxing library.
- **API**: New endpoint for snippet execution.
- **Frontend**: Form builder needs to be updated to support the new button type and its configuration UI.
- **Security**: Requires careful implementation of the sandbox to restrict access to local resources and sensitive environment variables.
