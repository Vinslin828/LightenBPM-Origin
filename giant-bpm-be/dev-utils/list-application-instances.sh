#!/bin/bash

# This script lists application instances with optional filtering.
# It requires the host URL and an auth token.

# --- Usage ---
# ./dev-utils/list-application-instances.sh <HOST_URL> <AUTH_TOKEN> [FILTER] [STATUS]
#
# Arguments:
#   HOST_URL: The base URL of the BPM service (e.g., http://localhost:3000)
#   AUTH_TOKEN: The authentication token for the user.
#   FILTER (optional): 'submitted' or 'approving'.
#   STATUS (optional): 'DRAFT', 'RUNNING', 'COMPLETED', etc.
#
# Examples:
#   # List instances submitted by the token's user
#   USER1_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'user1-sub' --email 'user1@example.com' --name 'User One')
#   ./dev-utils/list-application-instances.sh http://localhost:3000 $USER1_TOKEN submitted
#
#   # List instances pending approval for the token's user
#   USER2_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'user2-sub' --email 'user2@example.com' --name 'User Two')
#   ./dev-utils/list-application-instances.sh http://localhost:3000 $USER2_TOKEN approving
#
#   # List running instances submitted by User One
#   ./dev-utils/list-application-instances.sh http://localhost:3000 $USER1_TOKEN submitted RUNNING
# ---

# 1. Check for required arguments
if [ "$#" -lt 2 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> [FILTER] [STATUS]"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

# 2. Assign arguments to variables
HOST_URL=$1
AUTH_TOKEN=$2
FILTER=$3
STATUS=$4

# 3. Construct the API endpoint URL
API_ENDPOINT="${HOST_URL}/bpm/applications"
QUERY_PARAMS=""

if [ -n "$FILTER" ]; then
    QUERY_PARAMS="filter=${FILTER}"
fi

if [ -n "$STATUS" ]; then
    if [ -n "$QUERY_PARAMS" ]; then
        QUERY_PARAMS="${QUERY_PARAMS}&"
    fi
    QUERY_PARAMS="${QUERY_PARAMS}status=${STATUS}"
fi

if [ -n "$QUERY_PARAMS" ]; then
    API_ENDPOINT="${API_ENDPOINT}?${QUERY_PARAMS}"
fi


# 4. Execute the curl command
echo "Listing application instances from: ${API_ENDPOINT}"
curl -s -X GET "${API_ENDPOINT}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.'

# Add a newline for cleaner terminal output
echo
