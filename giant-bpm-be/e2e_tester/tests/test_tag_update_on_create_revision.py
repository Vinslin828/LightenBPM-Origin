import logging
from utils.id_generator import generate_public_id
from typing import Dict, Any
from api_client import APIClient
import json

log = logging.getLogger(__name__)

def create_tag(api_client: APIClient, name: str) -> Dict[str, Any]:
    payload = {"name": name}
    response = api_client.post("tags", json=payload)
    assert response.status_code == 201
    return response.json()

def test_create_form_revision_with_tags(api_client: APIClient):
    """
    Tests updating tags when creating a new form revision.
    """
    # 1. Create a Form
    create_form_payload = {
        "name": f"Test Form {generate_public_id()}",
        "description": "Initial description",
        "form_schema": {},
        "is_template": False
    }
    form_res = api_client.post("form", json=create_form_payload)
    assert form_res.status_code == 201
    form_data = form_res.json()
    form_id = form_data["form_id"]

    # 2. Create Tags
    tag1 = create_tag(api_client, f"FormTag1-{generate_public_id()}")
    tag2 = create_tag(api_client, f"FormTag2-{generate_public_id()}")
    tag_ids = [tag1["id"], tag2["id"]]

    # 3. Create Revision with Tags
    create_rev_payload = {
        "name": f"Revision 2 {generate_public_id()}",
        "description": "Updated description",
        "tags": tag_ids
    }
    rev_res = api_client.post(f"form/{form_id}/revisions", json=create_rev_payload)
    assert rev_res.status_code == 201

    # 4. Verify Tags on Parent Form
    get_form_res = api_client.get(f"form/{form_id}")
    assert get_form_res.status_code == 200
    updated_form = get_form_res.json()

    log.info(f"Updated Form: {json.dumps(updated_form, indent=2)}")

    current_tag_ids = [t["id"] for t in updated_form["tags"]]
    assert set(current_tag_ids) == set(tag_ids)


def test_create_workflow_revision_with_tags(api_client: APIClient, temporary_form: Dict[str, Any]):
    """
    Tests updating tags when creating a new workflow revision.
    """
    # 1. Create a Workflow
    create_wf_payload = {
        "name": f"Test Workflow {generate_public_id()}"
    }
    wf_res = api_client.post("workflow", json=create_wf_payload)
    assert wf_res.status_code == 201
    wf_data = wf_res.json()
    workflow_id = wf_data["workflow_id"]

    # 2. Bind Workflow (Required for creating revisions)
    # The fixture 'temporary_form' provides a form we can bind to.
    form_id = temporary_form["form_id"]
    binding_payload = {
        "form_id": form_id,
        "workflow_id": workflow_id
    }
    # Note: Binding API usually takes public IDs if updated to do so, let's check binding payload structure.
    # Looking at test_workflow_management.py, it seems binding uses UUIDs in some places but let's check test_workflow_rebinding.
    # It sends {"form_id": form_b_id, "workflow_id": workflow_id}.

    bind_res = api_client.post("bindings", json=binding_payload)
    assert bind_res.status_code == 201

    # 3. Create Tags
    tag1 = create_tag(api_client, f"WFTag1-{generate_public_id()}")
    tag2 = create_tag(api_client, f"WFTag2-{generate_public_id()}")
    tag_ids = [tag1["id"], tag2["id"]]

    # 4. Create Revision with Tags
    create_rev_payload = {
        "name": f"WF Revision 2 {generate_public_id()}",
        "flow_definition": {
            "version": 1,
            "nodes": [
                {"key": "start", "type": "start", "next": "end"},
                {"key": "end", "type": "end"}
            ]
        },
        "tags": tag_ids,
        "status": "DRAFT"
    }
    rev_res = api_client.post(f"workflow/{workflow_id}/revisions", json=create_rev_payload)
    assert rev_res.status_code == 201

    # 5. Verify Tags on Parent Workflow
    # We might need to list workflows or get workflow detail to see tags.
    # WorkflowDto usually includes tags.
    get_wf_res = api_client.get(f"workflow/{workflow_id}")
    assert get_wf_res.status_code == 200
    updated_wf = get_wf_res.json()

    log.info(f"Updated Workflow: {json.dumps(updated_wf, indent=2)}")

    current_tag_ids = [t["id"] for t in updated_wf["tags"]]
    assert set(current_tag_ids) == set(tag_ids)
