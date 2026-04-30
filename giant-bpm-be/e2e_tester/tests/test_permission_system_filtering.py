import base64
import json
import pytest
import requests
from typing import Dict, Any
from api_client import APIClient
from utils.id_generator import generate_public_id

def generate_user_token(user: Dict[str, Any], bpm_role: str = "user") -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user["sub"],
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
    # Alice
    token = generate_user_token(temporary_user)
    headers = {"Authorization": f"Bearer {token}"}
    client = APIClient(api_base_url, headers)
    client.user_id = temporary_user["id"]
    return client

@pytest.fixture
def user_b_client(api_base_url):
    # Bob
    user = {
        "sub": "auth0|user_b",
        "email": "user_b@example.com",
        "name": "User B",
        "jobGrade": 1
    }
    # We need to create this user in the DB to get an ID if we want to test sharing,
    # but for simple visibility tests we just need the token.
    token = generate_user_token(user)
    headers = {"Authorization": f"Bearer {token}"}
    return APIClient(api_base_url, headers)

def test_form_visibility_filtering(api_client, user_a_client, user_b_client):
    """
    Verify that forms are filtered based on permission records.
    1. Create Form A (private to Alice)
    2. Create Form B (public)
    3. Alice sees both.
    4. Bob only sees Form B.
    """
    # 1. Admin creates Form A
    form_a_resp = api_client.post("form", json={
        "name": "Private Form Alice",
        "is_template": False,
        "form_schema": {"version": 1, "components": []}
    }).json()
    form_a_id = form_a_resp["form_id"]

    # Make it private by deleting default EVERYONE permissions
    api_client.delete(f"form/{form_a_id}/permissions", params={"grantee_type": "EVERYONE"})

    # Grant Alice VIEW permission to Form A
    api_client.post(f"form/{form_a_id}/permissions", json=[{
        "grantee_type": "USER",
        "grantee_value": str(user_a_client.user_id),
        "action": "VIEW"
    }])

    # 2. Admin creates Form B
    form_b_resp = api_client.post("form", json={
        "name": "Public Form",
        "is_template": False,
        "form_schema": {"version": 1, "components": []}
    }).json()
    form_b_id = form_b_resp["form_id"]

    # Grant EVERYONE VIEW permission to Form B
    api_client.post(f"form/{form_b_id}/permissions", json=[{
        "grantee_type": "EVERYONE",
        "grantee_value": "all",
        "action": "VIEW"
    }])

    # 3. Alice lists forms
    alice_forms = user_a_client.get("form/list").json()["items"]
    alice_form_ids = [f["form_id"] for f in alice_forms]
    assert form_a_id in alice_form_ids
    assert form_b_id in alice_form_ids

    # 4. Bob lists forms
    bob_forms = user_b_client.get("form/list").json()["items"]
    bob_form_ids = [f["form_id"] for f in bob_forms]
    assert form_a_id not in bob_form_ids
    assert form_b_id in bob_form_ids

def test_instance_sharing(api_client, user_a_client, user_b_client, temporary_user_b):
    """
    Verify that an application instance can be shared with another user.
    1. Alice creates an application.
    2. Bob cannot see it.
    3. Alice shares it with Bob.
    4. Bob can see it.
    """
    form_pub_id = None
    workflow_id = None
    binding_id = None
    sn = None

    try:
        # Setup: Create a form and bind it to a workflow so Alice can submit
        form_resp = api_client.post("form", json={
            "name": "Shared Form",
            "is_template": False,
            "form_schema": {"root": [], "entities": {}}
        }).json()
        form_pub_id = form_resp["form_id"]
        form_rev_id = form_resp["revision"]["revision_id"]

        # Activate form
        api_client.patch(f"form/revisions/{form_rev_id}", json={"status": "ACTIVE"})

        # Grant Alice VIEW permission to Form so it's visible (but USE is now on workflow)
        api_client.post(f"form/{form_pub_id}/permissions", json=[{
            "grantee_type": "USER",
            "grantee_value": str(user_a_client.user_id),
            "action": "VIEW"
        }])

        workflow_resp = api_client.post("workflow", json={
            "name": "Simple Workflow"
        }).json()
        workflow_id = workflow_resp["workflow_id"]

        # Grant Alice USE and VIEW permission to Workflow
        api_client.post(f"workflow/{workflow_id}/permissions", json=[
            {
                "grantee_type": "USER",
                "grantee_value": str(user_a_client.user_id),
                "action": "USE"
            },
            {
                "grantee_type": "USER",
                "grantee_value": str(user_a_client.user_id),
                "action": "VIEW"
            }
        ])

        # Bind them first!
        binding_resp = api_client.post("bindings", json={
            "form_id": form_pub_id,
            "workflow_id": workflow_id
        }).json()
        binding_id = binding_resp["id"]

        # Now create and activate workflow revision
        workflow_rev_resp = api_client.post(f"workflow/{workflow_id}/revisions", json={
            "name": "V1",
            "flow_definition": {
                "version": 1,
                "nodes": [
                    {"key": "start", "type": "start", "next": "end"},
                    {"key": "end", "type": "end"}
                ]
            },
            "status": "ACTIVE"
        }).json()

        # 1. Alice creates application
        app_instance = user_a_client.post("applications", json={
            "binding_id": binding_id,
            "form_data": {}
        }).json()
        sn = app_instance["serial_number"]

        # 2. Bob tries to see it (using user_b_client with temporary_user_b credentials)
        # We need a client for temporary_user_b
        token_b = generate_user_token(temporary_user_b)
        user_b_actual_client = APIClient(user_b_client.base_url, {"Authorization": f"Bearer {token_b}"})

        bob_apps = user_b_actual_client.get("applications").json()["items"]
        assert not any(app["serial_number"] == sn for app in bob_apps)

        # 3. Alice shares with Bob
        user_a_client.post(f"applications/{sn}/shares", json=[{
            "user_id": temporary_user_b["id"],
            "reason": "Please review"
        }])

        # 4. Bob should NOT see it in default (submitted) list
        bob_apps_default = user_b_actual_client.get("applications").json()["items"]
        assert not any(app["serial_number"] == sn for app in bob_apps_default)

        # 5. Bob should see it in 'visible' list
        bob_apps_visible = user_b_actual_client.get("applications", params={"filter": "visible"}).json()["items"]
        assert any(app["serial_number"] == sn for app in bob_apps_visible)

    finally:
        # Cleanup order: App -> Binding -> Workflow -> Form
        if sn:
            try:
                api_client.delete(f"applications/{sn}/force")
            except: pass
        if binding_id:
            try:
                api_client.delete(f"bindings/{binding_id}")
            except: pass
        if workflow_id:
            try:
                api_client.delete(f"workflow/{workflow_id}/hard")
            except: pass
        if form_pub_id:
            try:
                api_client.delete(f"form/{form_pub_id}/hard")
            except: pass
