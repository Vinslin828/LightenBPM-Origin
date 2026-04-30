#!/bin/bash

# This script manages attachments via Admin API endpoints (GBPM-475).
# Usage: ./dev-utils/attachment-mngr.sh <HOST_URL> <AUTH_TOKEN> <COMMAND> [ID]
#
# Commands:
#   list: List all expired/pending uploads (orphaned files).
#   purge: Purge a pending upload by ID and delete the S3 object.
#
# Example:
#   ./dev-utils/attachment-mngr.sh http://localhost:3000 "ey..." list
#   ./dev-utils/attachment-mngr.sh http://localhost:3000 "ey..." purge 42

if [ "$#" -lt 3 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <AUTH_TOKEN> <COMMAND> [ID]"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it."
    exit 1
fi

HOST_URL=$1
AUTH_TOKEN=$2
COMMAND=$3
ID=$4
BASE_URL="${HOST_URL}/bpm/attachments/admin/pending"

# --- Helper Functions ---

call_api() {
    local method=$1
    local url=$2
    local description=$3

    echo "--- $description ---" >&2
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json")

    # Extract body and status
    http_body=$(echo "$response" | sed '$d')
    http_status=$(echo "$response" | tail -n1)

    if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
        if [ -n "$http_body" ]; then
            echo "$http_body" | jq '.'
        else
            echo "Success (HTTP $http_status)"
        fi
    else
        echo "Error: Request failed with status $http_status" >&2
        echo "Response body: $http_body" >&2
        return 1
    fi
}

case "$COMMAND" in
    list)
        call_api GET "${BASE_URL}" "Listing expired/pending uploads"
        ;;
    purge)
        if [ -z "$ID" ]; then
            echo "Error: ID is required for purge command."
            exit 1
        fi
        call_api DELETE "${BASE_URL}/${ID}" "Purging attachment ID: ${ID}"
        ;;
    *)
        echo "Error: Unknown command '$COMMAND'. Use 'list' or 'purge'."
        exit 1
        ;;
esac

echo -e "\nCommand completed."
