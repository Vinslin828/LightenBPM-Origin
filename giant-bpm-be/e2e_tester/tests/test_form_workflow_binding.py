import logging
import uuid
from typing import Dict, Any
from api_client import APIClient
import requests

log = logging.getLogger(__name__)

def test_create_form_workflow_binding(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
    temporary_workflow: Dict[str, Any],
):
    """
    Tests creating a form-workflow binding.
    """
    binding_endpoint = "bindings"
    form_id = temporary_form["form_id"]
    workflow_id = temporary_workflow["workflow_id"]

    binding_payload = {"form_id": form_id, "workflow_id": workflow_id}
    binding_response = api_client.post(
        binding_endpoint, json=binding_payload
    )
    binding = binding_response.json()

    assert binding["form_id"] == form_id
    assert binding["workflow_id"] == workflow_id

def test_get_bindings_by_form(
    api_client: APIClient,
    temporary_form_workflow_binding_with_revisions: Dict[str, Any],
    temporary_form_with_revisions: Dict[str, Any],
):
    """
    Tests retrieving bindings with a form_id filter.
    """
    binding_endpoint = "bindings"
    form_id = temporary_form_with_revisions["form_id"]

    get_by_form_response = api_client.get(binding_endpoint, params={"form_id": form_id})
    form_bindings = get_by_form_response.json()

    assert isinstance(form_bindings, list)
    assert len(form_bindings) >= 1
    assert any(b["form_id"] == form_id for b in form_bindings)

def test_get_bindings_by_workflow(
    api_client: APIClient,
    temporary_form_workflow_binding_with_revisions: Dict[str, Any],
    temporary_workflow_with_revisions: Dict[str, Any],
):
    """
    Tests retrieving bindings with a workflow_id filter.
    """
    binding_endpoint = "bindings"
    workflow_id = temporary_workflow_with_revisions["workflow_id"]

    get_by_workflow_response = api_client.get(
        binding_endpoint, params={"workflow_id": workflow_id}
    )
    workflow_bindings = get_by_workflow_response.json()

    assert isinstance(workflow_bindings, list)
    assert len(workflow_bindings) >= 1
    assert any(b["workflow_id"] == workflow_id for b in workflow_bindings)

def test_duplicate_binding_creation(
    api_client: APIClient,
    temporary_form_workflow_binding: Dict[str, Any],
    temporary_form: Dict[str, Any],
    temporary_workflow: Dict[str, Any],
):
    """
    Tests that creating a duplicate binding returns the existing object.
    """
    binding_endpoint = "bindings"
    form_id = temporary_form["form_id"]
    workflow_id = temporary_workflow["workflow_id"]

    binding_payload = {"form_id": form_id, "workflow_id": workflow_id}
    duplicate_response = api_client.post(
        binding_endpoint, json=binding_payload
    )
    duplicate_binding = duplicate_response.json()

    assert duplicate_binding["id"] == temporary_form_workflow_binding["id"]

def test_create_binding_with_invalid_data(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
    temporary_workflow: Dict[str, Any],
):
    """
    Tests creating a binding with invalid form or workflow IDs.
    """
    binding_endpoint = "bindings"
    form_id = temporary_form["form_id"]
    workflow_id = temporary_workflow["workflow_id"]
    invalid_id = "invalid-uuid-format"

    # Test with an invalid form_id
    payload_invalid_form = {"form_id": invalid_id, "workflow_id": workflow_id}
    try:
        api_client.post(binding_endpoint, json=payload_invalid_form)
        assert False, "Expected HTTPError for invalid form_id"
    except requests.exceptions.HTTPError as e:
        assert 400 <= e.response.status_code < 500

    # Test with an invalid workflow_id
    payload_invalid_workflow = {"form_id": form_id, "workflow_id": invalid_id}
    try:
        api_client.post(binding_endpoint, json=payload_invalid_workflow)
        assert False, "Expected HTTPError for invalid workflow_id"
    except requests.exceptions.HTTPError as e:
        assert 400 <= e.response.status_code < 500
