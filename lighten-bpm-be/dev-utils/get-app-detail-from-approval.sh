#!/bin/bash

# This script retrieves application approval details by approval task ID.
# It requires the host URL, an auth token, and the approval task UUID.

# --- Usage ---
# ./dev-utils/get-app-detail-from-approval.sh <HOST_URL> <AUTH_TOKEN> <APPROVAL_TASK_ID>
#
# Arguments:
#   HOST_URL: The base URL of the BPM service (e.g., http://localhost:3000)
#   AUTH_TOKEN: The authentication token for the user.
#   APPROVAL_TASK_ID: The public UUID of the approval task.
#
# Examples:
#   # Get approval details for a specific task
#   USER1_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'user1-sub' --email 'user1@example.com' --name 'User One')
#   TASK_ID="123e4567-e89b-12d3-a456-426614174000"
#   ./dev-utils/get-app-detail-from-approval.sh http://localhost:3000 $USER1_TOKEN $TASK_ID
# ---

# 1. Check for required arguments
if [ "$#" -lt 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> <APPROVAL_TASK_ID>"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

# 2. Assign arguments to variables
HOST_URL=$1
AUTH_TOKEN=$2
APPROVAL_TASK_ID=$3

# 3. Construct the API endpoint URL
# Assuming the prefix is /bpm based on other scripts, and controller route is applications/approval/:id
API_ENDPOINT="${HOST_URL}/bpm/applications/approval/${APPROVAL_TASK_ID}"

# 4. Execute the curl command
echo "Fetching approval detail from: ${API_ENDPOINT}"
curl -s -X GET "${API_ENDPOINT}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.'

# Add a newline for cleaner terminal output
echo