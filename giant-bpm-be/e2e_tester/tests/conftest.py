import pytest
import json
import os
from typing import Dict, Any, Generator
import requests
from utils.id_generator import generate_public_id
from datetime import datetime, timedelta
from api_client import APIClient

basicFormSchemaPath = 'test_form_schema_basic.json'
basicWorkflowDefinitionPath = 'test_workflow_definition_basic.json'

def pytest_addoption(parser):
    parser.addoption(
        "--env", action="store", default="dev", help="Environment to run tests against"
    )
    parser.addoption(
        "--keep-data", action="store_true", default=False, help="Keep test data after tests run."
    )

@pytest.fixture(scope="session")
def env(request):
    return request.config.getoption("--env")

@pytest.fixture(scope="session")
def config(env: str) -> Dict[str, Any]:
    config_path = os.path.join(os.path.dirname(__file__), '..', 'environments', f'{env}.json')
    with open(config_path) as config_file:
        data = json.load(config_file)
    return data

@pytest.fixture(scope="session")
def api_base_url(config: Dict[str, Any]) -> str:
    return config["base_url"]

@pytest.fixture(scope="session")
def admin_auth_headers(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fixture to provide admin authentication headers.
    """
    admin_token = config["ADMIN_TOKEN"]
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="session")
def api_client(api_base_url: str, admin_auth_headers: Dict[str, Any]) -> APIClient:
    """
    Fixture to provide an API client.
    """
    return APIClient(api_base_url, admin_auth_headers)

def load_test_data(filename: str) -> Dict[str, Any]:
    """Helper to load JSON data from e2e_tester/data directory."""
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', filename)
    with open(data_path, 'r') as f:
        return json.load(f)

@pytest.fixture(scope="function")
def temporary_org_unit(api_client: APIClient, request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create and tear down a temporary organization unit for a test.
    """
    org_unit_endpoint = "org-units"
    org_unit_code = f"TEST_ORG_{generate_public_id().upper()}"
    org_unit_data = {
        "code": org_unit_code,
        "name": f"Test Org Unit {org_unit_code}",
        "type": "ORG_UNIT",
        "parentCode": None
    }

    # Create OrgUnit
    response = api_client.post(org_unit_endpoint, json=org_unit_data)
    assert 200 <= response.status_code < 300, "Failed to create temporary org unit"
    created_org_unit = response.json()

    yield created_org_unit

    # Teardown: delete OrgUnit
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{org_unit_endpoint}/{created_org_unit['id']}"
        try:
            api_client.delete(delete_endpoint)
        except requests.exceptions.HTTPError as e:
            # If the resource is already gone (404), it's not an error in this context.
            if e.response.status_code != 404:
                raise


@pytest.fixture(scope="function")
def temporary_user(api_client: APIClient, temporary_org_unit: Dict[str, Any], request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create and tear down a temporary user for a test.
    Ensures the user is created with a valid default_org_code.
    """
    user_endpoint = "users"
    user_uuid = generate_public_id()
    user_data = {
        "name": f"test-user-{user_uuid}",
        "sub": f"sub-{user_uuid}",
        "code": f"uc_{user_uuid}",
        "email": f"test.user.{user_uuid}@example.com",
        "jobGrade": 1,
        "defaultOrgCode": temporary_org_unit["code"]
    }

    # Create user
    response = api_client.post(user_endpoint, json=user_data)
    created_user = response.json()

    yield created_user

    # Teardown: delete user (ignore failures — test may have already deleted it)
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{user_endpoint}/{created_user['id']}/hard"
        api_client.delete(delete_endpoint, raise_for_status=False)


@pytest.fixture(scope="function")
def temporary_org_unit_b(api_client: APIClient, request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create and tear down a second temporary organization unit (B) for a test.
    """
    org_unit_endpoint = "org-units"
    org_unit_code = f"TEST_ORG_B_{generate_public_id().upper()}"
    org_unit_data = {
        "code": org_unit_code,
        "name": f"Test Org Unit B {org_unit_code}",
        "type": "ORG_UNIT",
        "parentCode": None
    }

    # Create OrgUnit
    response = api_client.post(org_unit_endpoint, json=org_unit_data)
    assert 200 <= response.status_code < 300, "Failed to create temporary org unit B"
    created_org_unit = response.json()

    yield created_org_unit

    # Teardown: delete OrgUnit
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{org_unit_endpoint}/{created_org_unit['id']}"
        try:
            api_client.delete(delete_endpoint)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code != 404:
                raise


@pytest.fixture(scope="function")
def temporary_user_b(api_client: APIClient, temporary_org_unit_b: Dict[str, Any], request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create and tear down a second temporary user (B) for a test.
    Uses temporary_org_unit_b as its default org.
    """
    user_endpoint = "users"
    user_uuid = generate_public_id()
    user_data = {
        "name": f"test-user-b-{user_uuid}",
        "sub": f"sub-b-{user_uuid}",
        "code": f"uc_b_{user_uuid}",
        "email": f"test.user.b.{user_uuid}@example.com",
        "jobGrade": 1,
        "defaultOrgCode": temporary_org_unit_b["code"]
    }

    # Create user
    response = api_client.post(user_endpoint, json=user_data)
    created_user = response.json()

    yield created_user

    # Teardown: delete user
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{user_endpoint}/{created_user['id']}/hard"
        api_client.delete(delete_endpoint)


@pytest.fixture(scope="function")
def temporary_org_membership(
    api_client: APIClient,
    temporary_user_b: Dict[str, Any],
    temporary_org_unit: Dict[str, Any],
    request: pytest.FixtureRequest,
) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create and tear down a temporary OrgMembership for a test.
    Uses temporary_user_b (from Org B) and temporary_org_unit (Org A) to avoid overlaps.
    """
    membership_endpoint = "org-units/memberships"
    start_date = datetime.now().isoformat(timespec='milliseconds') + 'Z'
    end_date = (datetime.now() + timedelta(days=365)).isoformat(timespec='milliseconds') + 'Z'

    membership_data = {
        "orgUnitCode": temporary_org_unit["code"],
        "userId": temporary_user_b["id"],
        "assignType": "USER",
        "startDate": start_date,
        "endDate": end_date,
        "note": "Test membership"
    }

    # Create membership
    response = api_client.post(membership_endpoint, json=membership_data)
    created_membership = response.json()

    yield created_membership

    # Teardown: delete membership
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{membership_endpoint}/{created_membership['id']}"
        try:
            api_client.delete(delete_endpoint)
        except requests.exceptions.HTTPError as e:
            # If the resource is already gone (404), it's not an error in this context.
            if e.response.status_code != 404:
                raise


@pytest.fixture(scope="function")
def temporary_form(api_client: APIClient, request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create a form with one active version, and clean it up.
    Cleanup can be skipped with the --keep-data flag.
    """
    form_endpoint = "form"
    form_schema = load_test_data(basicFormSchemaPath)

    # Create form
    form_name = f"My Test Form {generate_public_id()}"
    create_payload = {
        "name": form_name,
        "description": "A test form for E2E tests.",
        "form_schema": form_schema,
        "is_template": False,
    }
    create_response = api_client.post(form_endpoint, json=create_payload)
    v1_form = create_response.json()
    v1_revision_id = v1_form["revision"]["revision_id"]
    form_id = v1_form["form_id"]

    # Activate form
    patch_payload = {"status": "ACTIVE"}
    api_client.patch(f"{form_endpoint}/revisions/{v1_revision_id}", json=patch_payload)

    # Yield form version
    v1_read_response = api_client.get(f"{form_endpoint}/revisions/{v1_revision_id}")
    active_form_revision = v1_read_response.json()

    yield active_form_revision

    # Teardown
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{form_endpoint}/{form_id}/hard")

@pytest.fixture(scope="function")
def temporary_workflow(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
    request: pytest.FixtureRequest,
) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create a workflow with one active version, and clean it up.
    Requires a temporary_form to bind to before creating workflow revisions.
    """
    workflow_endpoint = "workflow"
    binding_endpoint = "bindings"

    # Step 1: Create workflow (parent only)
    workflow_name = f"My Test Workflow {generate_public_id()}"
    create_workflow_payload = {
        "name": workflow_name,
        "description": "A test workflow for E2E tests.",
    }
    create_workflow_response = api_client.post(workflow_endpoint, json=create_workflow_payload)
    workflow = create_workflow_response.json()
    workflow_id = workflow["workflow_id"]

    # Step 2: Create form-workflow binding
    binding_payload = {
        "form_id": temporary_form["form_id"],
        "workflow_id": workflow_id,
    }
    binding_response = api_client.post(binding_endpoint, json=binding_payload)
    binding = binding_response.json()
    binding_id = binding["id"]

    # Step 3: Create first revision (now with form binding)
    flow_definition = load_test_data(basicWorkflowDefinitionPath)

    create_revision_payload = {
        "name": workflow_name,
        "description": "A test workflow for E2E tests.",
        "flow_definition": flow_definition,
    }
    create_revision_response = api_client.post(f"{workflow_endpoint}/{workflow_id}/revisions", json=create_revision_payload)
    v1_revision = create_revision_response.json()
    v1_revision_id = v1_revision["revision_id"]

    # Step 4: Activate workflow revision
    patch_payload = {"status": "ACTIVE"}
    api_client.patch(f"{workflow_endpoint}/revisions/{v1_revision_id}", json=patch_payload)

    # Yield workflow revision
    v1_read_response = api_client.get(f"{workflow_endpoint}/revisions/{v1_revision_id}")
    active_workflow_revision = v1_read_response.json()

    yield active_workflow_revision

    # Teardown: delete binding, workflow revision
    if not request.config.getoption("--keep-data"):
        try:
            api_client.delete(f"{binding_endpoint}/{binding_id}")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code != 404:
                raise
        try:
            api_client.delete(f"{workflow_endpoint}/revisions/{v1_revision_id}")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code != 404:
                # raise
                print(f"\nWarning: could not delete workflow revision {v1_revision_id}: {e}")

@pytest.fixture(scope="function")
def temporary_form_workflow_binding(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
    temporary_workflow: Dict[str, Any],
    request: pytest.FixtureRequest,
) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create a form-workflow binding and clean it up.
    """
    binding_endpoint = "bindings"
    binding_payload = {
        "form_id": temporary_form["form_id"],
        "workflow_id": temporary_workflow["workflow_id"],
    }
    create_response = api_client.post(
        binding_endpoint, json=binding_payload
    )
    binding = create_response.json()
    binding_id = binding["id"]

    yield binding

    # Teardown: explicitly delete the binding
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{binding_endpoint}/{binding_id}"
        try:
            api_client.delete(delete_endpoint)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code != 404:
                raise

@pytest.fixture(scope="function")
def temporary_workflow_with_revisions(api_client: APIClient, temporary_form_with_revisions: Dict[str, Any], request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create a workflow with two revisions (one DRAFT, one ACTIVE).
    """
    workflow_endpoint = "workflow"
    binding_endpoint = "bindings"
    workflow_name = f"My Test Workflow {generate_public_id()}"
    create_payload = {
        "name": workflow_name
    }
    create_response = api_client.post(workflow_endpoint, json=create_payload)
    workflow_created = create_response.json()
    workflow_id = workflow_created["workflow_id"]

    print(f'workflow created: {workflow_id}')

    # Create form-workflow binding
    binding_payload = {
        "form_id": temporary_form_with_revisions["form_id"],
        "workflow_id": workflow_id,
    }
    binding_response = api_client.post(binding_endpoint, json=binding_payload)
    binding = binding_response.json()
    binding_id = binding["id"]

    # Create a second revision
    v2_flow_definition = load_test_data(basicWorkflowDefinitionPath)

    v2_payload = {
        "name": f"My Updated Workflow {generate_public_id()}",
        "description": "Updated Workflow Description",
        "status": "ACTIVE",
        "flow_definition": v2_flow_definition
    }
    api_client.post(f"{workflow_endpoint}/{workflow_id}/revisions", json=v2_payload)

    yield workflow_created

    # Teardown
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{binding_endpoint}/{binding_id}")
        api_client.delete(f"{workflow_endpoint}/{workflow_id}/hard")

@pytest.fixture(scope="function")
def temporary_form_with_revisions(api_client: APIClient, request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create a form with two revisions (one DRAFT, one ACTIVE).
    """
    form_endpoint = "form"
    form_name = f"My Test Form {generate_public_id()}"
    create_payload = {
        "name": form_name,
        "is_template": False,
    }
    create_response = api_client.post(form_endpoint, json=create_payload)
    form_created = create_response.json()
    form_id = form_created["form_id"]

    # Create a second revision
    form_schema = load_test_data(basicFormSchemaPath)

    form_revision_payload = {
        "name": form_name,
        "form_schema": form_schema,
        "status": "ACTIVE"
    }
    api_client.post(f"{form_endpoint}/{form_id}/revisions", json=form_revision_payload)

    yield form_created

    # Teardown
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{form_endpoint}/{form_id}/hard")

@pytest.fixture(scope="function")
def temporary_form_workflow_binding_with_revisions(
    api_client: APIClient,
    temporary_form_with_revisions: Dict[str, Any],
    temporary_workflow_with_revisions: Dict[str, Any],
    request: pytest.FixtureRequest,
) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create a form-workflow binding with revisions and clean it up.
    """
    binding_endpoint = "bindings"
    binding_payload = {
        "form_id": temporary_form_with_revisions["form_id"],
        "workflow_id": temporary_workflow_with_revisions["workflow_id"],
    }
    create_response = api_client.post(
        binding_endpoint, json=binding_payload
    )
    binding = create_response.json()
    binding_id = binding["id"]

    yield binding

    # Teardown: explicitly delete the binding
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{binding_endpoint}/{binding_id}"
        api_client.delete(delete_endpoint)


@pytest.fixture(scope="function")
def crud_test_form(api_client: APIClient, request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to set up and tear down a form for the main CRUD test.
    Creates a form and yields it. Deletes the form during teardown.
    Cleanup can be skipped with the --keep-data flag.
    """
    # Setup: Create the form
    create_form_endpoint = "form"
    form_name = f"My CRUD Test Form {generate_public_id()}"
    create_payload = {
        "name": form_name,
        "description": "A test form for the main CRUD E2E test.",
        "is_template": False,
    }
    create_response = api_client.post(create_form_endpoint, json=create_payload)
    v1_form = create_response.json()
    print(f"\nCRUD fixture: Created form {v1_form['form_id']}")

    yield v1_form

    # Teardown
    if not request.config.getoption("--keep-data"):
        form_id = v1_form.get("form_id")
        if form_id:
            print(f"\nCRUD fixture: Cleaning up form {form_id}")
            api_client.delete(f"form/{form_id}/hard")

@pytest.fixture(scope="function")
def temporary_tag(api_client: APIClient, request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create and tear down a temporary tag for a test.
    """
    tag_endpoint = "tags"
    tag_name = f"test-tag-{generate_public_id()}"
    tag_data = {"name": tag_name}

    # Create tag
    response = api_client.post(tag_endpoint, json=tag_data)
    created_tag = response.json()
    print(f"\nCreated temporary tag with ID: {created_tag['id']}")

    yield created_tag

    # Teardown: delete tag
    if not request.config.getoption("--keep-data"):
        print(f"\nCleaning up tag {created_tag['id']}")
        delete_endpoint = f"{tag_endpoint}/{created_tag['id']}"
        api_client.delete(delete_endpoint)

@pytest.fixture(scope="function")
def second_temporary_form(api_client: APIClient, request: pytest.FixtureRequest) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create a second temporary form for tests requiring two forms.
    Identical to temporary_form but provides a distinct instance.
    """
    form_endpoint = "form"
    form_schema = load_test_data(basicFormSchemaPath)

    # Create form
    form_name = f"My Second Test Form {generate_public_id()}"
    create_payload = {
        "name": form_name,
        "description": "A second test form for E2E tests.",
        "form_schema": form_schema,
        "is_template": False,
    }
    create_response = api_client.post(form_endpoint, json=create_payload)
    v1_form = create_response.json()
    v1_revision_id = v1_form["revision"]["revision_id"]
    form_id = v1_form["form_id"]

    # Activate form
    patch_payload = {"status": "ACTIVE"}
    api_client.patch(f"{form_endpoint}/revisions/{v1_revision_id}", json=patch_payload)

    # Yield form version
    v1_read_response = api_client.get(f"{form_endpoint}/revisions/{v1_revision_id}")
    active_form_revision = v1_read_response.json()

    yield active_form_revision

    # Teardown
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{form_endpoint}/{form_id}/hard")
