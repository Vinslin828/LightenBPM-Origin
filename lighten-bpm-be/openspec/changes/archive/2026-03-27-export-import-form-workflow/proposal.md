# Change: Export/Import Form and Workflow

## Why
To support moving Forms and Workflows between different environments (e.g., Dev -> QA -> Prod), an Export/Import mechanism is required. The system currently lacks a standard way to migrate definitions while maintaining referential integrity across environments where internal IDs may differ. `public_id` will be used as the stable key for synchronization.

## What Changes
- **New Export APIs**: Capability to export Forms and Workflows as JSON payloads containing their revisions and declared dependencies.
- **New Import APIs**: A 2-step Import process (Check & Execute) to validate dependencies and perform safe upserts.
- **Dependency Resolution**: Logic to resolve references (OrgUnits, Users, Tags, Validation Registry) by stable keys (`code`, `name`, `public_id`) instead of internal `id`.

## Impact
- **Affected Specs**: 
  - `form-management`
  - `workflow-management`
- **Affected Modules**:
  - `FormModule`
  - `WorkflowModule`
  - `ValidationRegistryModule` (referenced)
  - `UserModule` (referenced)
  - `OrgUnitModule` (referenced)
