#!/bin/bash

# Demo: Master Data External API feature using jsonplaceholder.typicode.com/users/1
#
# This script walks through the full lifecycle:
#   1. Generate a dummy admin token
#   2. Test the external API endpoint (POST /master-data/external-api/test)
#   3. Create an external-API-backed dataset
#   4. Query records fetched live from the external API
#   5. Update the external config
#   6. Clean up (delete the dataset)
#
# Usage:
#   ./dev-utils/test-master-data-external-api.sh [HOST_URL]
#
#   HOST_URL defaults to http://localhost:3000
#
# Requirements: jq, python3

set -e

HOST_URL="${1:-http://localhost:3000}"
BASE_URL="${HOST_URL}/master-data"
DATASET_CODE="TEST_USERS_EXT_API"

# ─── Helpers ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

step() { echo -e "\n${CYAN}${BOLD}▶ $*${RESET}" >&2; }
ok()   { echo -e "${GREEN}✓ $*${RESET}" >&2; }
fail() { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

check_deps() {
    command -v jq    &>/dev/null || fail "jq is required (brew install jq)"
    command -v curl  &>/dev/null || fail "curl is required"
    command -v python3 &>/dev/null || fail "python3 is required"
}

http() {
    local method="$1"; shift
    local url="$1";    shift
    curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        "$@"
}

assert_status() {
    local response="$1"
    local expected="$2"
    local label="$3"
    local status
    status=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')
    if [ "$status" != "$expected" ]; then
        echo "  Response body:" >&2
        echo "$body" | jq '.' 2>/dev/null >&2 || echo "$body" >&2
        fail "$label — expected HTTP $expected, got $status"
    fi
    ok "$label (HTTP $status)"
    echo "$body"
}

# ─── Main ────────────────────────────────────────────────────────────────────

check_deps

step "Generating dummy admin token"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOKEN=$(python3 "${SCRIPT_DIR}/generate-dummy-token.py" \
    --sub  "dev-admin-001" \
    --email "admin@dev.local" \
    --name  "Dev Admin" \
    --code  "DEV_ADMIN" \
    --bpm-role "admin")
echo "  Token (first 40 chars): ${TOKEN:0:40}..." >&2

# ─── 1. Probe the external API ───────────────────────────────────────────────

step "1. Testing external API: GET https://jsonplaceholder.typicode.com/users/1"
resp=$(http POST "${BASE_URL}/external-api/test" --data-raw '{
    "api_config": {
        "url": "https://jsonplaceholder.typicode.com/users/1",
        "method": "GET"
    }
}')
body=$(assert_status "$resp" "201" "POST /master-data/external-api/test")
echo "  Sample response fields: $(echo "$body" | jq 'keys')" >&2

# ─── 2. Create the dataset ───────────────────────────────────────────────────

step "2. Cleaning up any previous run (ignore errors)"
http DELETE "${BASE_URL}/${DATASET_CODE}" > /dev/null 2>&1 || true

step "3. Creating external-API dataset: ${DATASET_CODE}"
resp=$(http POST "${BASE_URL}" --data-raw "{
    \"code\": \"${DATASET_CODE}\",
    \"name\": \"JSONPlaceholder Users\",
    \"source_type\": \"EXTERNAL_API\",
    \"fields\": [
        {\"name\": \"user_id\",  \"type\": \"NUMBER\", \"required\": true},
        {\"name\": \"username\", \"type\": \"TEXT\",   \"required\": true},
        {\"name\": \"addr_street\", \"type\": \"TEXT\", \"required\": true},
        {\"name\": \"email\",    \"type\": \"TEXT\",   \"required\": true},
        {\"name\": \"phone\",    \"type\": \"TEXT\",   \"required\": false},
        {\"name\": \"website\",  \"type\": \"TEXT\",   \"required\": false}
    ],
    \"api_config\": {
        \"url\": \"https://jsonplaceholder.typicode.com/users\",
        \"method\": \"GET\"
    },
    \"field_mappings\": {
        \"records_path\": \"\",
        \"mappings\": [
            {\"field_name\": \"user_id\",  \"json_path\": \"id\"},
            {\"field_name\": \"username\", \"json_path\": \"username\"},
            {\"field_name\": \"addr_street\", \"json_path\": \"address.street\"},
            {\"field_name\": \"email\",    \"json_path\": \"email\"},
            {\"field_name\": \"phone\",    \"json_path\": \"phone\"},
            {\"field_name\": \"website\",  \"json_path\": \"website\"}
        ]
    }
}")
body=$(assert_status "$resp" "201" "POST /master-data (create dataset)")
echo "  source_type : $(echo "$body" | jq -r '.source_type')" >&2
echo "  api_config  : $(echo "$body" | jq -r '.api_config.url')" >&2

# ─── 3. Query records (live from external API) ───────────────────────────────

step "4. Querying records (live from external API)"
resp=$(http GET "${BASE_URL}/${DATASET_CODE}/records?_limit=5")
body=$(assert_status "$resp" "200" "GET /master-data/${DATASET_CODE}/records")
echo "  Total records : $(echo "$body" | jq '.total')" >&2
echo "  First record  :" >&2
echo "$body" | jq '.items[0]' >&2

step "4.1. Query with field selection (?_select=user_id,username,email)"
resp=$(http GET "${BASE_URL}/${DATASET_CODE}/records?_select=user_id,username,email&_limit=3")
body=$(assert_status "$resp" "200" "GET records with _select")
echo "  Fields returned: $(echo "$body" | jq '.items[0] | keys')" >&2

# ─── 4. Verify non-admin is blocked (write ops) ──────────────────────────────

step "5. Verifying non-admin cannot create/update/delete records (expect 403)"
NON_ADMIN_TOKEN=$(python3 "${SCRIPT_DIR}/generate-dummy-token.py" \
    --sub  "dev-user-001" \
    --email "user@dev.local" \
    --name  "Dev User" \
    --bpm-role "user")

ORIG_TOKEN="$TOKEN"
TOKEN="$NON_ADMIN_TOKEN"

resp=$(curl -s -w "\n%{http_code}" -X POST \
    "${BASE_URL}/${DATASET_CODE}/records" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data-raw '{"user_id": 999, "username": "hacker"}')
body=$(assert_status "$resp" "403" "POST /records blocked for non-admin")

TOKEN="$ORIG_TOKEN"

# ─── 5. Update external config ───────────────────────────────────────────────

step "6. Updating external config (add Accept header)"
resp=$(http PATCH "${BASE_URL}/${DATASET_CODE}/external-config" --data-raw '{
    "api_config": {
        "url": "https://jsonplaceholder.typicode.com/users",
        "method": "GET",
        "headers": {"Accept": "application/json"}
    }
}')
body=$(assert_status "$resp" "200" "PATCH /master-data/${DATASET_CODE}/external-config")
echo "  Updated headers: $(echo "$body" | jq '.api_config.headers')" >&2

# ─── 6. Cleanup ──────────────────────────────────────────────────────────────

step "7. Deleting dataset"
resp=$(http DELETE "${BASE_URL}/${DATASET_CODE}")
assert_status "$resp" "200" "DELETE /master-data/${DATASET_CODE}" > /dev/null

step "8. Verifying dataset is gone (expect 404)"
resp=$(http GET "${BASE_URL}/${DATASET_CODE}")
assert_status "$resp" "404" "GET /master-data/${DATASET_CODE} after delete" > /dev/null

echo -e "\n${GREEN}${BOLD}All steps completed successfully.${RESET}\n" >&2
