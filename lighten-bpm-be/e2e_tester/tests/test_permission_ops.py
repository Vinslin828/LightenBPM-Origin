import pytest
import requests
from typing import Dict, Any
from api_client import APIClient
from utils.id_generator import generate_public_id

def test_form_permission_batch_and_query_delete(api_client: APIClient, temporary_user: Dict[str, Any], temporary_user_b: Dict[str, Any]):
    """
    Test batch addition and query-based deletion of form permissions.
    """
    # 1. Create a form
    form_resp = api_client.post("form", json={
        "name": f"Batch Test Form {generate_public_id()}",
        "is_template": False,
        "form_schema": {"version": 1, "components": []}
    }).json()
    form_id = form_resp["form_id"]

    try:
        # 2. Batch add permissions for User A and User B
        permissions_payload = [
            {
                "grantee_type": "USER",
                "grantee_value": str(temporary_user["id"]),
                "action": "VIEW"
            },
            {
                "grantee_type": "USER",
                "grantee_value": str(temporary_user_b["id"]),
                "action": "VIEW"
            }
        ]
        add_resp = api_client.post(f"form/{form_id}/permissions", json=permissions_payload)
        assert add_resp.status_code == 201
        added_permissions = add_resp.json()
        assert len(added_permissions) == 2

        # 3. Verify permissions exist
        list_resp = api_client.get(f"form/{form_id}/permissions")
        permissions = list_resp.json()
        # Aggregated: one entry per unique grantee
        assert len(permissions) >= 2
        assert any(p["grantee_value"] == str(temporary_user["id"]) for p in permissions)
        assert any(p["grantee_value"] == str(temporary_user_b["id"]) for p in permissions)

        # 4. Delete permissions for User B by query
        delete_resp = api_client.delete(f"form/{form_id}/permissions", params={
            "grantee_type": "USER",
            "grantee_value": str(temporary_user_b["id"])
        })
        assert delete_resp.status_code == 204

        # 5. Verify User B permission is gone, User A remains
        list_resp_after = api_client.get(f"form/{form_id}/permissions")
        permissions_after = list_resp_after.json()
        assert not any(p["grantee_value"] == str(temporary_user_b["id"]) for p in permissions_after)
        assert any(p["grantee_value"] == str(temporary_user["id"]) for p in permissions_after)

        # 6. Delete all remaining permissions by query
        api_client.delete(f"form/{form_id}/permissions")
        list_resp_final = api_client.get(f"form/{form_id}/permissions")
        assert len(list_resp_final.json()) == 0

    finally:
        api_client.delete(f"form/{form_id}/hard")

def test_workflow_permission_batch_and_query_delete(api_client: APIClient, temporary_user: Dict[str, Any]):
    """
    Test batch addition and query-based deletion of workflow permissions.
    """
    # 1. Create a workflow
    wf_resp = api_client.post("workflow", json={
        "name": f"Batch Test Workflow {generate_public_id()}"
    }).json()
    workflow_id = wf_resp["workflow_id"]

    try:
        # 2. Batch add permissions (VIEW and USE) for User A
        # testing the normalize permission function in the mean time;
        # The view permission should be added as well, even if not included in the payload
        permissions_payload = [
            # {
            #     "grantee_type": "USER",
            #     "grantee_value": str(temporary_user["id"]),
            #     "action": "VIEW"
            # },
            {
                "grantee_type": "USER",
                "grantee_value": str(temporary_user["id"]),
                "action": "USE"
            }
        ]
        add_resp = api_client.post(f"workflow/{workflow_id}/permissions", json=permissions_payload)
        assert add_resp.status_code == 201
        assert len(add_resp.json()) == 2

        # 3. Delete USE permission by query
        api_client.delete(f"workflow/{workflow_id}/permissions", params={
            "grantee_value": str(temporary_user["id"]),
            "action": "USE"
        })

        # 4. Verify custom VIEW remains, plus defaults (EVERYONE:VIEW, EVERYONE:USE)
        permissions = api_client.get(f"workflow/{workflow_id}/permissions").json()
        # Aggregated: EVERYONE (VIEW, USE) and USER (VIEW)
        assert len(permissions) == 2
        assert any(p["grantee_type"] == "USER" and any(a["action"] == "VIEW" for a in p["actions"]) for p in permissions)

    finally:
        api_client.delete(f"workflow/{workflow_id}/hard")

def test_instance_share_batch_and_query_delete(api_client: APIClient, temporary_form_workflow_binding: Dict[str, Any], temporary_user: Dict[str, Any], temporary_user_b: Dict[str, Any]):
    """
    Test batch addition and query-based deletion of instance shares.
    """
    # 1. Create an application
    app_instance = api_client.post("applications", json={
        "binding_id": temporary_form_workflow_binding["id"],
        "form_data": {}
    }).json()
    sn = app_instance["serial_number"]

    try:
        # 2. Batch share with User A and User B
        shares_payload = [
            {"user_id": temporary_user["id"], "reason": "Batch 1"},
            {"user_id": temporary_user_b["id"], "reason": "Batch 2"}
        ]
        share_resp = api_client.post(f"applications/{sn}/shares", json=shares_payload)
        assert share_resp.status_code == 201
        assert len(share_resp.json()) == 2

        # 3. Verify shares exist
        shares = api_client.get(f"applications/{sn}/shares").json()
        # Aggregated: one entry per user
        assert len(shares) == 2

        # 4. Delete share for User A by query
        api_client.delete(f"applications/{sn}/shares", params={"user_id": temporary_user["id"]})

        # 5. Verify only User B share remains
        shares_after = api_client.get(f"applications/{sn}/shares").json()
        assert len(shares_after) == 1
        assert shares_after[0]["user_id"] == temporary_user_b["id"]

    finally:
        api_client.delete(f"applications/{sn}/force")
