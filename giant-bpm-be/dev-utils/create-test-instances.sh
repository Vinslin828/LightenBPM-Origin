#!/bin/bash

# This script generates test application instances for different scenarios.
# It automates the process of creating and processing applications to achieve
# 'running', 'completed', and 'rejected' states.

# --- Usage ---
# ./dev-utils/create-test-instances.sh <HOST_URL> <WORKFLOW_PUBLIC_ID> [SCENARIO]
#
# Arguments:
#   HOST_URL: The base URL of the BPM service (e.g., http://localhost:3000)
#   WORKFLOW_PUBLIC_ID: The public ID of the workflow to create instances from.
#   SCENARIO (optional): 'running', 'completed', 'rejected', or 'all'. Defaults to 'all'.
#
# Dependencies:
#   - jq: This script requires jq for parsing JSON. Please install it (e.g., 'brew install jq').
#   - ./generate-dummy-token.py: Must be in the same directory and executable.
#
# ---

# 1. Check for required arguments and dependencies
if [ "$#" -lt 2 ]; then
    echo "Error: Missing required arguments."
    echo "Usage: $0 <HOST_URL> <WORKFLOW_PUBLIC_ID> [SCENARIO]"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., 'brew install jq')."
    exit 1
fi

# 2. Assign arguments to variables
HOST_URL=$1
WORKFLOW_PUBLIC_ID=$2
SCENARIO=${3:-all}

# 3. Generate tokens for users
echo "Generating dummy tokens..."
USER1_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'user1-sub' --email 'user1@example.com' --name 'User One')
USER2_TOKEN=$(./dev-utils/generate-dummy-token.py --sub 'user2-sub' --email 'user2@example.com' --name 'User Two')
echo "Tokens generated."

# 4. Define a sample form data payload
# This should correspond to the form linked to your workflow.
# Note: The expense_item name is made unique with a timestamp to avoid duplicate errors if run multiple times.
EXPENSE_ITEM="Team Lunch $(date +%s)"
read -r -d '' FORM_DATA_PAYLOAD << EOM
{
  "workflow_id": "${WORKFLOW_PUBLIC_ID}",
  "form_data": {
    "expense_item": "${EXPENSE_ITEM}",
    "amount": 150.75,
    "expense_date": "2025-11-28",
    "receipt_no": "INV-12345",
    "expense_description": "Lunch meeting with the development team."
  }
}
EOM

# --- Function Definitions ---

# Function to create and submit a new application
create_and_submit() {
    local token=$1
    echo "Creating and submitting a new application instance..."
    
    response=$(curl -s -X POST \
      "${HOST_URL}/bpm/applications/submit-and-create" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${token}" \
      -d "${FORM_DATA_PAYLOAD}")

    serial_number=$(echo "$response" | jq -r '.serial_number')

    if [ -z "$serial_number" ] || [ "$serial_number" == "null" ]; then
        echo "Error: Failed to create application instance."
        echo "Response: $response"
        return 1
    fi
    
    echo "Successfully created application with serial number: ${serial_number}"
    echo "$serial_number" # Return serial_number
}

# Function to approve or reject an application
update_approval() {
    local serial_number=$1
    local approver_token=$2
    local action=$3 # "APPROVE" or "REJECT"

    echo "Fetching approval task for serial number: ${serial_number}"
    nodes_response=$(curl -s -X GET \
        "${HOST_URL}/bpm/applications/${serial_number}/nodes" \
        -H "Authorization: Bearer ${approver_token}")
        
    # Find the public_id of the PENDING approval task for our approver
    task_id=$(echo "$nodes_response" | jq -r '.[] | .approval_tasks[] | select(.status == "PENDING") | .public_id')

    if [ -z "$task_id" ] || [ "$task_id" == "null" ]; then
        echo "Error: Could not find a PENDING approval task for this instance."
        echo "It might have been auto-approved or there's a workflow configuration issue."
        return 1
    fi
    echo "Found approval task ID: ${task_id}"

    echo "Submitting action '${action}' for task ${task_id}..."
    curl -s -X PUT \
        "${HOST_URL}/bpm/applications/${serial_number}/approval" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${approver_token}" \
        -d "{\"action\": \"${action}\", \"task_id\": \"${task_id}\"}"
    
    echo -e "\nAction '${action}' submitted for ${serial_number}."
}

# --- Scenario Implementations ---

create_running_instance() {
    echo -e "\n--- Creating RUNNING application instance ---"
    create_and_submit "$USER1_TOKEN"
}

create_completed_instance() {
    echo -e "\n--- Creating COMPLETED application instance ---"
    serial_number=$(create_and_submit "$USER1_TOKEN")
    if [ $? -eq 0 ]; then
        update_approval "$serial_number" "$USER2_TOKEN" "APPROVE"
    fi
}

create_rejected_instance() {
    echo -e "\n--- Creating REJECTED application instance ---"
    serial_number=$(create_and_submit "$USER1_TOKEN")
    if [ $? -eq 0 ]; then
        update_approval "$serial_number" "$USER2_TOKEN" "REJECT"
    fi
}


# --- Main Execution Logic ---

case "$SCENARIO" in
    running)
        create_running_instance
        ;;
    completed)
        create_completed_instance
        ;;
    rejected)
        create_rejected_instance
        ;;
    all)
        create_running_instance
        create_completed_instance
        create_rejected_instance
        ;;
    *)
        echo "Error: Invalid scenario '${SCENARIO}'. Choose 'running', 'completed', 'rejected', or 'all'."
        exit 1
        ;;
esac

echo -e "\nScript finished."
