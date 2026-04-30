"""
E2E Test: Validation Registry and Component Mapping

This test suite covers:
1. Validation Registry CRUD operations (POST/GET/PATCH/DELETE)
2. Component Mapping operations (PUT/GET/DELETE)
3. Complete response schema validation (all fields)
4. Inline component binding during create/update
5. Component binding behaviors (undefined vs empty array)
"""

import pytest
import requests
from utils.id_generator import generate_public_id
from typing import Dict, Any, Generator, Optional, List
from api_client import APIClient


# ============================================================================
# SCHEMA VALIDATION HELPERS
# ============================================================================

def validate_short_id(value: Any, field_name: str) -> None:
    """Validate that a value is a valid short ID string."""
    assert isinstance(value, str), f"{field_name} must be a string, got {type(value)}"
    # Expect prefix + 12 chars
    assert 12 <= len(value) <= 36, f"{field_name} length out of range: {len(value)} (value: {value})"


def validate_epoch_timestamp(value: Any, field_name: str) -> None:
    """Validate that a value is a valid epoch timestamp in milliseconds."""
    assert isinstance(value, int), f"{field_name} must be an integer, got {type(value)}"
    assert value > 0, f"{field_name} must be positive: {value}"
    # Reasonable range: 2020-01-01 to 2100-01-01
    assert 1577836800000 <= value <= 4102444800000, f"{field_name} is out of reasonable range: {value}"


def validate_validation_registry_response(
    data: Dict[str, Any],
    *,
    expected_name: Optional[str] = None,
    expected_validation_type: Optional[str] = None,
    expected_components: Optional[List[str]] = None,
    check_nullable_fields: bool = True,
) -> None:
    """
    Validate a ValidationRegistryResponseDto against the complete schema.

    This ensures complete serialization by checking:
    - All required fields exist
    - Field types are correct
    - UUIDs are valid
    - Timestamps are valid epoch milliseconds
    - Nullable fields are either None or the correct type
    - Arrays have correct structure
    """
    # Required fields (non-nullable)
    assert "id" in data, "Missing required field: id"
    validate_short_id(data["id"], "id")

    assert "name" in data, "Missing required field: name"
    assert isinstance(data["name"], str), f"name must be string, got {type(data['name'])}"
    if expected_name:
        assert data["name"] == expected_name, f"Expected name {expected_name}, got {data['name']}"

    assert "isActive" in data, "Missing required field: isActive"
    assert isinstance(data["isActive"], bool), f"isActive must be boolean, got {type(data['isActive'])}"

    assert "createdBy" in data, "Missing required field: createdBy"
    assert isinstance(data["createdBy"], int), f"createdBy must be integer, got {type(data['createdBy'])}"

    assert "updatedBy" in data, "Missing required field: updatedBy"
    assert isinstance(data["updatedBy"], int), f"updatedBy must be integer, got {type(data['updatedBy'])}"

    assert "createdAt" in data, "Missing required field: createdAt"
    validate_epoch_timestamp(data["createdAt"], "createdAt")

    assert "updatedAt" in data, "Missing required field: updatedAt"
    validate_epoch_timestamp(data["updatedAt"], "updatedAt")

    assert "components" in data, "Missing required field: components"
    assert isinstance(data["components"], list), f"components must be array, got {type(data['components'])}"
    for component in data["components"]:
        assert isinstance(component, str), f"component must be string, got {type(component)}"
    if expected_components is not None:
        assert sorted(data["components"]) == sorted(expected_components), \
            f"Expected components {expected_components}, got {data['components']}"

    # Nullable fields (must exist but can be None)
    if check_nullable_fields:
        assert "description" in data, "Missing nullable field: description"
        if data["description"] is not None:
            assert isinstance(data["description"], str), f"description must be string or None, got {type(data['description'])}"

        assert "validationType" in data, "Missing nullable field: validationType"
        if data["validationType"] is not None:
            assert data["validationType"] in ["CODE", "API"], f"Invalid validationType: {data['validationType']}"
        if expected_validation_type:
            assert data["validationType"] == expected_validation_type, \
                f"Expected validationType {expected_validation_type}, got {data['validationType']}"

        assert "validationCode" in data, "Missing nullable field: validationCode"
        if data["validationCode"] is not None:
            assert isinstance(data["validationCode"], str), f"validationCode must be string or None, got {type(data['validationCode'])}"

        assert "errorMessage" in data, "Missing nullable field: errorMessage"
        if data["errorMessage"] is not None:
            assert isinstance(data["errorMessage"], str), f"errorMessage must be string or None, got {type(data['errorMessage'])}"


def validate_component_mapping_response(data: Dict[str, Any], expected_validation_id: Optional[str] = None) -> None:
    """
    Validate a ComponentMappingResponseDto against the complete schema.
    """
    assert "id" in data, "Missing required field: id"
    validate_short_id(data["id"], "id")

    assert "validationId" in data, "Missing required field: validationId"
    validate_short_id(data["validationId"], "validationId")
    if expected_validation_id:
        assert data["validationId"] == expected_validation_id, \
            f"Expected validationId {expected_validation_id}, got {data['validationId']}"

    assert "component" in data, "Missing required field: component"
    assert isinstance(data["component"], str), f"component must be string, got {type(data['component'])}"

    assert "createdBy" in data, "Missing required field: createdBy"
    assert isinstance(data["createdBy"], int), f"createdBy must be integer, got {type(data['createdBy'])}"

    assert "createdAt" in data, "Missing required field: createdAt"
    validate_epoch_timestamp(data["createdAt"], "createdAt")


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture(scope="function")
def temporary_validation_registry(
    api_client: APIClient,
    request: pytest.FixtureRequest,
) -> Generator[Dict[str, Any], None, None]:
    """
    Fixture to create and tear down a temporary validation registry for a test.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    validation_data = {
        "name": f"test_validator_{unique_id}",
        "description": "Test validation rule",
        "validationType": "CODE",
        "validationCode": "function validate(value) { return value.length > 0; }",
        "errorMessage": "Value cannot be empty",
        "isActive": True,
    }

    # Create validation registry
    response = api_client.post(endpoint, json=validation_data)
    assert 200 <= response.status_code < 300, f"Failed to create temporary validation registry: {response.text}"
    created = response.json()

    # Validate complete response schema
    validate_validation_registry_response(created)

    yield created

    # Teardown: delete validation registry
    if not request.config.getoption("--keep-data"):
        delete_endpoint = f"{endpoint}/{created['id']}"
        try:
            api_client.delete(delete_endpoint)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code != 404:
                raise


# ============================================================================
# TEST: CREATE (POST)
# ============================================================================

def test_create_validation_registry_code_type(api_client: APIClient):
    """
    Test creating a CODE type validation rule.
    Verifies complete response serialization.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    request_data = {
        "name": f"email_validator_{unique_id}",
        "description": "Email format validator",
        "validationType": "CODE",
        "validationCode": "function validate(value) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }",
        "errorMessage": "Invalid email format",
        "isActive": True,
    }

    response = api_client.post(endpoint, json=request_data)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate complete schema
    validate_validation_registry_response(
        data,
        expected_name=request_data["name"],
        expected_validation_type="CODE",
        expected_components=[],
    )

    # Verify specific fields
    assert data["description"] == request_data["description"]
    assert data["validationCode"] == request_data["validationCode"]
    assert data["errorMessage"] == request_data["errorMessage"]
    assert data["isActive"] is True

    # Cleanup
    api_client.delete(f"{endpoint}/{data['id']}")


def test_create_validation_registry_with_components(api_client: APIClient):
    """
    Test creating a validation rule with inline component binding.
    Verifies components are included in response.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    request_data = {
        "name": f"text_validator_{unique_id}",
        "description": "Text field validator",
        "validationType": "CODE",
        "validationCode": "function validate(value) { return value.length >= 3; }",
        "errorMessage": "Minimum 3 characters",
        "isActive": True,
        "components": ["TextField", "TextArea", "EmailField"],
    }

    response = api_client.post(endpoint, json=request_data)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate complete schema with components
    validate_validation_registry_response(
        data,
        expected_name=request_data["name"],
        expected_validation_type="CODE",
        expected_components=["TextField", "TextArea", "EmailField"],
    )

    # Cleanup
    api_client.delete(f"{endpoint}/{data['id']}")


def test_create_validation_registry_incomplete(api_client: APIClient):
    """
    Test creating an incomplete validation rule (no validationType).
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    request_data = {
        "name": f"incomplete_validator_{unique_id}",
        "description": "Incomplete validation rule",
        "isActive": False,
    }

    response = api_client.post(endpoint, json=request_data)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate complete schema
    validate_validation_registry_response(data, expected_name=request_data["name"])

    # Verify incomplete status
    assert data["validationType"] is None
    assert data["validationCode"] is None

    # Cleanup
    api_client.delete(f"{endpoint}/{data['id']}")


def test_create_validation_registry_duplicate_name(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test creating a validation rule with duplicate name.
    Verifies 409 Conflict response.
    """
    endpoint = "validation-registry"
    request_data = {
        "name": temporary_validation_registry["name"],  # Duplicate name
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
    }

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.post(endpoint, json=request_data)

    assert exc.value.response.status_code == 409, f"Expected 409 Conflict, got {exc.value.response.status_code}"


def test_create_validation_registry_invalid_javascript_syntax(api_client: APIClient):
    """
    Test creating a validation rule with invalid JavaScript syntax.
    Verifies 400 Bad Request response with appropriate error message.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    request_data = {
        "name": f"invalid_syntax_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate(value { return true; }",  # Missing closing paren
    }

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.post(endpoint, json=request_data)

    assert exc.value.response.status_code == 400, f"Expected 400 Bad Request, got {exc.value.response.status_code}"
    error_response = exc.value.response.json()

    # Verify error message exists
    assert "message" in error_response, "Error response should have 'message' field"

    # Collect all error messages from 'message' and 'errors'
    all_messages = []
    if isinstance(error_response["message"], list):
        all_messages.extend(error_response["message"])
    else:
        all_messages.append(error_response["message"])

    if "errors" in error_response and isinstance(error_response["errors"], list):
        for err in error_response["errors"]:
            if isinstance(err, dict) and "message" in err:
                all_messages.append(err["message"])
            else:
                all_messages.append(str(err))

    # Check if any message contains validation-related keywords
    found = any("validationcode" in str(msg).lower() or "syntax" in str(msg).lower() or "javascript" in str(msg).lower() for msg in all_messages)
    assert found, f"Error message should mention validation code or syntax. Got: {error_response}"


def test_create_validation_registry_no_return_statement(api_client: APIClient):
    """
    Test creating a validation rule without return statement.
    Verifies 400 Bad Request response.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    request_data = {
        "name": f"no_return_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate(value) { console.log(value); }",  # No return
    }

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.post(endpoint, json=request_data)

    assert exc.value.response.status_code == 400, f"Expected 400 Bad Request, got {exc.value.response.status_code}"
    error_response = exc.value.response.json()

    # Verify error message exists
    assert "message" in error_response

    # Collect all error messages
    all_messages = []
    if isinstance(error_response["message"], list):
        all_messages.extend(error_response["message"])
    else:
        all_messages.append(error_response["message"])

    if "errors" in error_response and isinstance(error_response["errors"], list):
        for err in error_response["errors"]:
            if isinstance(err, dict) and "message" in err:
                all_messages.append(err["message"])
            else:
                all_messages.append(str(err))

    # Find error mentioning return statement
    return_errors = [msg for msg in all_messages if "return" in str(msg).lower()]
    assert len(return_errors) > 0, f"Should mention missing return statement. Got: {error_response}"


def test_create_validation_registry_empty_code(api_client: APIClient):
    """
    Test creating a validation rule with empty validation code.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    request_data = {
        "name": f"empty_code_{unique_id}",
        "validationType": "CODE",
        "validationCode": "",  # Empty code
    }

    response = api_client.post(endpoint, json=request_data)
    assert response.status_code == 201
    data = response.json()
    assert data["validationCode"] == ""

    # Cleanup
    api_client.delete(f"{endpoint}/{data['id']}")


def test_create_validation_registry_complex_valid_code(api_client: APIClient):
    """
    Test creating a validation rule with complex but valid JavaScript.
    Verifies the validator accepts valid complex code.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()
    request_data = {
        "name": f"complex_validator_{unique_id}",
        "description": "Complex validation logic",
        "validationType": "CODE",
        "validationCode": """
            function validate(value) {
                // Email validation with multiple checks
                if (!value || typeof value !== 'string') {
                    return false;
                }

                const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                if (!emailRegex.test(value)) {
                    return false;
                }

                const parts = value.split('@');
                if (parts[0].length < 1 || parts[1].length < 3) {
                    return false;
                }

                return true;
            }
        """,
        "errorMessage": "Invalid email format",
        "isActive": True,
    }

    response = api_client.post(endpoint, json=request_data)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"

    data = response.json()
    validate_validation_registry_response(data, expected_name=request_data["name"])

    # Cleanup
    api_client.delete(f"{endpoint}/{data['id']}")


def test_update_validation_registry_invalid_javascript(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test updating a validation rule with invalid JavaScript syntax.
    Verifies 400 Bad Request response.
    """
    endpoint = f"validation-registry/{temporary_validation_registry['id']}"
    update_data = {
        "validationCode": "function validate(value) { return true",  # Missing closing brace
    }

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.patch(endpoint, json=update_data)

    assert exc.value.response.status_code == 400, f"Expected 400 Bad Request, got {exc.value.response.status_code}"
    error_response = exc.value.response.json()

    # Verify error message exists
    assert "message" in error_response

    # Collect all error messages
    all_messages = []
    if isinstance(error_response["message"], list):
        all_messages.extend(error_response["message"])
    else:
        all_messages.append(error_response["message"])

    if "errors" in error_response and isinstance(error_response["errors"], list):
        for err in error_response["errors"]:
            if isinstance(err, dict) and "message" in err:
                all_messages.append(err["message"])
            else:
                all_messages.append(str(err))

    # Should have some validation errors
    assert len(all_messages) > 0, f"Expected some error messages. Got: {error_response}"


# ============================================================================
# TEST: READ (GET)
# ============================================================================

def test_get_validation_registry_list(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test getting paginated list of validation registries.
    Verifies pagination structure and complete item serialization.
    """
    endpoint = "validation-registry"
    response = api_client.get(endpoint, params={"page": 1, "limit": 10})
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate pagination structure
    assert "items" in data, "Missing pagination field: items"
    assert "total" in data, "Missing pagination field: total"
    assert "page" in data, "Missing pagination field: page"
    assert "limit" in data, "Missing pagination field: limit"
    assert "totalPages" in data, "Missing pagination field: totalPages"

    assert isinstance(data["items"], list), f"items must be array, got {type(data['items'])}"
    assert isinstance(data["total"], int), f"total must be integer, got {type(data['total'])}"
    assert isinstance(data["page"], int), f"page must be integer, got {type(data['page'])}"
    assert isinstance(data["limit"], int), f"limit must be integer, got {type(data['limit'])}"
    assert isinstance(data["totalPages"], int), f"totalPages must be integer, got {type(data['totalPages'])}"

    # Validate each item has complete schema
    assert len(data["items"]) > 0, "Expected at least one validation registry"
    for item in data["items"]:
        validate_validation_registry_response(item)


def test_get_validation_registry_by_id(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test getting a single validation registry by ID.
    Verifies complete response serialization.
    """
    endpoint = f"validation-registry/{temporary_validation_registry['id']}"
    response = api_client.get(endpoint)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate complete schema
    validate_validation_registry_response(
        data,
        expected_name=temporary_validation_registry["name"],
    )

    # Verify it matches the created one
    assert data["id"] == temporary_validation_registry["id"]


def test_get_validation_registry_not_found(api_client: APIClient):
    """
    Test getting a non-existent validation registry.
    Verifies 404 Not Found response.
    """
    dummy_id = generate_public_id()
    endpoint = f"validation-registry/{dummy_id}"

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.get(endpoint)

    assert exc.value.response.status_code == 404, f"Expected 404, got {exc.value.response.status_code}"


def test_get_validation_registry_with_filters(api_client: APIClient):
    """
    Test filtering validation registries by isActive and validationType.
    Verifies filtered results match criteria.
    """
    endpoint = "validation-registry"

    # Filter by validationType=CODE
    response = api_client.get(endpoint, params={"validationType": "CODE", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        validate_validation_registry_response(item)
        assert item["validationType"] == "CODE"


def test_get_validation_registry_filter_by_component(api_client: APIClient):
    """
    Test filtering validation registries by component type.
    Verifies only validation rules that support the specified component are returned.
    """
    endpoint_base = "validation-registry"
    unique_id = generate_public_id()

    # Create validation rule with TextField component
    text_validator_data = {
        "name": f"test_text_validator_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "components": ["TextField", "TextArea"],
    }
    text_response = api_client.post(endpoint_base, json=text_validator_data)
    text_validator = text_response.json()

    # Create validation rule with NumberField component (no TextField)
    number_validator_data = {
        "name": f"test_number_validator_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "components": ["NumberField"],
    }
    number_response = api_client.post(endpoint_base, json=number_validator_data)
    number_validator = number_response.json()

    # Create validation rule with no components
    no_component_data = {
        "name": f"test_no_component_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
    }
    no_component_response = api_client.post(endpoint_base, json=no_component_data)
    no_component_validator = no_component_response.json()

    try:
        # Filter by TextField - should return only text_validator
        response = api_client.get(endpoint_base, params={"component": "TextField", "limit": 100})
        assert response.status_code == 200
        data = response.json()

        # Verify pagination structure
        assert "items" in data
        assert "total" in data

        # Find our test validators in the results
        returned_ids = [item["id"] for item in data["items"]]

        # text_validator should be in results (has TextField)
        assert text_validator["id"] in returned_ids, "Validator with TextField should be returned"

        # number_validator should NOT be in results (doesn't have TextField)
        assert number_validator["id"] not in returned_ids, "Validator without TextField should not be returned"

        # no_component_validator should NOT be in results (has no components)
        assert no_component_validator["id"] not in returned_ids, "Validator with no components should not be returned"

        # Verify all returned items have TextField in their components
        text_validator_item = next((item for item in data["items"] if item["id"] == text_validator["id"]), None)
        assert text_validator_item is not None
        assert "TextField" in text_validator_item["components"]

        # Filter by NumberField - should return only number_validator
        response = api_client.get(endpoint_base, params={"component": "NumberField", "limit": 100})
        assert response.status_code == 200
        data = response.json()

        returned_ids = [item["id"] for item in data["items"]]
        assert number_validator["id"] in returned_ids
        assert text_validator["id"] not in returned_ids

        # Filter by non-existent component - should return empty or no matching results
        response = api_client.get(endpoint_base, params={"component": "NonExistentComponent", "limit": 100})
        assert response.status_code == 200
        data = response.json()

        returned_ids = [item["id"] for item in data["items"]]
        assert text_validator["id"] not in returned_ids
        assert number_validator["id"] not in returned_ids
        assert no_component_validator["id"] not in returned_ids

        # Combine component filter with other filters
        response = api_client.get(
            endpoint_base,
            params={"component": "TextField", "isActive": "true", "limit": 100}
        )
        assert response.status_code == 200
        data = response.json()

        # All returned items should have TextField and be active
        for item in data["items"]:
            if item["id"] == text_validator["id"]:
                assert "TextField" in item["components"]
                assert item["isActive"] is True

    finally:
        # Cleanup
        api_client.delete(f"{endpoint_base}/{text_validator['id']}")
        api_client.delete(f"{endpoint_base}/{number_validator['id']}")
        api_client.delete(f"{endpoint_base}/{no_component_validator['id']}")


def test_get_validation_registry_filter_by_name(api_client: APIClient):
    """
    Test filtering validation registries by name (partial match, case-insensitive).
    Verifies only validation rules matching the name pattern are returned.
    """
    endpoint_base = "validation-registry"
    unique_id = generate_public_id()

    # Create validation rules with different names
    email_validator_data = {
        "name": f"email_validator_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "description": "Email validation rule"
    }
    email_response = api_client.post(endpoint_base, json=email_validator_data)
    email_validator = email_response.json()

    phone_validator_data = {
        "name": f"phone_validator_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "description": "Phone validation rule"
    }
    phone_response = api_client.post(endpoint_base, json=phone_validator_data)
    phone_validator = phone_response.json()

    number_checker_data = {
        "name": f"number_checker_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "description": "Number validation rule"
    }
    number_response = api_client.post(endpoint_base, json=number_checker_data)
    number_checker = number_response.json()

    try:
        # Test 1: Filter by "email" - should return only email_validator
        response = api_client.get(endpoint_base, params={"name": "email", "limit": 100})
        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert "total" in data

        returned_ids = [item["id"] for item in data["items"]]
        assert email_validator["id"] in returned_ids, "Email validator should be returned"
        assert phone_validator["id"] not in returned_ids, "Phone validator should not be returned"
        assert number_checker["id"] not in returned_ids, "Number checker should not be returned"

        # Test 2: Filter by "validator" - should return email_validator and phone_validator
        response = api_client.get(endpoint_base, params={"name": "validator", "limit": 100})
        assert response.status_code == 200
        data = response.json()

        returned_ids = [item["id"] for item in data["items"]]
        assert email_validator["id"] in returned_ids, "Email validator should be returned"
        assert phone_validator["id"] in returned_ids, "Phone validator should be returned"
        assert number_checker["id"] not in returned_ids, "Number checker should not be returned (contains 'checker')"

        # Test 3: Filter by unique_id - should return all three
        response = api_client.get(endpoint_base, params={"name": unique_id, "limit": 100})
        assert response.status_code == 200
        data = response.json()

        returned_ids = [item["id"] for item in data["items"]]
        assert email_validator["id"] in returned_ids
        assert phone_validator["id"] in returned_ids
        assert number_checker["id"] in returned_ids

        # Test 4: Case-insensitive search - "EMAIL" should match "email_validator"
        response = api_client.get(endpoint_base, params={"name": "EMAIL", "limit": 100})
        assert response.status_code == 200
        data = response.json()

        returned_ids = [item["id"] for item in data["items"]]
        assert email_validator["id"] in returned_ids, "Search should be case-insensitive"

        # Test 5: Non-existent name - should return no matching results
        response = api_client.get(endpoint_base, params={"name": "nonexistent_xyz_123", "limit": 100})
        assert response.status_code == 200
        data = response.json()

        returned_ids = [item["id"] for item in data["items"]]
        assert email_validator["id"] not in returned_ids
        assert phone_validator["id"] not in returned_ids
        assert number_checker["id"] not in returned_ids

        # Test 6: Combine name filter with other filters
        response = api_client.get(
            endpoint_base,
            params={"name": "validator", "isActive": "true", "limit": 100}
        )
        assert response.status_code == 200
        data = response.json()

        # All returned items should match name pattern and be active
        for item in data["items"]:
            if item["id"] in [email_validator["id"], phone_validator["id"]]:
                assert "validator" in item["name"].lower()
                assert item["isActive"] is True

    finally:
        # Cleanup
        api_client.delete(f"{endpoint_base}/{email_validator['id']}")
        api_client.delete(f"{endpoint_base}/{phone_validator['id']}")
        api_client.delete(f"{endpoint_base}/{number_checker['id']}")


# ============================================================================
# TEST: UPDATE (PATCH)
# ============================================================================

def test_update_validation_registry_basic(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test updating basic fields of a validation registry.
    Verifies complete response and updated values.
    """
    endpoint = f"validation-registry/{temporary_validation_registry['id']}"
    update_data = {
        "description": "Updated description",
        "errorMessage": "Updated error message",
        "isActive": False,
    }

    response = api_client.patch(endpoint, json=update_data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate complete schema
    validate_validation_registry_response(data)

    # Verify updated fields
    assert data["description"] == update_data["description"]
    assert data["errorMessage"] == update_data["errorMessage"]
    assert data["isActive"] is False

    # Verify unchanged fields
    assert data["id"] == temporary_validation_registry["id"]
    assert data["name"] == temporary_validation_registry["name"]


def test_update_validation_registry_with_components(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test updating validation registry and setting components inline.
    Verifies components are updated and returned in response.
    """
    endpoint = f"validation-registry/{temporary_validation_registry['id']}"
    update_data = {
        "description": "Updated with components",
        "components": ["TextField", "NumberField"],
    }

    response = api_client.patch(endpoint, json=update_data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate complete schema with components
    validate_validation_registry_response(
        data,
        expected_components=["TextField", "NumberField"],
    )

    assert data["description"] == update_data["description"]


def test_update_validation_registry_clear_components(api_client: APIClient):
    """
    Test updating validation registry with empty components array.
    Verifies components are cleared (components: [] behavior).
    """
    endpoint_base = "validation-registry"
    unique_id = generate_public_id()

    # Create with components
    create_data = {
        "name": f"test_clear_components_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "components": ["TextField", "EmailField"],
    }
    response = api_client.post(endpoint_base, json=create_data)
    created = response.json()
    assert sorted(created["components"]) == sorted(["TextField", "EmailField"])

    # Update with empty array to clear
    update_data = {"components": []}
    response = api_client.patch(f"{endpoint_base}/{created['id']}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    validate_validation_registry_response(data, expected_components=[])

    # Cleanup
    api_client.delete(f"{endpoint_base}/{created['id']}")


def test_update_validation_registry_without_components_field(api_client: APIClient):
    """
    Test updating validation registry without components field.
    Verifies components remain unchanged (undefined behavior).
    """
    endpoint_base = "validation-registry"
    unique_id = generate_public_id()

    # Create with components
    create_data = {
        "name": f"test_unchanged_components_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "components": ["TextField"],
    }
    response = api_client.post(endpoint_base, json=create_data)
    created = response.json()
    assert created["components"] == ["TextField"]

    # Update without components field
    update_data = {"description": "Updated description only"}
    response = api_client.patch(f"{endpoint_base}/{created['id']}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    validate_validation_registry_response(data, expected_components=["TextField"])
    assert data["description"] == "Updated description only"

    # Cleanup
    api_client.delete(f"{endpoint_base}/{created['id']}")


def test_update_validation_registry_not_found(api_client: APIClient):
    """
    Test updating a non-existent validation registry.
    Verifies 404 Not Found response.
    """
    dummy_id = generate_public_id()
    endpoint = f"validation-registry/{dummy_id}"
    update_data = {"description": "This should fail"}

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.patch(endpoint, json=update_data)

    assert exc.value.response.status_code == 404


def test_update_validation_registry_duplicate_name(
    api_client: APIClient,
    temporary_validation_registry: Dict[str, Any],
):
    """
    Test updating validation registry to a duplicate name.
    Verifies 409 Conflict response.
    """
    endpoint_base = "validation-registry"
    unique_id = generate_public_id()

    # Create another validation registry
    create_data = {
        "name": f"another_validator_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
    }
    response = api_client.post(endpoint_base, json=create_data)
    another = response.json()

    try:
        # Try to update to duplicate name
        update_data = {"name": temporary_validation_registry["name"]}

        with pytest.raises(requests.exceptions.HTTPError) as exc:
            api_client.patch(f"{endpoint_base}/{another['id']}", json=update_data)

        assert exc.value.response.status_code == 409
    finally:
        # Cleanup
        api_client.delete(f"{endpoint_base}/{another['id']}")


# ============================================================================
# TEST: DELETE
# ============================================================================

def test_delete_validation_registry(api_client: APIClient):
    """
    Test deleting a validation registry.
    Verifies 204 No Content response and resource is deleted.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()

    # Create a validation registry
    create_data = {
        "name": f"test_delete_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
    }
    response = api_client.post(endpoint, json=create_data)
    created = response.json()

    # Delete it
    delete_response = api_client.delete(f"{endpoint}/{created['id']}")
    assert delete_response.status_code == 204, f"Expected 204, got {delete_response.status_code}"

    # Verify it's gone
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.get(f"{endpoint}/{created['id']}")
    assert exc.value.response.status_code == 404


def test_delete_validation_registry_with_components_cascade(api_client: APIClient):
    """
    Test deleting a validation registry with component bindings.
    Verifies cascade delete of component bindings.
    """
    endpoint = "validation-registry"
    unique_id = generate_public_id()

    # Create with components
    create_data = {
        "name": f"test_cascade_delete_{unique_id}",
        "validationType": "CODE",
        "validationCode": "function validate() { return true; }",
        "components": ["TextField", "EmailField"],
    }
    response = api_client.post(endpoint, json=create_data)
    created = response.json()
    validation_id = created["id"]

    # Verify components exist
    components_response = api_client.get(f"{endpoint}/{validation_id}/components")
    assert len(components_response.json()["items"]) == 2

    # Delete validation registry
    delete_response = api_client.delete(f"{endpoint}/{validation_id}")
    assert delete_response.status_code == 204

    # Verify validation registry is gone
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.get(f"{endpoint}/{validation_id}")
    assert exc.value.response.status_code == 404

    # Verify components are also gone (cascade delete)
    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.get(f"{endpoint}/{validation_id}/components")
    assert exc.value.response.status_code == 404


def test_delete_validation_registry_not_found(api_client: APIClient):
    """
    Test deleting a non-existent validation registry.
    Verifies 404 Not Found response.
    """
    dummy_id = generate_public_id()
    endpoint = f"validation-registry/{dummy_id}"

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.delete(endpoint)

    assert exc.value.response.status_code == 404


# ============================================================================
# TEST: COMPONENT MAPPING - PUT /validation-registry/:id/components
# ============================================================================

def test_set_components_replace_all(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test setting component bindings (PUT replaces all).
    Verifies complete component mapping response.
    """
    validation_id = temporary_validation_registry["id"]
    endpoint = f"validation-registry/{validation_id}/components"

    request_data = {
        "components": ["TextField", "EmailField", "PasswordField"],
    }

    response = api_client.put(endpoint, json=request_data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate response structure
    assert "items" in data, "Missing field: items"
    assert isinstance(data["items"], list), f"items must be array, got {type(data['items'])}"
    assert len(data["items"]) == 3

    # Validate each component mapping
    component_types = []
    for item in data["items"]:
        validate_component_mapping_response(item, expected_validation_id=validation_id)
        component_types.append(item["component"])

    assert sorted(component_types) == sorted(["TextField", "EmailField", "PasswordField"])


def test_set_components_empty_array(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test setting components to empty array (clear all).
    Verifies all bindings are removed.
    """
    validation_id = temporary_validation_registry["id"]
    endpoint = f"validation-registry/{validation_id}/components"

    # First set some components
    api_client.put(endpoint, json={"components": ["TextField", "EmailField"]})

    # Then clear them
    response = api_client.put(endpoint, json={"components": []})
    assert response.status_code == 200

    data = response.json()
    assert data["items"] == []


def test_set_components_idempotent(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test that setting components is idempotent.
    Verifies calling PUT twice with same data produces same result.
    """
    validation_id = temporary_validation_registry["id"]
    endpoint = f"validation-registry/{validation_id}/components"

    request_data = {"components": ["TextField", "NumberField"]}

    # First call
    response1 = api_client.put(endpoint, json=request_data)
    data1 = response1.json()

    # Second call (idempotent)
    response2 = api_client.put(endpoint, json=request_data)
    data2 = response2.json()

    # Should have same number of items
    assert len(data1["items"]) == len(data2["items"])

    # Component types should match
    types1 = sorted([item["component"] for item in data1["items"]])
    types2 = sorted([item["component"] for item in data2["items"]])
    assert types1 == types2


def test_set_components_validation_not_found(api_client: APIClient):
    """
    Test setting components for non-existent validation registry.
    Verifies 404 Not Found response.
    """
    dummy_id = generate_public_id()
    endpoint = f"validation-registry/{dummy_id}/components"

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.put(endpoint, json={"components": ["TextField"]})

    assert exc.value.response.status_code == 404


# ============================================================================
# TEST: COMPONENT MAPPING - GET /validation-registry/:id/components
# ============================================================================

def test_get_components(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test getting component bindings for a validation registry.
    Verifies complete response structure.
    """
    validation_id = temporary_validation_registry["id"]
    endpoint = f"validation-registry/{validation_id}/components"

    # Set some components first
    api_client.put(endpoint, json={"components": ["TextField", "EmailField"]})

    # Get components
    response = api_client.get(endpoint)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate response structure
    assert "items" in data, "Missing field: items"
    assert isinstance(data["items"], list), f"items must be array, got {type(data['items'])}"
    assert len(data["items"]) == 2

    # Validate each component mapping
    for item in data["items"]:
        validate_component_mapping_response(item, expected_validation_id=validation_id)


def test_get_components_empty(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test getting components when none are set.
    Verifies empty array response.
    """
    validation_id = temporary_validation_registry["id"]
    endpoint = f"validation-registry/{validation_id}/components"

    response = api_client.get(endpoint)
    assert response.status_code == 200

    data = response.json()
    assert data["items"] == []


def test_get_components_validation_not_found(api_client: APIClient):
    """
    Test getting components for non-existent validation registry.
    Verifies 404 Not Found response.
    """
    dummy_id = generate_public_id()
    endpoint = f"validation-registry/{dummy_id}/components"

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.get(endpoint)

    assert exc.value.response.status_code == 404


# ============================================================================
# TEST: COMPONENT MAPPING - DELETE /validation-registry/:id/components/:type
# ============================================================================

def test_delete_component_binding(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test deleting a specific component binding.
    Verifies 204 No Content and binding is removed.
    """
    validation_id = temporary_validation_registry["id"]
    components_endpoint = f"validation-registry/{validation_id}/components"

    # Set components first
    api_client.put(components_endpoint, json={"components": ["TextField", "EmailField", "NumberField"]})

    # Delete one component
    delete_endpoint = f"{components_endpoint}/TextField"
    response = api_client.delete(delete_endpoint)
    assert response.status_code == 204, f"Expected 204, got {response.status_code}"

    # Verify only 2 components remain
    get_response = api_client.get(components_endpoint)
    data = get_response.json()
    assert len(data["items"]) == 2

    component_types = [item["component"] for item in data["items"]]
    assert "TextField" not in component_types
    assert "EmailField" in component_types
    assert "NumberField" in component_types


def test_delete_component_binding_not_found(api_client: APIClient, temporary_validation_registry: Dict[str, Any]):
    """
    Test deleting a non-existent component binding.
    Verifies 404 Not Found response.
    """
    validation_id = temporary_validation_registry["id"]
    endpoint = f"validation-registry/{validation_id}/components/NonExistentComponent"

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.delete(endpoint)

    assert exc.value.response.status_code == 404


def test_delete_component_validation_not_found(api_client: APIClient):
    """
    Test deleting component for non-existent validation registry.
    Verifies 404 Not Found response.
    """
    dummy_id = generate_public_id()
    endpoint = f"validation-registry/{dummy_id}/components/TextField"

    with pytest.raises(requests.exceptions.HTTPError) as exc:
        api_client.delete(endpoint)

    assert exc.value.response.status_code == 404
