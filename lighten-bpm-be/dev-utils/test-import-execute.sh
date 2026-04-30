#!/bin/bash

# Base URL for the API
BASE_URL=${BASE_URL:-"http://localhost:3000/bpm"}

# Generate an admin token
echo "Generating admin token..."
ADMIN_TOKEN=$(python3 ./dev-utils/generate-dummy-token.py --sub 'admin-sub' --email 'admin@example.com' --name 'Admin User' --code 'ADMIN001' --job-grade 5 --bpm-role 'admin')

if [ -z "$ADMIN_TOKEN" ]; then
    echo "Error: Failed to generate admin token."
    exit 1
fi

# Temporary file for payload
PAYLOAD_FILE=$(mktemp)

cat <<'EOF' > "$PAYLOAD_FILE"
{
    "can_proceed": true,
    "summary": {
        "entity_exists": true,
        "action": "NO_CHANGE",
        "revision_diff": false
    },
    "dependencies_check": {
        "tags": [
            {
                "name": "HR",
                "status": "EXISTS",
                "severity": "INFO"
            }
        ],
        "validations": [
            {
                "name": "A2",
                "status": "EXISTS",
                "severity": "INFO"
            },
            {
                "name": "always return false",
                "status": "EXISTS",
                "severity": "INFO"
            },
            {
                "name": "always return false with custom error message",
                "status": "EXISTS",
                "severity": "INFO"
            },
            {
                "name": "Dylan's",
                "status": "EXISTS",
                "severity": "INFO"
            },
            {
                "name": "Test 69",
                "status": "EXISTS",
                "severity": "INFO"
            },
            {
                "name": "[test] test return error message validation",
                "status": "EXISTS",
                "severity": "INFO"
            }
        ],
        "org_units": [],
        "users": []
    },
    "original_payload": {
        "protocol_version": "1.0",
        "exported_at": "2026-03-26T06:01:39.733Z",
        "exported_by": "0784aac8-7041-701e-6b41-484a1aa96909",
        "type": "FORM",
        "payload": {
            "public_id": "Da9HzkwFSGdtw",
            "is_template": false,
            "latest_revision": {
                "public_id": "DjOW6s4Ff58v3",
                "name": "Ramble test 01",
                "description": "123",
                "form_schema": {
                    "root": [
                        "text_up7v15"
                    ],
                    "entities": {
                        "text_up7v15": {
                            "type": "input",
                            "attributes": {
                                "name": "text_up7v15",
                                "label": {
                                    "value": "Text Field"
                                },
                                "width": 12,
                                "disabled": false,
                                "readonly": false,
                                "required": false,
                                "inputType": "text",
                                "validator": {
                                    "required": false
                                },
                                "placeholder": "Enter text",
                                "defaultValue": {
                                    "isReference": false
                                }
                            }
                        }
                    }
                },
                "options": {
                    "can_withdraw": true,
                    "can_copy": true,
                    "can_draft": true,
                    "can_delegate": true
                }
            },
            "dependencies": {
                "tags": [
                    {
                        "name": "HR",
                        "description": "Human Resources (HR)",
                        "color": "#8646F4"
                    }
                ],
                "permissions": [
                    {
                        "grantee_type": "EVERYONE",
                        "grantee_value": "",
                        "action": "VIEW"
                    },
                    {
                        "grantee_type": "EVERYONE",
                        "grantee_value": "",
                        "action": "USE"
                    }
                ],
                "validations": [
                    {
                        "source_id": 21,
                        "public_id": "DVoRdBSHc5GSa",
                        "name": "A2",
                        "validation_type": "CODE",
                        "validation_code": "",
                        "error_message": "Validation failed",
                        "components": [
                            "input",
                            "textarea",
                            "TextField"
                        ]
                    },
                    {
                        "source_id": 23,
                        "public_id": "DS1bufMq0zUEi",
                        "name": "always return false",
                        "validation_type": "CODE",
                        "validation_code": "function validation(value){\n  return false;\n}",
                        "error_message": "always return false",
                        "components": [
                            "input",
                            "textarea",
                            "TextField"
                        ]
                    },
                    {
                        "source_id": 24,
                        "public_id": "Dx2goiJzul7Cl",
                        "name": "always return false with custom error message",
                        "validation_type": "API",
                        "validation_code": "function validation(value){\n  return {isValid: false, error: 'custom error message'}\n}",
                        "error_message": "Validation failed",
                        "components": [
                            "input",
                            "textarea",
                            "TextField"
                        ]
                    },
                    {
                        "source_id": 16,
                        "public_id": "DHf0Yc1BYnPOt",
                        "name": "Dylan's",
                        "validation_type": "API",
                        "validation_code": "function validation(taxId) {\n  const res = fetch(\"https://company.g0v.ronny.tw/api/show/\" + taxId);\n  const data = JSON.parse(res.body).data;\n  if (data && data[\"公司名稱\"]) {\n    return { isValid: true, error: \"\" };\n  }\n  return { isValid: false, error: \"Registry Validation-查無此統編對應之公司\" };\n}",
                        "error_message": "At least need 10",
                        "components": [
                            "input",
                            "TextField"
                        ]
                    },
                    {
                        "source_id": 20,
                        "public_id": "Dpsrn3Wz5K8n9",
                        "name": "Test 69",
                        "validation_type": "CODE",
                        "validation_code": "",
                        "error_message": "Validation failed",
                        "components": [
                            "input",
                            "textarea",
                            "TextField"
                        ]
                    },
                    {
                        "source_id": 22,
                        "public_id": "DfQbyFfiTOIyI",
                        "name": "[test] test return error message validation",
                        "validation_type": "CODE",
                        "validation_code": "function validation(value){\n  if(value === 3) return true;\n  return {isValid: false, error: 'custom error message'}\n}",
                        "error_message": "test custom error message",
                        "components": [
                            "input",
                            "textarea",
                            "TextField"
                        ]
                    }
                ]
            }
        }
    }
}
EOF

# 1. Execute Import
echo "Executing import..."
EXECUTE_RESPONSE=$(curl -s -X POST "${BASE_URL}/import/execute" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @"$PAYLOAD_FILE")

rm "$PAYLOAD_FILE"


echo "Execute Response:"
echo "$EXECUTE_RESPONSE" | jq '.'

# 2. List Forms and check for existence
echo -e "\nListing forms to verify existence..."
LIST_RESPONSE=$(curl -s -X GET "${BASE_URL}/form/list" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json")

echo "LIST Response:"
echo "$LIST_RESPONSE" | jq '.'

# Extract the public_id from the payload to check
TARGET_PUBLIC_ID="Da9HzkwFSGdtw"

echo "Checking for form with public_id: ${TARGET_PUBLIC_ID}"
FOUND=$(echo "$LIST_RESPONSE" | jq --arg id "$TARGET_PUBLIC_ID" '.items[] | select(.form_id == $id)')

if [ -n "$FOUND" ]; then
    echo "SUCCESS: Form ${TARGET_PUBLIC_ID} found in the list."
    echo "$FOUND" | jq '.'
else
    echo "FAILURE: Form ${TARGET_PUBLIC_ID} NOT found in the list."
    # Print the full list for debugging
    # echo "$LIST_RESPONSE" | jq '.'
fi
