#!/bin/bash

# This script creates a new form revision using a predefined schema.
# It requires the host URL, an admin auth token, and the ID of the form to be updated.

# --- Usage ---
# ./create-form-revision.sh <HOST_URL> <ADMIN_TOKEN> <FORM_ID>
#
# Example:
# ./create-form-revision.sh http://localhost:3000 your-admin-token-here form-public-id-123
# ---

# 1. Check for required arguments
if [ "$#" -ne 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <ADMIN_TOKEN> <FORM_ID>"
    exit 1
fi

# 2. Assign arguments to variables for clarity
HOST_URL=$1
ADMIN_TOKEN=$2
FORM_ID=$3

# 3. Define the JSON payload using a heredoc for readability
# This contains the form schema you provided.
read -r -d '' JSON_PAYLOAD << EOM
{
  "name": "Expense Report Form Revision 2",
  "description": "Updated schema for expense report form",
  "form_schema": {
    "root": [
      "ddf0a663-fd18-464f-9790-b5198cf2cbaa",
      "287ea9e8-6303-475d-aa36-c41fa70625c6",
      "dd3994cc-142a-4013-95aa-a2065a96b51c",
      "eafcf103-c0ea-46b9-876e-e3236c03aacf",
      "7068cb84-8f34-4855-9241-a909c99b1dfb"
    ],
    "entities": {
      "ddf0a663-fd18-464f-9790-b5198cf2cbaa": {
        "type": "input",
        "attributes": {
          "width": 12,
          "name": "text_field_mhoh4mmvjplmo",
          "label": "Expense Item",
          "inputType": "text",
          "placeholder": "Enter text",
          "disabled": false,
          "readonly": false,
          "defaultValue": "",
          "required": true
        }
      },
      "287ea9e8-6303-475d-aa36-c41fa70625c6": {
        "type": "number",
        "attributes": {
          "width": 12,
          "label": "Amount",
          "required": true,
          "expression": "",
          "decimalDigits": 0,
          "name": "amount-field"
        }
      },
      "dd3994cc-142a-4013-95aa-a2065a96b51c": {
        "type": "date",
        "attributes": {
          "width": 12,
          "name": "date_picker_field_mhoh4mmvm5xmf",
          "label": "Expense Date",
          "required": true,
          "disabled": false,
          "readonly": false
        }
      },
      "eafcf103-c0ea-46b9-876e-e3236c03aacf": {
        "type": "input",
        "attributes": {
          "width": 12,
          "name": "text_field_mhoh4mmvjplmo",
          "label": "Receipt No.",
          "inputType": "text",
          "placeholder": "Enter text",
          "disabled": false,
          "readonly": false,
          "defaultValue": "",
          "required": true
        }
      },
      "7068cb84-8f34-4855-9241-a909c99b1dfb": {
        "type": "textarea",
        "attributes": {
          "name": "textarea_field_mhoh4mmvmwcrr",
          "width": 12,
          "label": "Expense Description",
          "placeholder": "Type here...",
          "defaultValue": "",
          "required": true
        }
      }
    }
  },
  "status": "ACTIVE"
}
EOM

# 4. Execute the curl command with the provided arguments and payload
echo "Sending request to create form revision..."
curl -X POST \
  "${HOST_URL}/bpm/form/${FORM_ID}/revisions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "${JSON_PAYLOAD}"

# Add a newline for cleaner terminal output after the command runs
echo
