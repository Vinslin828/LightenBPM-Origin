#!/bin/bash

# This script retrieves an application instance by its serial number.
# It requires the host URL, an auth token, and the application serial number.

# --- Usage ---
# ./dev-utils/get-app-instance-by-sn.sh <HOST_URL> <AUTH_TOKEN> <SERIAL_NUMBER>
#
# Arguments:
#   HOST_URL: The base URL of the BPM service (e.g., http://localhost:3000)
#   AUTH_TOKEN: The authentication token for the user.
#   SERIAL_NUMBER: The serial number of the application (e.g., APP-1734299400000).
#
# Examples:
#   # Get application instance by serial number
#   USER1_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'user1-sub' --email 'user1@example.com' --name 'User One')
#   SERIAL_NUMBER="APP-1734299400000"
#   ./dev-utils/get-app-instance-by-sn.sh http://localhost:3000 $USER1_TOKEN $SERIAL_NUMBER
# ---

# 1. Check for required arguments
if [ "$#" -lt 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> <SERIAL_NUMBER>"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

# 2. Assign arguments to variables
HOST_URL=$1
AUTH_TOKEN=$2
SERIAL_NUMBER=$3

# 3. Construct the API endpoint URL
API_ENDPOINT="${HOST_URL}/bpm/applications/${SERIAL_NUMBER}"

# 4. Execute the curl command
echo "Fetching application instance from: ${API_ENDPOINT}"
curl -s -X GET "${API_ENDPOINT}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.'

# Add a newline for cleaner terminal output
echo
