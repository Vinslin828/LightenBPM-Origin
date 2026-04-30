import logging
import uuid
from typing import Dict, Any
from api_client import APIClient
from requests import Response
import json

debugging = False # debugging flag, set true for more info
log = logging.getLogger(__name__)

def _assert_revision_equals(
    revision_1: Dict[str, Any], revision_2: Dict[str, Any]
):
    """
    Asserts that two form revision DTOs are equal.
    """
    assert revision_1["revision_id"] == revision_2["revision_id"]
    assert revision_1["name"] == revision_2["name"]
    assert revision_1["description"] == revision_2["description"]
    assert revision_1["version"] == revision_2["version"]
    assert revision_1["status"] == revision_2["status"]
    assert revision_1.get("validation") == revision_2.get("validation")
    assert revision_1["created_by"] == revision_2["created_by"]
    assert revision_1["created_at"] == revision_2["created_at"]


def _assert_form_equals(form_1: Dict[str, Any], form_2: Dict[str, Any]):
    """
    Asserts that two form DTOs are equal.
    """
    assert form_1["is_template"] == form_2["is_template"]
    assert form_1["is_active"] == form_2["is_active"]
    assert form_1["tags"] == form_2["tags"]
    _assert_revision_equals(form_1["revision"], form_2["revision"])

def _assert_success_response(response: Response):
    assert 200 <= response.status_code < 300

def test_form_crud(api_client: APIClient, crud_test_form: Dict[str, Any]):
    """
    Tests new form CRUD
    """
    # The 'crud_test_form' fixture handles the creation of the initial form.
    v1_form = crud_test_form
    log.info(f"FORM CREATED BY FIXTURE!\n v1_form =\n{json.dumps(v1_form, indent=4)}")

    # Initial state assertions
    assert v1_form["revision"]["name"] is not None
    assert v1_form["revision"]["version"] == 1
    assert v1_form["revision"]["status"] == "DRAFT"

    form_id = v1_form["form_id"]

    # Read
    """
    Read APIs
    """
    # Get Form
    get_form_endpoint = f"form/{form_id}"
    get_response = api_client.get(get_form_endpoint)
    _assert_success_response(get_response)

    received = get_response.json()
    log.info(f'Get Form:\n{json.dumps(received, indent=4)}')
    assert received["id"] == form_id
    _assert_form_equals(v1_form, received)

    v1_revision_id = v1_form["revision"]["revision_id"]
    # Get Form Revision
    get_form_rev_endpoint = f"form/revisions/{v1_revision_id}"
    get_response = api_client.get(get_form_rev_endpoint)
    _assert_success_response(get_response)

    received = get_response.json()
    log.info(f"GET REVISION({v1_revision_id}):\n{json.dumps(received, indent=4)}")
    _assert_revision_equals(v1_form['revision'], received)

    # Update
    """
    Related APIs
    """
    update_form_name = v1_form["revision"]["name"] + "_v2_updated"
    update_form_desc =  "A test updated form for E2E tests."
    # Create New Form Revision
    create_form_revision_endpoint = f"form/{form_id}/revisions"
    validation_payload = {
        "required": True,
        "validators": [
            {
                "key": "validator_1",
                "listenFieldIds": ["field_1"],
                "code": "function validation() { return true; }",
                "errorMessage": "Test Error"
            }
        ]
    }
    create_payload = {
        "name": v1_form['revision']['name'],
        "description": update_form_desc,
        "status": "DRAFT",
        "validation": validation_payload
    }
    res = api_client.post(create_form_revision_endpoint, json = create_payload)
    _assert_success_response(res)

    rev2 = res.json()
    log.info(f"revision_2:\n{json.dumps(rev2, indent=4)}")

    assert rev2['form_id'] == form_id
    assert rev2['version'] == v1_form["revision"]["version"] + 1
    assert rev2['name'] == v1_form['revision']['name']
    assert rev2['validation'] == validation_payload

    rev_id = rev2['revision_id']
    # Update Form Revision
    patch_revision_endpoint = f"form/revisions/{rev_id}"
    patch_payload = {
        "name": update_form_name,
        "status": "ACTIVE",
        "validation": {}
    }
    patch_response = api_client.patch(patch_revision_endpoint, json=patch_payload)
    _assert_success_response(patch_response)

    patched_rev = patch_response.json()
    log.info(f"patched_rev2:\n{json.dumps(patched_rev, indent=4)}")

    assert patched_rev["revision_id"] == rev_id
    assert patched_rev["name"] == patch_payload["name"]
    assert patched_rev["status"] == patch_payload["status"]
    assert patched_rev["description"] == rev2["description"]
    assert patched_rev["validation"] is None or patched_rev["validation"] == {}

    # Revisions List API
    list_rev_endpoint = f"form/{form_id}/revisions"
    res = api_client.get(list_rev_endpoint)
    _assert_success_response(res)

    revisions = res.json()
    log.info(f'--- All {len(revisions)} revisions ---')
    if (debugging):
        for rev in revisions:
            log.info(f"\n{json.dumps(rev, indent=4)}")

    assert len(revisions) == 2

    # Teardown is handled by the 'crud_test_form' fixture

def test_list_forms(api_client: APIClient, temporary_form: Dict[str, Any]):
    """
    Tests listing all forms.
    """
    form_endpoint = "form/list"

    list_response = api_client.get(form_endpoint)
    response_data = list_response.json()
    forms = response_data["items"]

    log.info(f'--- All ${len(forms)} forms ---')
    if (debugging):
        for f in forms:
            log.info(f"\n{json.dumps(f, indent=4)}")

    assert any(f["form_id"] == temporary_form["form_id"] for f in forms)

def test_soft_delete_form(api_client: APIClient, temporary_form: Dict[str, Any]):
    """
    Tests soft deleting a form.
    """
    form_id = temporary_form["form_id"]
    form_endpoint = f"form/{form_id}"

    # 1. Verify in list
    list_response = api_client.get("form/list")
    forms = list_response.json()["items"]
    assert any(f["form_id"] == form_id for f in forms)

    # 2. Delete
    delete_response = api_client.delete(form_endpoint)
    _assert_success_response(delete_response)

    # 3. Verify not in list
    list_response_after = api_client.get("form/list")
    forms_after = list_response_after.json()["items"]
    assert not any(f["form_id"] == form_id for f in forms_after)

    # TODO: 4. Verify Get returns 404
    # get_response = api_client.get(form_endpoint)
    # assert get_response.status_code == 404
