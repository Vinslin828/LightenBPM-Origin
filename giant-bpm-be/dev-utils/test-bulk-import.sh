#!/bin/bash

# This script tests the Bulk Import API for Users, OrgUnits, and OrgMemberships.
# It performs a successful import and verifies the resources, then tests rollback behavior.

# --- Usage ---
# ./dev-utils/test-bulk-import.sh [HOST_URL] [AUTH_TOKEN]
#
# Arguments:
#   HOST_URL: The base URL of the service (default: http://localhost:3000)
#   AUTH_TOKEN: Optional admin token. If not provided, one will be generated.
# ---

HOST_URL=${1:-"http://localhost:3000"}
AUTH_TOKEN=$2

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo "No token provided, generating an admin token..."
    AUTH_TOKEN=$(python3 dev-utils/generate-dummy-token.py --sub "admin-bulk-test" --email "admin-bulk@example.com" --name "Admin Bulk Tester" --bpm-role 'admin')
fi

RANDOM_ID=$RANDOM

# Cleanup before test (if they exist)
echo "Cleaning up any existing test data..."
curl -s -X DELETE "${HOST_URL}/org-units/code/IMPORT_DEPT_1" -H "Authorization: Bearer ${AUTH_TOKEN}" > /dev/null
curl -s -X DELETE "${HOST_URL}/org-units/code/IMPORT_ROLE_1" -H "Authorization: Bearer ${AUTH_TOKEN}" > /dev/null

echo "Testing successful bulk import (ID: ${RANDOM_ID})..."
curl -s -X POST "${HOST_URL}/import/bulk" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orgUnits\": [
      { \"code\": \"IMPORT_DEPT_1\", \"name\": \"Imported Dept 1\", \"type\": \"ORG_UNIT\" },
      { \"code\": \"IMPORT_ROLE_1\", \"name\": \"Imported Role 1\", \"type\": \"ROLE\", \"parentCode\": \"IMPORT_DEPT_1\" }
    ],
    \"users\": [
      { \"code\": \"IMPORT_USER_${RANDOM_ID}\", \"name\": \"Imported User ${RANDOM_ID}\", \"jobGrade\": 5, \"defaultOrgCode\": \"IMPORT_DEPT_1\", \"email\": \"import${RANDOM_ID}@example.com\" }
    ],
    \"memberships\": [
      { \"orgUnitCode\": \"IMPORT_DEPT_1\", \"userCode\": \"IMPORT_USER_${RANDOM_ID}\", \"assignType\": \"HEAD\", \"startDate\": \"2023-01-01T00:00:00Z\", \"endDate\": \"2099-12-31T00:00:00Z\" }
    ]
  }"

echo -e "\n\nVerifying resources were created..."
echo "OrgUnit IMPORT_DEPT_1:"
curl -s -X GET "${HOST_URL}/org-units/code/IMPORT_DEPT_1" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c '{code: .code, name: .name}'

echo "User IMPORT_USER_${RANDOM_ID}:"
# Search in user list
curl -s -X GET "${HOST_URL}/users" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c ".[] | select(.code==\"IMPORT_USER_${RANDOM_ID}\") | {code: .code, name: .name}"

echo "Membership for IMPORT_USER_${RANDOM_ID} in IMPORT_DEPT_1:"
USER_ID=$(curl -s -X GET "${HOST_URL}/users" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -r ".[] | select(.code==\"IMPORT_USER_${RANDOM_ID}\") | .id")
curl -s -X GET "${HOST_URL}/org-units/memberships/user/${USER_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c ".[] | select(.orgUnitCode==\"IMPORT_DEPT_1\") | {orgUnitCode: .orgUnitCode, assignType: .assignType}"

echo -e "\nTesting upsert support (Updating name)..."
curl -s -X POST "${HOST_URL}/import/bulk" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orgUnits\": [
      { \"code\": \"IMPORT_DEPT_1\", \"name\": \"Imported Dept 1 Updated\", \"type\": \"ORG_UNIT\" }
    ],
    \"users\": [
      { \"code\": \"IMPORT_USER_${RANDOM_ID}\", \"name\": \"Imported User ${RANDOM_ID} Updated\", \"jobGrade\": 5, \"defaultOrgCode\": \"IMPORT_DEPT_1\" }
    ],
    \"memberships\": []
  }"

echo -e "\nVerifying updates..."
curl -s -X GET "${HOST_URL}/users/code/IMPORT_USER_${RANDOM_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c '{code: .code, name: .name}'
curl -s -X GET "${HOST_URL}/org-units/code/IMPORT_DEPT_1" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c '{code: .code, name: .name}'

echo -e "\nTesting soft-delete via import (Deleting IMPORT_USER_${RANDOM_ID} and IMPORT_DEPT_1)..."
curl -s -X POST "${HOST_URL}/import/bulk" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orgUnits\": [
      { \"code\": \"IMPORT_DEPT_1\", \"name\": \"Imported Dept 1\", \"type\": \"ORG_UNIT\", \"isDeleted\": true }
    ],
    \"users\": [
      { \"code\": \"IMPORT_USER_${RANDOM_ID}\", \"name\": \"Imported User ${RANDOM_ID}\", \"jobGrade\": 5, \"defaultOrgCode\": \"IMPORT_DEPT_1\", \"isDeleted\": true }
    ],
    \"memberships\": []
  }"

echo "Waiting for DB to sync..."
sleep 2

echo "Direct check of user data via code endpoint (should show deleted_at):"
curl -s -X GET "${HOST_URL}/users/code/IMPORT_USER_${RANDOM_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c '{code: .code, deleted_at: .deleted_at}'

echo "Verifying user is filtered from list..."
# User list endpoint filters deleted_at: null
USER_LIST=$(curl -s -X GET "${HOST_URL}/users" -H "Authorization: Bearer ${AUTH_TOKEN}")
echo "User count in list: $(echo $USER_LIST | jq '. | length')"
echo $USER_LIST | jq -c ".[] | select(.code==\"IMPORT_USER_${RANDOM_ID}\")"

echo "Verifying OrgUnit is filtered (should return 404)..."
curl -s -X GET "${HOST_URL}/org-units/code/IMPORT_DEPT_1" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c '.message'

echo -e "\nTesting restoration via import (Re-importing IMPORT_USER_${RANDOM_ID} and IMPORT_DEPT_1)..."
curl -s -X POST "${HOST_URL}/import/bulk" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orgUnits\": [
      { \"code\": \"IMPORT_DEPT_1\", \"name\": \"Imported Dept 1 Restored\", \"type\": \"ORG_UNIT\", \"isDeleted\": false }
    ],
    \"users\": [
      { \"code\": \"IMPORT_USER_${RANDOM_ID}\", \"name\": \"Imported User ${RANDOM_ID} Restored\", \"jobGrade\": 5, \"defaultOrgCode\": \"IMPORT_DEPT_1\", \"isDeleted\": false }
    ],
    \"memberships\": []
  }"

echo "Verifying restoration..."
curl -s -X GET "${HOST_URL}/users/code/IMPORT_USER_${RANDOM_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c '{code: .code, name: .name}'
curl -s -X GET "${HOST_URL}/org-units/code/IMPORT_DEPT_1" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -c '{code: .code, name: .name}'

echo -e "\n=== GBPM-769: Verify endDate is NOT forced to INDEFINITE on new users with defaultOrgCode ==="
echo "Cleaning up any existing GBPM-769 test data..."
curl -s -X DELETE "${HOST_URL}/org-units/code/GBPM769_DEPT" -H "Authorization: Bearer ${AUTH_TOKEN}" > /dev/null

SPECIFIC_END_DATE="2027-06-30T00:00:00Z"

echo "Importing 1 new org, 2 new users, and their memberships with endDate=${SPECIFIC_END_DATE}..."
GBPM769_IMPORT_RESULT=$(curl -s -X POST "${HOST_URL}/import/bulk" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orgUnits\": [
      { \"code\": \"GBPM769_DEPT\", \"name\": \"GBPM-769 Test Dept\", \"type\": \"ORG_UNIT\" }
    ],
    \"users\": [
      {
        \"code\": \"GBPM769_USER_A_${RANDOM_ID}\",
        \"name\": \"GBPM769 User A ${RANDOM_ID}\",
        \"jobGrade\": 3,
        \"defaultOrgCode\": \"GBPM769_DEPT\",
        \"email\": \"gbpm769a${RANDOM_ID}@example.com\"
      },
      {
        \"code\": \"GBPM769_USER_B_${RANDOM_ID}\",
        \"name\": \"GBPM769 User B ${RANDOM_ID}\",
        \"jobGrade\": 4,
        \"defaultOrgCode\": \"GBPM769_DEPT\",
        \"email\": \"gbpm769b${RANDOM_ID}@example.com\"
      }
    ],
    \"memberships\": [
      {
        \"orgUnitCode\": \"GBPM769_DEPT\",
        \"userCode\": \"GBPM769_USER_A_${RANDOM_ID}\",
        \"assignType\": \"HEAD\",
        \"startDate\": \"2024-01-01T00:00:00Z\",
        \"endDate\": \"${SPECIFIC_END_DATE}\"
      },
      {
        \"orgUnitCode\": \"GBPM769_DEPT\",
        \"userCode\": \"GBPM769_USER_B_${RANDOM_ID}\",
        \"assignType\": \"USER\",
        \"startDate\": \"2024-01-01T00:00:00Z\",
        \"endDate\": \"${SPECIFIC_END_DATE}\"
      }
    ]
  }")
echo "Import response: ${GBPM769_IMPORT_RESULT}"

echo -e "\nVerifying membership endDates are preserved (should be ${SPECIFIC_END_DATE}, NOT 2999-12-31)..."

USER_A_ID=$(curl -s -X GET "${HOST_URL}/users/code/GBPM769_USER_A_${RANDOM_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -r '.id')
USER_B_ID=$(curl -s -X GET "${HOST_URL}/users/code/GBPM769_USER_B_${RANDOM_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -r '.id')

echo "User A (${USER_A_ID}) membership endDate:"
MEMBERSHIP_A=$(curl -s -X GET "${HOST_URL}/org-units/memberships/user/${USER_A_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}")
echo "${MEMBERSHIP_A}" | jq -c ".[] | select(.orgUnitCode==\"GBPM769_DEPT\") | {orgUnitCode: .orgUnitCode, assignType: .assignType, endDate: .endDate}"

echo "User B (${USER_B_ID}) membership endDate:"
MEMBERSHIP_B=$(curl -s -X GET "${HOST_URL}/org-units/memberships/user/${USER_B_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}")
echo "${MEMBERSHIP_B}" | jq -c ".[] | select(.orgUnitCode==\"GBPM769_DEPT\") | {orgUnitCode: .orgUnitCode, assignType: .assignType, endDate: .endDate}"

# Check for GBPM-769 regression: endDate must NOT be 2999-12-31
END_DATE_A=$(echo "${MEMBERSHIP_A}" | jq -r ".[] | select(.orgUnitCode==\"GBPM769_DEPT\") | .endDate // \"\"")
END_DATE_B=$(echo "${MEMBERSHIP_B}" | jq -r ".[] | select(.orgUnitCode==\"GBPM769_DEPT\") | .endDate // \"\"")

echo -e "\n[GBPM-769 CHECK]"
if echo "${END_DATE_A}" | grep -q "2999"; then
  echo "FAIL: User A endDate was forced to INDEFINITE (2999-12-31) — GBPM-769 regression!"
else
  echo "PASS: User A endDate is ${END_DATE_A} (not forced to INDEFINITE)"
fi
if echo "${END_DATE_B}" | grep -q "2999"; then
  echo "FAIL: User B endDate was forced to INDEFINITE (2999-12-31) — GBPM-769 regression!"
else
  echo "PASS: User B endDate is ${END_DATE_B} (not forced to INDEFINITE)"
fi

echo -e "\n=== End GBPM-769 test ===\n"

echo -e "\nTesting rollback on failure (invalid org code for user)..."
curl -s -X POST "${HOST_URL}/import/bulk" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "orgUnits": [
      { "code": "ROLLBACK_DEPT", "name": "Rollback Dept", "type": "ORG_UNIT" }
    ],
    "users": [
      { "code": "ROLLBACK_USER", "name": "Rollback User", "jobGrade": 1, "defaultOrgCode": "NON_EXISTENT_ORG", "email": "rollback@example.com" }
    ],
    "memberships": []
  }'

echo -e "\n\nVerifying ROLLBACK_DEPT was NOT created..."
curl -s -X GET "${HOST_URL}/org-units/code/ROLLBACK_DEPT" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo
