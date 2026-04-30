import requests
import uuid

BASE_URL = "http://localhost:3000"

def get_token():
    # Use the generate-dummy-token script or similar to get a token
    # For now, I'll assume the user might have one or I can use a mock token if the app allows
    # In this environment, I can probably use the dev-utils/generate-dummy-token.py
    pass

def test_create_user_optional_fields():
    user_uuid = str(uuid.uuid4())[:8]
    user_data = {
        "name": f"test-user-{user_uuid}",
        "code": f"uc_{user_uuid}",
        "jobGrade": 3,
        "defaultOrgCode": "ORG_001" # Assuming this exists from seed
    }

    # We need a token. I'll use the CLI tool if available.
    # Actually, I can just try to run it and see if it fails with 401.

    response = requests.post(f"{BASE_URL}/users", json=user_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    # This is a bit hard to run without a token.
    # I'll use a better way: create a temporary test file in the e2e_tester/tests directory
    pass
