#!/bin/bash

# This script tests the Attachment Feature (GBPM-475) Draft Flow and Integration.
# Usage: ./dev-utils/test-attachment-draft-flow.sh <HOST_URL> <AUTH_TOKEN> [BINDING_ID]
# Example: ./dev-utils/test-attachment-draft-flow.sh http://localhost:3000 "ey..." 1

if [ "$#" -lt 2 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> [BINDING_ID]"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it."
    exit 1
fi

HOST_URL=$1
AUTH_TOKEN=$2
BINDING_ID=$3

# --- Helper Functions ---

call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo "--- $description ---" >&2
    if [ -n "$data" ]; then
        curl -s -X "$method" "${HOST_URL}${endpoint}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "${HOST_URL}${endpoint}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}"
    fi
    echo -e "\n" >&2
}

# --- Initialization ---

if [ -z "$BINDING_ID" ]; then
    echo "Finding a valid binding ID..."
    BINDINGS_RESPONSE=$(curl -s -X GET "${HOST_URL}/bpm/bindings" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    BINDING_ID=$(echo "$BINDINGS_RESPONSE" | jq -r '.[0].id // empty')
    FORM_PUBLIC_ID=$(echo "$BINDINGS_RESPONSE" | jq -r '.[0].form.public_id // empty')
    
    if [ -z "$BINDING_ID" ] || [ "$BINDING_ID" == "null" ]; then
        echo "Error: Could not find any form-workflow bindings. Please provide one or ensure the system is seeded."
        exit 1
    fi
    echo "Using Binding ID: $BINDING_ID (Form: $FORM_PUBLIC_ID)"
else
    echo "Fetching form information for Binding ID: $BINDING_ID"
    BINDING_INFO=$(curl -s -X GET "${HOST_URL}/bpm/bindings/${BINDING_ID}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    FORM_PUBLIC_ID=$(echo "$BINDING_INFO" | jq -r '.form.public_id // empty')
fi

# Fetch Form Schema to construct valid form_data
echo "Fetching Form Schema for $FORM_PUBLIC_ID..."
FORM_RESPONSE=$(curl -s -X GET "${HOST_URL}/bpm/form/${FORM_PUBLIC_ID}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}")

# Extract required fields from schema to construct a "minimal" valid form_data
# This is a heuristic: it looks for entities and creates a payload.
# For simplicity in this test script, we'll try to match common fields OR provide an empty object if we can't guess.
FORM_DATA_PAYLOAD=$(echo "$FORM_RESPONSE" | jq -r '
  .revision.form_schema.entities | to_entries | 
  map(select(.value.attributes.required == true)) | 
  from_entries | 
  map_values(
    if .type == "number" then 0 
    elif .type == "date" then "2026-03-27"
    else "Test Value" end
  )
')

if [ -z "$FORM_DATA_PAYLOAD" ] || [ "$FORM_DATA_PAYLOAD" == "{}" ] || [ "$FORM_DATA_PAYLOAD" == "null" ]; then
    FORM_DATA_PAYLOAD="{}"
fi

echo "Constructed Form Data: $FORM_DATA_PAYLOAD"

# Create a dummy file
TEST_FILE="test_draft_attachment_$RANDOM.txt"
echo "This is a test file for the GBPM-475 draft attachment flow." > "$TEST_FILE"
FILE_SIZE=$(wc -c < "$TEST_FILE" | tr -d ' ')
FILE_NAME="$TEST_FILE"
CONTENT_TYPE="text/plain"
FIELD_KEY="upload_component"

# --- Step 1: Draft Init ---
echo "Step 1: Initialize Draft"
INIT_RESPONSE=$(curl -s -X POST "${HOST_URL}/bpm/attachments/drafts/init" \
    -H "Authorization: Bearer ${AUTH_TOKEN}")
DRAFT_ID=$(echo "$INIT_RESPONSE" | jq -r '.draft_id // empty')

if [ -z "$DRAFT_ID" ] || [ "$DRAFT_ID" == "null" ]; then
    echo "Failed to init draft. Response: $INIT_RESPONSE"
    rm -f "$TEST_FILE"
    exit 1
fi
echo "Draft ID: $DRAFT_ID"

# --- Step 2: Draft Presign Upload ---
echo "Step 2: Request Draft Presign Upload"
PRESIGN_RESPONSE=$(curl -s -X POST "${HOST_URL}/bpm/attachments/drafts/${DRAFT_ID}/presign-upload" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"field_key\": \"${FIELD_KEY}\",
        \"file_name\": \"${FILE_NAME}\",
        \"content_type\": \"${CONTENT_TYPE}\",
        \"file_size\": ${FILE_SIZE}
    }")

S3_URL=$(echo "$PRESIGN_RESPONSE" | jq -r '.upload_url // empty')
S3_KEY=$(echo "$PRESIGN_RESPONSE" | jq -r '.s3_key // empty')

if [ -z "$S3_URL" ] || [ "$S3_URL" == "null" ]; then
    echo "Failed to get presigned URL. Response: $PRESIGN_RESPONSE"
    rm -f "$TEST_FILE"
    exit 1
fi
echo "Successfully got presigned URL."

# --- Step 3: Upload to S3 ---
echo "Step 3: Upload file to S3"
UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$S3_URL" \
    -H "Content-Type: ${CONTENT_TYPE}" \
    --data-binary @"$TEST_FILE")

if [ "$UPLOAD_STATUS" != "200" ]; then
    echo "Failed to upload to S3. HTTP Status: $UPLOAD_STATUS"
    rm -f "$TEST_FILE"
    exit 1
fi
echo "Successfully uploaded file to S3."

# --- Step 4: Draft Confirm ---
echo "Step 4: Confirm Draft Upload"
CONFIRM_RESPONSE=$(curl -s -X POST "${HOST_URL}/bpm/attachments/drafts/${DRAFT_ID}/confirm" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"s3_key\": \"${S3_KEY}\",
        \"remark\": \"Draft test remark\"
    }")
ATTACHMENT_ID=$(echo "$CONFIRM_RESPONSE" | jq -r '.id // empty')

if [ -z "$ATTACHMENT_ID" ] || [ "$ATTACHMENT_ID" == "null" ]; then
    echo "Failed to confirm draft upload. Response: $CONFIRM_RESPONSE"
    rm -f "$TEST_FILE"
    exit 1
fi
echo "Confirmed Attachment ID: $ATTACHMENT_ID"

# --- Step 5: Draft List ---
echo "Step 5: List Draft Attachments"
call_api GET "/bpm/attachments/drafts/${DRAFT_ID}" "" "List Draft Attachments" | jq '.'

# --- Step 6: Application Submission (Binding) ---
echo "Step 6: Submit Application with Draft ID"
# Using the dynamically constructed FORM_DATA_PAYLOAD
SUBMISSION_RESPONSE=$(call_api POST "/bpm/applications/submission" "{
        \"binding_id\": ${BINDING_ID},
        \"draft_id\": \"${DRAFT_ID}\",
        \"form_data\": ${FORM_DATA_PAYLOAD}
    }" "Submit Application")

SERIAL_NUMBER=$(echo "$SUBMISSION_RESPONSE" | jq -r '.serial_number // empty')

if [ -z "$SERIAL_NUMBER" ] || [ "$SERIAL_NUMBER" == "null" ]; then
    echo "Failed to submit application. Response: $SUBMISSION_RESPONSE"
else
    echo "Submitted Application Serial Number: $SERIAL_NUMBER"

    # --- Step 7: Verify Binding ---
    echo "Step 7: Verify attachments bound to Application"
    VERIFY_RESPONSE=$(call_api GET "/bpm/applications/${SERIAL_NUMBER}/attachments" "" "Verify Binding")
    echo "$VERIFY_RESPONSE" | jq '.'
    
    FOUND_ATTACHMENT=$(echo "$VERIFY_RESPONSE" | jq -r ".[] | select(.id == ${ATTACHMENT_ID}) | .id")
    if [ "$FOUND_ATTACHMENT" == "$ATTACHMENT_ID" ]; then
        echo "SUCCESS: Attachment $ATTACHMENT_ID is correctly bound to $SERIAL_NUMBER"
    else
        echo "FAILURE: Attachment $ATTACHMENT_ID not found in application $SERIAL_NUMBER"
    fi
fi

# --- Step 8: Admin API Tests ---
echo "Step 8: Admin API - List Pending Uploads"
ADMIN_PENDING_RESPONSE=$(call_api GET "/bpm/attachments/admin/pending" "" "List Pending Uploads")
echo "Pending uploads count: $(echo "$ADMIN_PENDING_RESPONSE" | jq 'length')"

# Optional: Clean up test file
rm -f "$TEST_FILE"
echo "----------------------------------------"
echo "Test Draft Flow Completed."
