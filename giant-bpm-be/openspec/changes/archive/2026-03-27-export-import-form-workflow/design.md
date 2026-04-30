# Design: Export/Import Strategy

## Context
Migrating complex object graphs like Forms and Workflows between environments requires handling differences in internal database IDs. We need a robust "Identity & Synchronization" strategy using stable external keys.

## Goals
- Enable moving Forms/Workflows between environments (Dev/QA/Prod).
- Prevent data corruption by validating dependencies before import.
- Support "Upsert" (Update if exists, Insert if new) based on `public_id`.
- **ID Transfer**: Automatically map internal IDs (which differ between environments) inside JSON blobs using stable identifiers.
- **Bundling**: Support migrating Workflows together with their bound Forms in a single payload.

## Strategy

### Architecture
To maintain a clean separation of concerns, the Export/Import functionality will be implemented in a dedicated **`MigrationModule`** (or `ExchangeModule`).
*   **Separation**: Domain modules (`Form`, `Workflow`) will continue to handle core business logic and basic CRUD.
*   **Transport Layer**: The `MigrationModule` will handle JSON serialization, ID mapping logic, dependency analysis, and the 2-step import workflow.

### Identity & Synchronization
*   **Forms, Workflows, Revisions**: Identify by `public_id`.
*   **Organizations**: Identify by `code`.
*   **Users**: Identify by `code` (or `email` as fallback).
*   **Validation Registry**: Identify by `public_id` or `name`.
*   **Tags**: Identify by `name`.

### ID Transformation Logic
The `flow_definition` and `form_schema` JSON blobs often contain internal database IDs (e.g., `user_id`, `org_unit_id`) configuration. To support portability:

1.  **Export Phase**: The exporter detects these IDs within the JSON and generates a `dependencies` map linking the **Source Internal ID** to a **Stable Identifier** (Code/PublicID).
2.  **Import Phase**:
    *   **Resolution**: The importer looks up the Stable Identifiers in the Target environment to find the **Target Internal IDs**.
    *   **Mapping**: It creates a translation map: `Map<SourceID, TargetID>`.
    *   **Transformation (Visitor Pattern)**: Instead of generic string replacement, the system implements a **`FlowDefinitionVisitor`**. This visitor traverses the typed structure of the JSON blob (Nodes -> Approvers -> Config), ensuring IDs are only replaced in the correct fields and context, maintaining type safety and data integrity.

### Import Process (2-Step)
1.  **Check (Dry Run)**:
    *   Upload Export JSON.
    *   System validates format.
    *   **Config Data**: Checks if Tags/Validations exist; if not, marks for creation.
    *   **Bundle Check**: If a Workflow contains a `bundled_form`, the system performs a full check on the Form's dependencies as well.
    *   **Master Data**: Checks if Users/Orgs exist. If missing, returns **Blocking Error**.
    *   **Entity Check**: Checks existence of the target Entity and Revision (to determine Insert vs Update).
    *   Returns a **Check Result** indicating status and missing items.
2.  **Execute (Transactional Atomicity)**:
    *   User confirms the import.
    *   **Atomic Operation**: The entire execution (Resolution, Transformation, and DB Writes) **MUST** be wrapped in a **`prisma.$transaction`**. This prevents partial imports if a single dependency resolution or write fails.
    *   **Pre-requisite Processing**: If a `bundled_form` is present, the Form is upserted **first** to ensure the bound ID exists for the Workflow reference.
    *   System upserts Config Data (Tags, Validations).
    *   System performs the upsert of Form/Workflow using `public_id`.
    *   **ID Transformation**: Apply the ID translation logic (via Visitor) to the JSON payloads.

## JSON Formats

### Export JSON Format
A unified container for both Form and Workflow.

#### Common Header
```json
{
  "protocol_version": "1.0",
  "exported_at": "2024-03-20T10:00:00Z",
  "exported_by": "user_code_123",
  "type": "FORM", // or "WORKFLOW"
  "payload": { ... }
}
```

#### Form Payload
```json
{
  "public_id": "form_pub_id_123",
  "is_template": false,
  "latest_revision": {
    "public_id": "rev_pub_id_456",
    "name": "Leave Request v1",
    "description": "Standard leave request",
    "form_schema": { ... }, // The JSON schema
    "options": {
        "can_withdraw": true,
        "can_copy": true
    }
  },
  "dependencies": {
    "tags": [
      { "name": "HR", "description": "Human Resources", "color": "#FF0000" }
    ],
    "validations": [
      {
        "source_id": 10,
        "public_id": "val_pub_1",
        "name": "PhoneNumberCheck",
        "definition": {
           "validation_type": "CODE",
           "validation_code": "regex...",
           "error_message": "Invalid Phone"
        }
      }
    ]
  }
}
```

#### Workflow Payload
```json
{
  "public_id": "flow_pub_id_789",
  "latest_revision": {
    "public_id": "flow_rev_pub_id_001",
    "name": "Manager Approval Flow",
    "flow_definition": { ... }, 
    "options": {
        "reuse_prior_approvals": true
    }
  },
  "binding": {
    "target_form_public_id": "form_pub_id_123",
    "bundled_form": { ... } // Optional: Full Form Payload
  },
  "dependencies": {
    "tags": [
      { "name": "Approval", "description": "General Approvals", "color": "#00FF00" }
    ],
    "org_units": [
        { "source_id": 101, "code": "HR_DEPT", "type": "ORG_UNIT" },
        { "source_id": 102, "code": "IT_DEPT", "type": "ORG_UNIT" },
        { "source_id": 55, "code": "MANAGER_ROLE", "type": "ROLE" }
    ],
    "users": [
        { "source_id": 42, "code": "CEO_USER_CODE" }
    ]
  }
}
```

### Import Check Response
```json
{
  "can_proceed": false,
  "summary": {
    "entity_exists": true,
    "action": "UPDATE_REVISION",
    "revision_diff": false
  },
  "dependencies_check": {
    "validations": [
      { "name": "PhoneNumberCheck", "status": "EXISTS", "severity": "INFO" }
    ],
    "org_units": [
      { "code": "HR_DEPT", "status": "EXISTS", "severity": "INFO" },
      { "code": "UNKNOWN_DEPT", "status": "MISSING", "severity": "BLOCKING" }
    ],
    "users": [],
    "related_form": {
        "public_id": "form_pub_id_123",
        "status": "IN_BUNDLE", // or "EXISTS", "MISSING"
        "severity": "INFO"
    }
  }
}
```

## API Design

### Endpoints
*   `GET /bpm/forms/:id/export` -> Returns `Export JSON`
*   `GET /bpm/workflows/:id/export` -> Returns `Export JSON`
*   `POST /bpm/import/check` -> Body: `Export JSON` -> Returns `Import Check Response`
*   `POST /bpm/import/execute` -> Body: `Import Check Response` -> Returns Success/Fail

### Import Workflow & Security
1.  **Check Phase**: User sends `Export JSON` to `/check`. Server returns `Import Check Response` which includes:
    *   Execution Plan (Create/Update).
    *   Dependency Status.
    *   **The Original Payload** (echoed back to keep the object self-contained).
2.  **Execute Phase**: User sends the **entire** `Import Check Response` object to `/execute`.
    *   **Convenience**: The UI simply passes the object it received.
    *   **Security (Critical)**: The server **MUST NOT** trust the "Status" or "ID Maps" provided in the client's request body.
    *   **Logic**: The server extracts the `original_payload` from the request, **re-runs** the dependency resolution and ID mapping logic, and then performs the DB write. This ensures that a malicious client cannot spoof "safe" IDs by modifying the check result.
