import base64
import json
import pytest
import requests
from typing import Dict, Any
from api_client import APIClient
from utils.id_generator import generate_public_id

def generate_user_token(user: Dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user["sub"],
        "email": user["email"],
        "name": user["name"],
        "Job_Grade": user.get("jobGrade", 1),
        "BPM_Role": "user",  # Explicitly NOT admin
    }
    encoded_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().strip("=")
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().strip("=")
    return f"{encoded_header}.{encoded_payload}.dummy_signature"

@pytest.fixture
def user_api_client(api_base_url, temporary_user):
    token = generate_user_token(temporary_user)
    headers = {"Authorization": f"Bearer {token}"}
    return APIClient(api_base_url, headers)

def test_workflow_permissions(user_api_client):
    """
    Verify that a regular user cannot access administrative workflow endpoints.
    But can access read-only endpoints required for applications.
    """
    dummy_id = generate_public_id()

    # --- Restricted Endpoints ---

    # 1. List Workflows (Filtered, should return 200)
    response = user_api_client.get("workflow/list")
    assert response.status_code == 200

    # 2. Create Workflow
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        # Provide valid payload to pass DTO validation
        user_api_client.post("workflow", json={"name": "test"})
    assert exc.value.response.status_code == 403

    # 3. Create Workflow Revision
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        # Provide valid payload to pass DTO validation
        user_api_client.post(
            f"workflow/{dummy_id}/revisions",
            json={"name": "test", "flow_definition": {"version": 1, "nodes": []}}
        )
    assert exc.value.response.status_code == 403

    # 4. Update Workflow
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        # Provide valid payload
        user_api_client.put(f"workflow/{dummy_id}", json={"name": "updated"})
    assert exc.value.response.status_code == 403

    # 5. Update Workflow Revision
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        # Provide valid payload (status or flow_definition required)
        user_api_client.patch(f"workflow/revisions/{dummy_id}", json={"status": "ACTIVE"})
    assert exc.value.response.status_code == 403

    # 6. Delete Workflow
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        user_api_client.delete(f"workflow/{dummy_id}")
    assert exc.value.response.status_code == 403

    # --- Allowed Endpoints (Read-Only) ---

    # 7. List Workflow Revisions
    # Should return 404 because dummy_id does not exist, but permission check passed.
    try:
        user_api_client.get(f"workflow/{dummy_id}/revisions")
    except requests.exceptions.HTTPError as exc:
        assert exc.response.status_code == 404, f"Expected 404 for non-existent workflow, got {exc.response.status_code}"

    # 8. Get Workflow
    # Should return 404 because dummy_id does not exist, but permission check passed.
    try:
        user_api_client.get(f"workflow/{dummy_id}")
    except requests.exceptions.HTTPError as exc:
        assert exc.response.status_code == 404, f"Expected 404 for non-existent workflow, got {exc.response.status_code}"

    # 9. Get Workflow Revision
    # Should return 404 because dummy_id does not exist, but permission check passed.
    try:
        user_api_client.get(f"workflow/revisions/{dummy_id}")
    except requests.exceptions.HTTPError as exc:
        assert exc.response.status_code == 404, f"Expected 404 for non-existent revision, got {exc.response.status_code}"

def test_form_permissions(user_api_client, temporary_form):
    """
    Verify that a regular user cannot access administrative form endpoints,
    BUT can access read-only endpoints required for applications.
    """
    dummy_id = generate_public_id()
    valid_form_id = temporary_form["form_id"]
    valid_revision_id = temporary_form["revision_id"]

    # --- Restricted Endpoints ---

    # 1. List Forms (Filtered, should return 200)
    response = user_api_client.get("form/list")
    assert response.status_code == 200

    # 2. Create Form
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        user_api_client.post("form", json={"name": "test", "is_template": False})
    assert exc.value.response.status_code == 403

    # 3. Create Form Revision
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        user_api_client.post(f"form/{dummy_id}/revisions", json={"name": "test"})
    assert exc.value.response.status_code == 403

    # 4. Update Form
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        user_api_client.put(f"form/{dummy_id}", json={"is_active": True})
    assert exc.value.response.status_code == 403

    # 5. Update Form Revision
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        user_api_client.patch(f"form/revisions/{dummy_id}", json={"name": "updated"})
    assert exc.value.response.status_code == 403

    # 6. Delete Form
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        user_api_client.delete(f"form/{dummy_id}")
    assert exc.value.response.status_code == 403

    # 7. Delete Form Revision
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        user_api_client.delete(f"form/revisions/{dummy_id}")
    assert exc.value.response.status_code == 403

    # --- Allowed Endpoints (Read-Only) ---

    # 8. List Form Revisions
    # Should return 404 because dummy_id does not exist, but permission check passed.
    try:
        user_api_client.get(f"form/{dummy_id}/revisions")
    except requests.exceptions.HTTPError as exc:
        assert exc.response.status_code == 404, f"Expected 404 for non-existent form, got {exc.response.status_code}"

    # 9. Get Form (Should be allowed)
    try:
        response = user_api_client.get(f"form/{valid_form_id}")
        assert response.status_code == 200
    except requests.exceptions.HTTPError as e:
        pytest.fail(f"Regular user should be able to Get Form: {e}")

    # 10. Get Form Revision (Should be allowed)
    try:
        response = user_api_client.get(f"form/revisions/{valid_revision_id}")
        assert response.status_code == 200
    except requests.exceptions.HTTPError as e:
        pytest.fail(f"Regular user should be able to Get Form Revision: {e}")