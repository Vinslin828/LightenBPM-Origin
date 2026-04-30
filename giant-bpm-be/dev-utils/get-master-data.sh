#!/bin/bash

# This script retrieves master data schema or records by dataset code.
# It supports both custom datasets and system datasets (USERS, ORG_UNITS).

# --- Usage ---
# ./dev-utils/get-master-data.sh <HOST_URL> <AUTH_TOKEN> <CODE> [records] [QUERY_PARAMS]
#
# Arguments:
#   HOST_URL:     The base URL of the BPM service (e.g., http://localhost:3000)
#   AUTH_TOKEN:   The authentication token for the user.
#   CODE:         The dataset code (e.g., USERS, ORG_UNITS, or a custom code).
#   records:      (Optional) If literal "records", fetches data instead of schema.
#   QUERY_PARAMS: (Optional) Additional query parameters (e.g., "_limit=5&_page=1").
#
# Examples:
#   # Get schema for USERS
#   ./dev-utils/get-master-data.sh http://localhost:3000 $TOKEN USERS
#
#   # Get records for USERS
#   ./dev-utils/get-master-data.sh http://localhost:3000 $TOKEN USERS records
#
#   # Get records for ORG_UNITS with pagination
#   ./dev-utils/get-master-data.sh http://localhost:3000 $TOKEN ORG_UNITS records "_limit=10&_page=1"
# ---

# 1. Check for required arguments
if [ "$#" -lt 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> <CODE> [records] [QUERY_PARAMS]"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

# 2. Assign arguments to variables
HOST_URL=$1
AUTH_TOKEN=$2
CODE=$3
MODE=$4
PARAMS=$5

# 3. Construct the API endpoint URL
API_ENDPOINT="${HOST_URL}/bpm/master-data/${CODE}"

if [ "$MODE" == "records" ]; then
    API_ENDPOINT="${API_ENDPOINT}/records"
fi

if [ -n "$PARAMS" ]; then
    API_ENDPOINT="${API_ENDPOINT}?${PARAMS}"
fi

# 4. Execute the curl command
echo "Fetching from: ${API_ENDPOINT}"
echo "AUTH_TOKEN: ${AUTH_TOKEN:0:10}..."  # Show only the first 10 characters for security
response=$(curl -s -X GET "${API_ENDPOINT}" \
  -w "\n%{http_code}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json")

# Extract body and status
http_body=$(echo "$response" | sed '$d')
http_status=$(echo "$response" | tail -n1)
echo "--- HTTP Response ---"
echo "HTTP status: $http_status"
echo "--- HTTP Response END ---"

if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
    echo "$http_body" | jq '.'
else
    echo "Error: Request failed with status $http_status"
    echo "Response body:"
    if echo "$http_body" | jq empty > /dev/null 2>&1; then
        echo "$http_body" | jq '.'
    else
        echo "$http_body"
    fi
fi

# Add a newline for cleaner terminal output
echo
