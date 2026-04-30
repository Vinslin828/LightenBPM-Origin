#!/bin/bash

# This script measures the time taken to create a form and then update it with a new revision.
# It helps in benchmarking the performance of form revision management.

# --- Usage ---

# ./dev-utils/measure-form-revision-time.sh [HOST_URL] [ID_TOKEN]

#

# Arguments:

#   HOST_URL: The base URL of the BPM service (default: http://localhost:3000)

#   ID_TOKEN: Optional actual token for testing. If omitted, a dummy token is generated.

#

# ---



HOST_URL=${1:-http://localhost:3000}

ID_TOKEN=$2



# Check dependencies

if ! command -v jq &> /dev/null; then

    echo "Error: jq is not installed."

    exit 1

fi



# 1. Handle Token

if [ -z "$ID_TOKEN" ]; then

    echo "No token provided. Generating Dummy Admin Token..."

    ADMIN_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'admin-perf' --email 'admin-perf@example.com' --name 'Admin Perf' --code 'ADMIN_PERF' --job-grade 99 --bpm-role 'admin')

else

    echo "Using provided ID_TOKEN."

    ADMIN_TOKEN=$ID_TOKEN

fi

# Define Schema (Simple)
read -r -d '' SCHEMA_JSON << EOM
{
    "root": ["field_1"],
    "entities": {
        "field_1": {
            "type": "input",
            "attributes": {
                "name": "field_1",
                "label": "Test Field",
                "required": true
            }
        }
    }
}
EOM

# Helper for current time in ms
current_time_ms() {
    python3 -c 'import time; print(int(time.time() * 1000))'
}

echo "Starting Benchmark..."
START_TIME=$(current_time_ms)

# 2. Create Form (with Rev 1)
CREATE_RES=$(curl -s -X POST "${HOST_URL}/bpm/form" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Perf Form $(date +%s)\",
    \"description\": \"Performance Test Form\",
    \"is_template\": false,
    \"form_schema\": $SCHEMA_JSON
  }")

FORM_ID=$(echo "$CREATE_RES" | jq -r '.form_id')

if [ -z "$FORM_ID" ] || [ "$FORM_ID" == "null" ]; then
    echo "Error: Failed to create form."
    echo "Response: $CREATE_RES"
    exit 1
fi

# 3. Update Revision (Rev 2) - Change Schema
# We update the label to "Test Field V2" to verify the change
read -r -d '' SCHEMA_JSON_V2 << EOM
{
    "root": ["field_1"],
    "entities": {
        "field_1": {
            "type": "input",
            "attributes": {
                "name": "field_1",
                "label": "Test Field V2",
                "required": true
            }
        }
    }
}
EOM

REV_RES=$(curl -s -X POST "${HOST_URL}/bpm/form/${FORM_ID}/revisions" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Perf Form Rev 2\",
    \"description\": \"Updated Revision\",
    \"form_schema\": $SCHEMA_JSON_V2,
    \"status\": \"ACTIVE\"
  }")

REV_ID=$(echo "$REV_RES" | jq -r '.revision_id')

if [ -z "$REV_ID" ] || [ "$REV_ID" == "null" ]; then
    echo "Error: Failed to create revision."
    echo "Response: $REV_RES"
    exit 1
fi

# 4. Verification (Retry Loop - Check for Consistency)
# We loop until the returned data matches the V2 update or timeout (30s)
echo "Verifying update (Timeout: 30s)..."

WRITE_END_TIME=$(current_time_ms)
WRITE_DURATION=$((WRITE_END_TIME - START_TIME))

VERIFY_START_TIME=$(current_time_ms)
TIMEOUT_MS=30000
IS_VERIFIED=false

while true; do
    # Check Timeout
    CURRENT_TIME=$(current_time_ms)
    ELAPSED=$((CURRENT_TIME - VERIFY_START_TIME))

    if [ $ELAPSED -gt $TIMEOUT_MS ]; then
        echo "Error: Verification Timed Out after ${TIMEOUT_MS}ms."
        echo "Last Fetch: Name='$FETCHED_NAME', Label='$FETCHED_LABEL'"
        exit 1
    fi

    # Fetch Form
    GET_RES=$(curl -s -X GET "${HOST_URL}/bpm/form/${FORM_ID}" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}")

    echo "Fetched Data:\n$GET_RES"

    # Extract values
    FETCHED_NAME=$(echo "$GET_RES" | jq -r '.revision.name')
    FETCHED_LABEL=$(echo "$GET_RES" | jq -r '.revision.form_schema.entities.field_1.attributes.label')

    echo "Current Fetched Name: $FETCHED_NAME"
    echo "Current Fetched Label: $FETCHED_LABEL"

    # Verify
    if [ "$FETCHED_NAME" == "Perf Form Rev 2" ] && [ "$FETCHED_LABEL" == "Test Field V2" ]; then
        IS_VERIFIED=true
        break
    fi

    # Wait before retry
    sleep 1
done

VERIFY_END_TIME=$(current_time_ms)
CONSISTENCY_DURATION=$((VERIFY_END_TIME - VERIFY_START_TIME))
TOTAL_DURATION=$((VERIFY_END_TIME - START_TIME))

echo "------------------------------------------------"
echo "Success!"
echo "Form ID: $FORM_ID"
echo "Revision 2 ID: $REV_ID"
echo "Verified Name: $FETCHED_NAME"
echo "Verified Label: $FETCHED_LABEL"
echo ""
echo "Write Duration (Create + Update): ${WRITE_DURATION} ms"
echo "Consistency Duration (Wait for Data): ${CONSISTENCY_DURATION} ms"
echo "Total Duration: ${TOTAL_DURATION} ms"
echo "------------------------------------------------"
