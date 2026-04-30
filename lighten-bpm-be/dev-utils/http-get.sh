#!/bin/bash

# This script is a generic tool to retrieve the response of BPM Get APIs.
# It requires the endpoint URL and an auth token.

# --- Usage ---
# ./dev-utils/http-get.sh <API_ENDPOINT> <AUTH_TOKEN>
#
# Arguments:
#   API_ENDPOINT: The GET API endpoint (e.g., "http://localhost:3000/bpm/users/1")
#   AUTH_TOKEN:   The authentication token for the user.
#
# Examples:
#   # Get routing for a specific application
#   USER1_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'user1-sub' --email 'user1@example.com' --name 'User One')
#   ./dev-utils/http-get.sh http://localhost:3000/bpm/applications/APP-123/routing "$USER1_TOKEN"
# ---

# 1. Check for required arguments
if [ "$#" -lt 2 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <API_ENDPOINT> <AUTH_TOKEN>"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

# 2. Assign arguments to variables
API_ENDPOINT=$1
AUTH_TOKEN=$2

# 3. Execute the curl command
echo "Sending GET request to: ${API_ENDPOINT}"

# Capture both output and http status
response=$(curl -s -w "\n%{http_code}" -X GET "${API_ENDPOINT}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json")

# Extract body and status
http_body=$(echo "$response" | sed '$d')
http_status=$(echo "$response" | tail -n1)

if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
    # If success, pretty print with jq
    echo "$http_body" | jq '.'
else
    echo "Error: Request failed with status $http_status"
    echo "Response body:"
    # Try to verify if body is valid JSON before piping to jq, otherwise just print raw
    if echo "$http_body" | jq empty > /dev/null 2>&1; then
        echo "$http_body" | jq '.'
    else
        echo "$http_body"
    fi
fi

echo