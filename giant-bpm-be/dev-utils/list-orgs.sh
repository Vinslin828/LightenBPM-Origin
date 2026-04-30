#!/bin/bash

# This script lists all organization units with optional filtering.
# It requires the host URL and an admin auth token.

# --- Usage ---
# ./list-orgs.sh <HOST_URL> <AUTH_TOKEN> [FILTER_TYPE]
#
# Example:
# ./list-orgs.sh http://localhost:3000 your-auth-token-here ORG_UNIT
# ./list-orgs.sh http://localhost:3000 your-auth-token-here # to list all
# ---

# 1. Check for required arguments
if [ "$#" -lt 2 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> [FILTER_TYPE]"
    exit 1
fi

# 2. Assign arguments to variables for clarity
HOST_URL=$1
AUTH_TOKEN=$2
FILTER_TYPE=$3 # Optional filter parameter

# 3. Construct the API endpoint
API_ENDPOINT="${HOST_URL}/bpm/org-units"

# 4. Add filter if provided
if [ -n "$FILTER_TYPE" ]; then
    API_ENDPOINT="${API_ENDPOINT}?filter=${FILTER_TYPE}"
fi

# 5. Execute the curl command
echo "Listing organization units from: ${API_ENDPOINT}"
curl -X GET "${API_ENDPOINT}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json"

# Add a newline for cleaner terminal output after the command runs
echo
