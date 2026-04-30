#!/bin/bash

# Tests bulk import of memberships for EXISTING users and org units.
# Verifies that endDate and orgUnitCode are correctly stored after import.
#
# Usage:
#   ./dev-utils/test-bulk-import-existing-membership.sh [HOST_URL] [AUTH_TOKEN]
#
# Arguments:
#   HOST_URL:   Base URL of the service (default: http://localhost:3000)
#   AUTH_TOKEN: Optional admin token. Generated automatically if not provided.

set -e

HOST_URL=${1:-"http://localhost:3000"}
AUTH_TOKEN=$2

# USER_1="carol-user-031"
USER_1="uc_LaZi3UbLq8k9H"
# USER_2="carol-user-033"
USER_2="uc_L4jvG7hY83yzt"
# ORG_CODE="Mock_Org_020"
ORG_CODE="TEST_ORG_LGHN8OWBFEQ5O"
START_DATE="2026-04-01"
END_DATE="2026-05-30"

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo "No token provided, generating an admin token..."
    AUTH_TOKEN=$(python3 dev-utils/generate-dummy-token.py \
        --sub "9754fa98-4041-7039-5079-e633d8f3c3e0" \
        --email "robert.chen@bahwancybertek.wom" \
        --name "Robert Chen" \
        --bpm-role 'admin')
fi

# ─────────────────────────────────────────────
# Step 1: Verify prerequisite data exists
# ─────────────────────────────────────────────
echo "=== Step 1: Verify prerequisite data ==="

check_prerequisite() {
    local label=$1
    local url=$2

    local raw
    raw=$(curl -s --connect-timeout 5 --max-time 10 -w "\n%{http_code}" -X GET "$url" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    local http_status
    http_status=$(echo "$raw" | tail -n1)
    local body
    body=$(echo "$raw" | sed '$d')

    if [ "$http_status" != "200" ]; then
        echo "ERROR: ${label} — HTTP ${http_status}" >&2
        echo "  Response: $(echo "$body" | jq '.' 2>/dev/null || echo "$body")" >&2
        return 1
    fi

    local id
    id=$(echo "$body" | jq -r '.id // empty')
    if [ -z "$id" ]; then
        echo "ERROR: ${label} not found (HTTP 200 but null body)." >&2
        echo "  Response: $(echo "$body" | jq '.' 2>/dev/null || echo "$body")" >&2
        return 1
    fi

    echo "$body"
}

echo "Checking user ${USER_1}..."
USER_1_DATA=$(check_prerequisite "User ${USER_1}" "${HOST_URL}/users/code/${USER_1}")
USER_1_ID=$(echo "$USER_1_DATA" | jq -r '.id')
echo "  Found: id=${USER_1_ID}, name=$(echo "$USER_1_DATA" | jq -r '.name')"

echo "Checking user ${USER_2}..."
USER_2_DATA=$(check_prerequisite "User ${USER_2}" "${HOST_URL}/users/code/${USER_2}")
USER_2_ID=$(echo "$USER_2_DATA" | jq -r '.id')
echo "  Found: id=${USER_2_ID}, name=$(echo "$USER_2_DATA" | jq -r '.name')"

echo "Checking org unit ${ORG_CODE}..."
ORG_DATA=$(check_prerequisite "OrgUnit ${ORG_CODE}" "${HOST_URL}/org-units/code/${ORG_CODE}")
ORG_ID=$(echo "$ORG_DATA" | jq -r '.id')
echo "  Found: id=${ORG_ID}, name=$(echo "$ORG_DATA" | jq -r '.name')"

# ─────────────────────────────────────────────
# Step 2: Bulk import memberships only
# (users and orgUnits arrays are empty — existing data)
# ─────────────────────────────────────────────
echo ""
echo "=== Step 2: Bulk import memberships (existing users & org) ==="

IMPORT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${HOST_URL}/import/bulk" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"users\": [],
      \"orgUnits\": [],
      \"memberships\": [
        {
          \"userCode\": \"${USER_1}\",
          \"orgUnitCode\": \"${ORG_CODE}\",
          \"assignType\": \"HEAD\",
          \"startDate\": \"${START_DATE}\",
          \"endDate\": \"${END_DATE}\",
          \"isDeleted\": false
        },
        {
          \"userCode\": \"${USER_2}\",
          \"orgUnitCode\": \"${ORG_CODE}\",
          \"assignType\": \"USER\",
          \"startDate\": \"${START_DATE}\",
          \"endDate\": \"${END_DATE}\",
          \"isDeleted\": false
        }
      ]
    }")

HTTP_STATUS=$(echo "$IMPORT_RESPONSE" | tail -n1)
IMPORT_BODY=$(echo "$IMPORT_RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "201" ]; then
    echo "ERROR: Import failed with HTTP ${HTTP_STATUS}"
    echo "$IMPORT_BODY" | jq '.' 2>/dev/null || echo "$IMPORT_BODY"
    exit 1
fi
echo "Import succeeded (HTTP ${HTTP_STATUS})"

# ─────────────────────────────────────────────
# Step 3: Get memberships and verify
# ─────────────────────────────────────────────
echo ""
echo "=== Step 3: Verify memberships ==="

PASS=true

check_membership() {
    local user_id=$1
    local user_code=$2
    local expected_assign_type=$3

    echo ""
    echo "--- Memberships for ${user_code} (id=${user_id}) ---"
    MEMBERSHIPS=$(curl -s -X GET "${HOST_URL}/org-units/memberships/user/${user_id}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")

    MATCH=$(echo "$MEMBERSHIPS" | jq -r \
        --arg org "$ORG_CODE" \
        --arg atype "$expected_assign_type" \
        '.[] | select(.orgUnitCode == $org and .assignType == $atype)' 2>/dev/null)

    if [ -z "$MATCH" ]; then
        echo "  FAIL: No ${expected_assign_type} membership found in ${ORG_CODE}"
        echo "  Raw response:"
        echo "$MEMBERSHIPS" | jq '.' 2>/dev/null || echo "$MEMBERSHIPS"
        PASS=false
        return
    fi

    echo "$MATCH" | jq '{id, orgUnitCode, assignType, startDate, endDate}'

    # Check orgUnitCode
    ACTUAL_ORG=$(echo "$MATCH" | jq -r '.orgUnitCode')
    if [ "$ACTUAL_ORG" = "$ORG_CODE" ]; then
        echo "  [PASS] orgUnitCode = \"${ACTUAL_ORG}\""
    else
        echo "  [FAIL] orgUnitCode expected \"${ORG_CODE}\", got \"${ACTUAL_ORG}\""
        PASS=false
    fi

    # Check endDate (should NOT be the INDEFINITE sentinel 2999-12-31)
    ACTUAL_END=$(echo "$MATCH" | jq -r '.endDate')
    EXPECTED_END_PREFIX="${END_DATE}"
    if echo "$ACTUAL_END" | grep -q "^${EXPECTED_END_PREFIX}"; then
        echo "  [PASS] endDate = \"${ACTUAL_END}\""
    else
        echo "  [FAIL] endDate expected to start with \"${EXPECTED_END_PREFIX}\", got \"${ACTUAL_END}\""
        PASS=false
    fi

    # Check startDate
    ACTUAL_START=$(echo "$MATCH" | jq -r '.startDate')
    EXPECTED_START_PREFIX="${START_DATE}"
    if echo "$ACTUAL_START" | grep -q "^${EXPECTED_START_PREFIX}"; then
        echo "  [PASS] startDate = \"${ACTUAL_START}\""
    else
        echo "  [FAIL] startDate expected to start with \"${EXPECTED_START_PREFIX}\", got \"${ACTUAL_START}\""
        PASS=false
    fi
}

check_membership "$USER_1_ID" "$USER_1" "HEAD"
check_membership "$USER_2_ID" "$USER_2" "USER"

# ─────────────────────────────────────────────
# Step 4: Verify via org-unit members endpoint
# ─────────────────────────────────────────────
echo ""
echo "=== Step 4: Verify via GET /org-units/code/${ORG_CODE}/users?status=all ==="

ORG_MEMBERS=$(curl -s -X GET \
    "${HOST_URL}/org-units/code/${ORG_CODE}/users?status=all&assignType=ALL" \
    -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "All members of ${ORG_CODE}:"
echo "$ORG_MEMBERS" | jq '[.[] | {id, orgUnitCode, assignType, startDate, endDate, user: .user.code}]' \
    2>/dev/null || echo "$ORG_MEMBERS"

# ─────────────────────────────────────────────
# Result
# ─────────────────────────────────────────────
echo ""
echo "=== Result ==="
if [ "$PASS" = true ]; then
    echo "ALL CHECKS PASSED"
else
    echo "SOME CHECKS FAILED — see details above"
    exit 1
fi
