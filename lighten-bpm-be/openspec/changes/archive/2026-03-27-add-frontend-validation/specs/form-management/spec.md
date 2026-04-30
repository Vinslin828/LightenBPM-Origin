# Spec: Frontend Validation (validation)

This specification defines the structure of the `validation` field in Form API DTOs. This field is mapped to the `fe_validation` column in the `FormRevision` database table. It is intended for the Frontend to store and retrieve complex validation logic that is not processed by the Backend.

## Data Mapping
| Layer | Property Name |
| :--- | :--- |
| **API (Request/Response)** | `validation` |
| **Database (PostgreSQL)** | `fe_validation` |

## Data Structure

The `fe_validation` column stores a JSON object with the following structure:

### FEValidation Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `validation` | `Object` | The root container for validation logic. |

### Validation Container
| Field | Type | Description |
| :--- | :--- | :--- |
| `required` | `Boolean` | A global flag indicating if the form or a specific context requires validation. |
| `validators` | `Array<ValidatorItem>` | A list of custom script-based validators. |

### ValidatorItem
| Field | Type | Description |
| :--- | :--- | :--- |
| `key` | `String` | A unique identifier for the validator (e.g., `validator_1770290851936`). |
| `listenFieldIds` | `Array<String>` | List of Form Field IDs that should trigger this validation when changed. |
| `code` | `String` | The JavaScript code containing the validation logic (e.g., `function validation() { ... }`). |
| `description` | `String` | (Optional) Documentation for what this validator does. |
| `errorMessage` | `String` | The message to display to the user if the validation returns `false`. |

## Example JSON

```json
{
  "validation": {
    "required": true,
    "validators": [
      {
        "key": "validator_1770290851936",
        "listenFieldIds": [],
        "code": "function validation() {
 return true;
}",
        "description": "Always valid baseline",
        "errorMessage": "Validation failed."
      },
      {
        "key": "validator_custom_date",
        "listenFieldIds": [
          "date_kcmxqn"
        ],
        "code": "function validation() {
 return getFormField("date_kcmxqn").value > 5;
}",
        "description": "Check if date value is greater than 5",
        "errorMessage": "Value must be greater than 5."
      }
    ]
  }
}
```

## Usage Guidelines
1. **Dumb Persistence**: The Backend must accept any valid JSON matching this structure without attempting to parse or execute the `code` strings.
2. **Sanitization**: The Frontend is responsible for sanitizing and safely executing the `code` snippets (e.g., via a sandbox).
3. **Synchronization**: Field IDs in `listenFieldIds` should correspond to keys in the `form_schema`. The Backend does not enforce this referential integrity.
