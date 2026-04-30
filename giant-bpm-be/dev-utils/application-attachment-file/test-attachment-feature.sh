#!/bin/bash

# This script tests the Attachment Feature (GBPM-475) API endpoints for existing applications.
# Usage: ./dev-utils/test-attachment-feature.sh <HOST_URL> <AUTH_TOKEN> <SERIAL_NUMBER>
# Example: ./dev-utils/test-attachment-feature.sh http://localhost:3000 "ey..." "APP-123"

if [ "$#" -lt 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> <SERIAL_NUMBER>"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it."
    exit 1
fi

HOST_URL=$1
AUTH_TOKEN=$2
SERIAL_NUMBER=$3
BASE_URL="${HOST_URL}/bpm/applications/${SERIAL_NUMBER}/attachments"
TEST_FILE="test_attachment_$RANDOM.txt"

echo "----------------------------------------"
echo "Testing Attachment Feature (GBPM-475)"
echo "Base URL: $BASE_URL"
echo "Test file: $TEST_FILE"
echo "----------------------------------------"

# --- Helper Functions ---

call_api() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4

    echo "Step: $description" >&2
    if [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
          -H "Authorization: Bearer ${AUTH_TOKEN}" \
          -H "Content-Type: application/json" \
          -d "$data"
    else
        curl -s -X "$method" "$url" \
          -H "Authorization: Bearer ${AUTH_TOKEN}"
    fi
}

# Create a dummy file
echo "Creating dummy file: $TEST_FILE"
echo "This is a test file for the GBPM-475 attachment feature upload." > "$TEST_FILE"
FILE_SIZE=$(wc -c < "$TEST_FILE" | tr -d ' ')
FILE_NAME="$TEST_FILE"
CONTENT_TYPE="text/plain"
FIELD_KEY="upload_component"

echo "----------------------------------------"
# Step 1: Request presign-upload URL
PRESIGN_RESPONSE=$(call_api POST "${BASE_URL}/presign-upload" "{
    \"field_key\": \"${FIELD_KEY}\",
    \"file_name\": \"${FILE_NAME}\",
    \"content_type\": \"${CONTENT_TYPE}\",
    \"file_size\": ${FILE_SIZE}
}" "Request presign-upload URL")

echo -e "\nResponse: $PRESIGN_RESPONSE"

# Extract S3 URL and Key
S3_URL=$(echo "$PRESIGN_RESPONSE" | jq -r '.upload_url // empty')
S3_KEY=$(echo "$PRESIGN_RESPONSE" | jq -r '.s3_key // empty')

if [ -z "$S3_URL" ] || [ "$S3_URL" == "null" ] || [ -z "$S3_KEY" ] || [ "$S3_KEY" == "null" ]; then
    echo "Failed to get presigned URL."
    rm -f "$TEST_FILE"
    exit 1
fi

echo "----------------------------------------"
echo "Step: Upload file directly to S3"
UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$S3_URL" \
  -H "Content-Type: ${CONTENT_TYPE}" \
  --data-binary @"$TEST_FILE")

if [ "$UPLOAD_STATUS" != "200" ]; then
    echo "Failed to upload to S3. HTTP Status: $UPLOAD_STATUS"
    rm -f "$TEST_FILE"
    exit 1
fi
echo "Successfully uploaded file to S3."

echo "----------------------------------------"
# Step 3: Confirm upload
CONFIRM_RESPONSE=$(call_api POST "${BASE_URL}" "{
    \"s3_key\": \"${S3_KEY}\",
    \"remark\": \"Initial test remark\"
}" "Confirm upload")

echo -e "\nResponse: $CONFIRM_RESPONSE"
ATTACHMENT_ID=$(echo "$CONFIRM_RESPONSE" | jq -r '.id // empty')

if [ -z "$ATTACHMENT_ID" ] || [ "$ATTACHMENT_ID" == "null" ]; then
    echo "Failed to confirm upload."
    rm -f "$TEST_FILE"
    exit 1
fi

echo "----------------------------------------"
# Step 4: List attachments
echo "Step: List attachments"
call_api GET "${BASE_URL}" "" "List attachments" | jq '.'

echo "----------------------------------------"
# Step 5: Update remark
PATCH_RESPONSE=$(call_api PATCH "${BASE_URL}/${ATTACHMENT_ID}" "{
    \"remark\": \"Updated test remark\"
}" "Update remark")

echo -e "\nUpdated remark response:"
echo "$PATCH_RESPONSE" | jq -c '{id: .id, remark: .remark}'

echo "----------------------------------------"
# Step 6: Get presign-download URL
DOWNLOAD_INFO=$(call_api GET "${BASE_URL}/${ATTACHMENT_ID}/download" "" "Get presign-download URL")
echo -e "\nDownload response: $DOWNLOAD_INFO"

DOWNLOAD_URL=$(echo "$DOWNLOAD_INFO" | jq -r '.download_url // empty')

if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" == "null" ]; then
    echo "Failed to get download URL."
else
    echo "Successfully got download URL. Testing download..."
    DOWNLOAD_TEST_FILE="downloaded_$TEST_FILE"
    DOWNLOAD_STATUS=$(curl -s -L -o "$DOWNLOAD_TEST_FILE" -w "%{http_code}" "$DOWNLOAD_URL")

    if [ "$DOWNLOAD_STATUS" == "200" ]; then
        echo "Successfully downloaded file. File content:"
        cat "$DOWNLOAD_TEST_FILE"
        rm -f "$DOWNLOAD_TEST_FILE"
    else
        echo "Failed to download file. HTTP Status: $DOWNLOAD_STATUS"
    fi
fi

echo "----------------------------------------"
# Step 7: Delete attachment
DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE_URL}/${ATTACHMENT_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

if [ "$DELETE_STATUS" == "204" ] || [ "$DELETE_STATUS" == "200" ]; then
    echo "Step: Delete attachment - SUCCESS"
else
    echo "Step: Delete attachment - FAILED. HTTP Status: $DELETE_STATUS"
fi

# Clean up
rm -f "$TEST_FILE"
echo "----------------------------------------"
echo "Test completed."
