import json
import requests
import pytest
import logging
from typing import Dict, Any
from utils.id_generator import generate_public_id

debugging = False
log = logging.getLogger(__name__)

def test_create_workflow(api_base_url: str, admin_auth_headers: Dict[str, Any]):
    """
    Tests creating a new workflow.
    """
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_name = f"My Test Workflow {generate_public_id()}"
    create_payload = {
        "name": workflow_name
    }
    create_response = requests.post(workflow_endpoint, json=create_payload, headers=admin_auth_headers)
    assert create_response.status_code == 201
    workflow_created = create_response.json()

    log.info(f'{json.dumps(workflow_created, indent=4)}')

    assert workflow_created["revision"]["name"] == workflow_name
    assert workflow_created["revision"]["version"] == 1
    assert workflow_created["revision"]["status"] == "DRAFT"

def test_get_workflow(api_base_url: str, temporary_workflow_with_revisions: Dict[str, Any], admin_auth_headers: Dict[str, Any]):
    """
    Tests getting a workflow by ID.
    """
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_id = temporary_workflow_with_revisions["workflow_id"]

    get_response = requests.get(f"{workflow_endpoint}/{workflow_id}", headers=admin_auth_headers)
    assert get_response.status_code == 200
    fetched_workflow = get_response.json()

    log.info(f'{json.dumps(fetched_workflow, indent=4)}')

    assert fetched_workflow["id"] == workflow_id
    assert fetched_workflow["serial_prefix"] == "APP"

def test_list_workflows(api_base_url: str, temporary_workflow_with_revisions: Dict[str, Any], admin_auth_headers: Dict[str, Any]):
    """
    Tests listing all workflows.
    """
    workflow_endpoint = f"{api_base_url}/workflow/list"

    list_response = requests.get(workflow_endpoint, headers=admin_auth_headers)
    assert list_response.status_code == 200
    response_data = list_response.json()
    listed_workflows = response_data["items"]

    if (debugging):
        for wf in listed_workflows:
            print(f'workflow:\n{json.dumps(wf, indent=4)}')

    assert any(w["workflow_id"] == temporary_workflow_with_revisions["workflow_id"] for w in listed_workflows)

def test_create_workflow_revision(api_base_url: str, temporary_workflow: Dict[str, Any], admin_auth_headers: Dict[str, Any]):
    """
    Tests creating a new revision for a workflow.
    """
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_id = temporary_workflow["workflow_id"]

    v2_flow_definition = {
        "version": 1,
        "nodes": [
            {"key": "start", "type": "start", "next": "end"},
            {"key": "end", "type": "end"}
        ]
    }
    v2_payload = {
        "name": f"My Updated Workflow {generate_public_id()}",
        "status": "ACTIVE",
        "flow_definition": v2_flow_definition
    }

    v2_response = requests.post(f"{workflow_endpoint}/{workflow_id}/revisions", json=v2_payload, headers=admin_auth_headers)
    assert v2_response.status_code == 201
    v2_revision = v2_response.json()

    if (debugging):
        log.info(f'v2_revision: \n{json.dumps(v2_revision, indent=4)}')

    assert v2_revision["version"] == temporary_workflow["version"] + 1
    assert v2_revision["status"] == "ACTIVE"

def test_workflow_rebinding(
    api_base_url: str,
    temporary_form_workflow_binding: Dict[str, Any],
    second_temporary_form: Dict[str, Any],
    admin_auth_headers: Dict[str, Any],
    env: str,
):
    """
    Reproduce issue:
    1. get workflow detail (contains workflow and workflow revision) which has binding form
    2. update workflow binding (bind to a new form)
    3. get latest workflow detail and check the binding form.
    """

    if  env != "local":
        pytest.skip('test_workflow_rebinding is only for local testing')

    workflow_endpoint = f"{api_base_url}/workflow"
    binding_endpoint = f"{api_base_url}/bindings"

    workflow_id = temporary_form_workflow_binding["workflow_id"]
    binding_id = temporary_form_workflow_binding["id"]

    # 1. Verify initial binding exists
    wf_resp = requests.get(f"{workflow_endpoint}/{workflow_id}", headers=admin_auth_headers)
    assert wf_resp.status_code == 200
    assert "bindingForm" in wf_resp.json()

    if (debugging):
        print(f'Initial workflow detail: {json.dumps(wf_resp.json(), indent=4)}')

    # 2. Get Form B (from fixture)
    form_b_id = second_temporary_form["form_id"]

    # 3. Rebind to Form B
    # Create new binding
    binding_b_resp = requests.post(binding_endpoint, json={"form_id": form_b_id, "workflow_id": workflow_id}, headers=admin_auth_headers)
    assert binding_b_resp.status_code == 201
    binding_b = binding_b_resp.json()
    binding_b_id = binding_b["id"]
    if (debugging):
        log.info(f'## binding_b: {json.dumps(binding_b, indent=4)}')

    # 4. Verify Binding B (Reproduce Issue)
    # Retrieve the latest revision ID from the workflow
    wf_resp_2 = requests.get(f"{workflow_endpoint}/{workflow_id}", headers=admin_auth_headers)
    assert wf_resp_2.status_code == 200
    revision_id = wf_resp_2.json()["revision"]["revision_id"]

    get_rev_2 = requests.get(f"{workflow_endpoint}/revisions/{revision_id}", headers=admin_auth_headers)
    assert get_rev_2.status_code == 200
    data = get_rev_2.json()

    if (debugging):
        log.info(f'> fetched_revision_data: \n{json.dumps(data, indent=4)}')

    assert "bindingForm" in data
    assert data["bindingForm"]["id"] == form_b_id

    # Cleanup manually created binding
    requests.delete(f"{binding_endpoint}/{binding_b_id}", headers=admin_auth_headers)


def test_list_workflow_revisions(api_base_url: str, temporary_workflow_with_revisions: Dict[str, Any], admin_auth_headers: Dict[str, Any]):
    """
    Tests listing all revisions for a workflow.
    """
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_id = temporary_workflow_with_revisions["workflow_id"]

    if (debugging):
        print(f'{json.dumps(temporary_workflow_with_revisions)}')

    versions_response = requests.get(f"{workflow_endpoint}/{workflow_id}/revisions", headers=admin_auth_headers)
    assert versions_response.status_code == 200
    workflow_versions = versions_response.json()

    if (debugging):
        for f in workflow_versions:
            print(f'\n{json.dumps(f, indent=4)}')

    assert isinstance(workflow_versions, list)
    assert len(workflow_versions) == 2



def test_update_workflow_serial_prefix(
    api_base_url: str,
    temporary_workflow: Dict[str, Any],
    admin_auth_headers: Dict[str, Any],
):
    """
    Tests that an admin can update the serial_prefix of a workflow.
    """
    workflow_id = temporary_workflow["workflow_id"]
    workflow_endpoint = f"{api_base_url}/workflow"

    # Update prefix to "HR"
    update_response = requests.put(
        f"{workflow_endpoint}/{workflow_id}",
        json={"serial_prefix": "HR"},
        headers=admin_auth_headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["serial_prefix"] == "HR"

    # Verify invalid prefix is rejected: lowercase
    bad_response = requests.put(
        f"{workflow_endpoint}/{workflow_id}",
        json={"serial_prefix": "hr"},
        headers=admin_auth_headers,
    )
    assert bad_response.status_code == 400

    # Verify invalid prefix is rejected: too long (4 chars)
    bad_response2 = requests.put(
        f"{workflow_endpoint}/{workflow_id}",
        json={"serial_prefix": "ABCD"},
        headers=admin_auth_headers,
    )
    assert bad_response2.status_code == 400


def test_soft_delete_workflow(api_base_url: str, temporary_workflow: Dict[str, Any], admin_auth_headers: Dict[str, Any]):
    """
    Tests soft deleting a workflow.
    """
    workflow_id = temporary_workflow["workflow_id"]

    workflow_endpoint = f"{api_base_url}/workflow"

    # 1. Verify in list
    list_response = requests.get(f"{workflow_endpoint}/list", headers=admin_auth_headers)
    assert list_response.status_code == 200
    workflows = list_response.json()["items"]
    assert any(w["workflow_id"] == workflow_id for w in workflows)

    # 2. Delete
    delete_response = requests.delete(f"{workflow_endpoint}/{workflow_id}", headers=admin_auth_headers)
    assert 200 <= delete_response.status_code < 300

    # 3. Verify not in list
    list_response_after = requests.get(f"{workflow_endpoint}/list", headers=admin_auth_headers)
    assert list_response_after.status_code == 200
    workflows_after = list_response_after.json()["items"]
    assert not any(w["workflow_id"] == workflow_id for w in workflows_after)

    # TODO: 4. Verify Get returns 404
    # get_response = requests.get(f"{workflow_endpoint}/{workflow_id}", headers=admin_auth_headers)
    # assert get_response.status_code == 404

