import pytest
import base64
import json
from api_client import APIClient

def generate_user_token(user: dict, bpm_role: str = "user") -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user.get("sub", f"sub-{user['id']}"),
        "email": user["email"],
        "name": user["name"],
        "Job_Grade": user.get("jobGrade", 1),
        "BPM_Role": bpm_role,
    }
    encoded_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().strip("=")
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().strip("=")
    return f"{encoded_header}.{encoded_payload}.dummy_signature"

@pytest.fixture
def user_a_client(api_base_url, temporary_user):
    token = generate_user_token(temporary_user)
    headers = {"Authorization": f"Bearer {token}"}
    client = APIClient(api_base_url, headers)
    client.user_id = temporary_user["id"]
    return client

@pytest.fixture
def user_b_client(api_base_url, temporary_user_b):
    token = generate_user_token(temporary_user_b)
    headers = {"Authorization": f"Bearer {token}"}
    client = APIClient(api_base_url, headers)
    client.user_id = temporary_user_b["id"]
    return client

def test_list_applications_filtering(api_client: APIClient, user_a_client: APIClient, user_b_client: APIClient, temporary_form_workflow_binding):
    """
    Test the extended filtering capabilities of GET /bpm/applications
    - submitted: My submissions
    - shared: Shared to me
    - all: All applications (Admin)
    - approving: Involved in approval
    """
    binding_id = temporary_form_workflow_binding["id"]

    # 1. User A creates and submits an application
    app_a = user_a_client.post("applications", json={
        "binding_id": binding_id,
        "form_data": {}
    }).json()
    serial_a = app_a["serial_number"]
    user_a_client.post(f"applications/{serial_a}/submission", json={
        "form_data": {}
    })

    # 2. User B creates and submits an application
    app_b = user_b_client.post("applications", json={
        "binding_id": binding_id,
        "form_data": {}
    }).json()
    serial_b = app_b["serial_number"]
    user_b_client.post(f"applications/{serial_b}/submission", json={
        "form_data": {}
    })

    # 3. User A shares their application with User B
    user_b_id = user_b_client.get("users/me").json()["id"]
    
    user_a_client.post(f"applications/{serial_a}/shares", json=[{
        "user_id": user_b_id,
        "reason": "Testing share filter"
    }])

    # --- Test User B's filters ---

    # B's Submitted: should only see app_b
    res_submitted = user_b_client.get("applications", params={"filter": "submitted"}).json()
    serials_submitted = [item["serial_number"] for item in res_submitted["items"]]
    assert serial_b in serials_submitted
    assert serial_a not in serials_submitted

    # B's Shared: should only see app_a
    res_shared = user_b_client.get("applications", params={"filter": "shared"}).json()
    serials_shared = [item["serial_number"] for item in res_shared["items"]]
    assert serial_a in serials_shared
    assert serial_b not in serials_shared

    # --- Test Admin's All filter ---
    # Admin All: should see both
    res_all = api_client.get("applications", params={"filter": "all"}).json()
    serials_all = [item["serial_number"] for item in res_all["items"]]
    assert serial_a in serials_all
    assert serial_b in serials_all

    # Normal user's All: should fail (403)
    with pytest.raises(Exception) as excinfo:
        user_b_client.get("applications", params={"filter": "all"})
    assert "403" in str(excinfo.value)
    
    # --- Test Approving filter ---
    # Simple check that it returns items
    res_approving = user_b_client.get("applications", params={"filter": "approving"}).json()
    assert "items" in res_approving
