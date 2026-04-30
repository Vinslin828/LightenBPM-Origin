import logging
import pytest
from api_client import APIClient

log = logging.getLogger(__name__)

DATASETS_ENDPOINT = "master-data"


def test_external_api_test_endpoint(api_client: APIClient):
    """
    Tests the external API test endpoint:
    1. Fire a test request to a public API
    2. Verify the raw JSON response is returned
    """
    response = api_client.post(
        f"{DATASETS_ENDPOINT}/external-api/test",
        json={
            "api_config": {
                "url": "https://jsonplaceholder.typicode.com/posts/1",
                "method": "GET",
            }
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 1
    assert "title" in data
    assert "body" in data
    assert data["userId"] == 1


def test_external_api_dataset_lifecycle(api_client: APIClient, request):
    """
    Tests the full lifecycle of an external API dataset:
    1. Test external API to get sample response
    2. Create external API dataset with field mappings
    3. Verify dataset definition includes source_type and config
    4. Query records (fetched from external API with mapping)
    5. Verify write operations are forbidden (read-only)
    6. Verify export is forbidden
    7. Update external config
    8. Delete dataset
    """
    dataset_code = "TEST_EXT_API_E2E"

    # Cleanup if exists
    api_client.delete(
        f"{DATASETS_ENDPOINT}/{dataset_code}", raise_for_status=False
    )

    # 1. Test the external API first
    test_response = api_client.post(
        f"{DATASETS_ENDPOINT}/external-api/test",
        json={
            "api_config": {
                "url": "https://jsonplaceholder.typicode.com/posts",
                "method": "GET",
            }
        },
    )
    assert test_response.status_code == 201
    sample_data = test_response.json()
    assert isinstance(sample_data, list)
    assert len(sample_data) > 0
    # Sample response structure: [{ id, userId, title, body }, ...]

    # 2. Create external API dataset with field mappings
    create_payload = {
        "code": dataset_code,
        "name": "External Posts",
        "source_type": "EXTERNAL_API",
        "fields": [
            {"name": "post_id", "type": "NUMBER", "required": True},
            {"name": "user_id", "type": "NUMBER", "required": True},
            {"name": "title", "type": "TEXT", "required": True},
            {"name": "content", "type": "TEXT", "required": False},
        ],
        "api_config": {
            "url": "https://jsonplaceholder.typicode.com/posts",
            "method": "GET",
        },
        "field_mappings": {
            "records_path": "",
            "mappings": [
                {"field_name": "post_id", "json_path": "id"},
                {"field_name": "user_id", "json_path": "userId"},
                {"field_name": "title", "json_path": "title"},
                {"field_name": "content", "json_path": "body"},
            ],
        },
    }
    response = api_client.post(DATASETS_ENDPOINT, json=create_payload)
    assert response.status_code == 201
    dataset = response.json()
    assert dataset["code"] == dataset_code
    assert dataset["source_type"] == "EXTERNAL_API"
    assert dataset["api_config"]["url"] == "https://jsonplaceholder.typicode.com/posts"
    assert dataset["api_config"]["method"] == "GET"
    assert len(dataset["field_mappings"]["mappings"]) == 4

    # 3. Verify dataset appears in list with source_type
    response = api_client.get(DATASETS_ENDPOINT)
    assert response.status_code == 200
    result = response.json()
    ext_dataset = next(
        (d for d in result["items"] if d["code"] == dataset_code), None
    )
    assert ext_dataset is not None
    assert ext_dataset["source_type"] == "EXTERNAL_API"

    # 4. Query records - should fetch from external API and apply mapping
    records_endpoint = f"{DATASETS_ENDPOINT}/{dataset_code}/records"
    response = api_client.get(records_endpoint, params={"_limit": 5})
    assert response.status_code == 200
    result = response.json()
    assert "items" in result
    assert "total" in result
    assert result["total"] > 0
    assert len(result["items"]) == 5

    # Verify mapping applied correctly
    first_record = result["items"][0]
    assert "post_id" in first_record
    assert "user_id" in first_record
    assert "title" in first_record
    assert "content" in first_record
    # post_id should be a number
    assert isinstance(first_record["post_id"], (int, float))

    # 4.1 Query with filter
    response = api_client.get(records_endpoint, params={"user_id": 1, "_limit": 100})
    assert response.status_code == 200
    result = response.json()
    for item in result["items"]:
        assert str(item["user_id"]) == "1" or item["user_id"] == 1

    # 4.2 Query with field selection
    response = api_client.get(
        records_endpoint, params={"_select": "post_id,title", "_limit": 3}
    )
    assert response.status_code == 200
    result = response.json()
    for item in result["items"]:
        assert "post_id" in item
        assert "title" in item
        assert "content" not in item
        assert "user_id" not in item

    # 5. Verify write operations are forbidden
    # POST (Create)
    response = api_client.post(
        records_endpoint,
        json={"post_id": 999, "title": "Hack"},
        raise_for_status=False,
    )
    assert response.status_code == 403
    assert "read-only" in response.json()["message"]

    # PATCH (Update)
    response = api_client.patch(
        records_endpoint,
        params={"post_id": 1},
        json={"title": "Modified"},
        raise_for_status=False,
    )
    assert response.status_code == 403
    assert "read-only" in response.json()["message"]

    # DELETE (Delete records)
    response = api_client.delete(
        records_endpoint, params={"post_id": 1}, raise_for_status=False
    )
    assert response.status_code == 403
    assert "read-only" in response.json()["message"]

    # 6. Export returns schema definition (GBPM-798: schema-only, EXTERNAL_API no longer blocked)
    response = api_client.get(f"{DATASETS_ENDPOINT}/{dataset_code}/export")
    assert response.status_code == 200
    export_data = response.json()
    assert export_data["definition"]["code"] == dataset_code
    assert export_data["definition"]["source_type"] == "EXTERNAL_API"
    assert "records" not in export_data

    # 7. Update external config
    response = api_client.patch(
        f"{DATASETS_ENDPOINT}/{dataset_code}/external-config",
        json={
            "api_config": {
                "url": "https://jsonplaceholder.typicode.com/posts",
                "method": "GET",
                "headers": {"Accept": "application/json"},
            }
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["api_config"]["headers"]["Accept"] == "application/json"

    # 8. Delete dataset
    if not request.config.getoption("--keep-data"):
        response = api_client.delete(f"{DATASETS_ENDPOINT}/{dataset_code}")
        assert response.status_code == 200

        # Verify deleted
        response = api_client.get(
            f"{DATASETS_ENDPOINT}/{dataset_code}", raise_for_status=False
        )
        assert response.status_code == 404


def test_external_api_dataset_with_nested_response(
    api_client: APIClient, request
):
    """
    Tests external API dataset with a nested response structure using records_path.
    Uses JSONPlaceholder /posts/1/comments which returns a flat array,
    but we can also test with a single post endpoint and records_path.
    """
    dataset_code = "TEST_EXT_COMMENTS_E2E"

    # Cleanup if exists
    api_client.delete(
        f"{DATASETS_ENDPOINT}/{dataset_code}", raise_for_status=False
    )

    # Create dataset for comments (flat array response, records_path = "")
    create_payload = {
        "code": dataset_code,
        "name": "External Comments",
        "source_type": "EXTERNAL_API",
        "fields": [
            {"name": "comment_id", "type": "NUMBER", "required": True},
            {"name": "post_id", "type": "NUMBER", "required": True},
            {"name": "commenter_name", "type": "TEXT", "required": True},
            {"name": "commenter_email", "type": "TEXT", "required": False},
        ],
        "api_config": {
            "url": "https://jsonplaceholder.typicode.com/posts/1/comments",
            "method": "GET",
        },
        "field_mappings": {
            "records_path": "",
            "mappings": [
                {"field_name": "comment_id", "json_path": "id"},
                {"field_name": "post_id", "json_path": "postId"},
                {"field_name": "commenter_name", "json_path": "name"},
                {"field_name": "commenter_email", "json_path": "email"},
            ],
        },
    }
    response = api_client.post(DATASETS_ENDPOINT, json=create_payload)
    assert response.status_code == 201

    # Query records
    records_endpoint = f"{DATASETS_ENDPOINT}/{dataset_code}/records"
    response = api_client.get(records_endpoint)
    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 5  # JSONPlaceholder returns 5 comments per post
    assert len(result["items"]) == 5

    # Verify nested field mapping
    first_comment = result["items"][0]
    assert "comment_id" in first_comment
    assert "post_id" in first_comment
    assert "commenter_name" in first_comment
    assert "commenter_email" in first_comment
    assert first_comment["post_id"] == 1  # All comments belong to post 1

    # Cleanup
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{DATASETS_ENDPOINT}/{dataset_code}")


def test_external_api_update_config_guard(api_client: APIClient, request):
    """
    Tests that update-external-config rejects non-external-API datasets.
    """
    dataset_code = "TEST_DB_DATASET_E2E"

    # Cleanup if exists
    api_client.delete(
        f"{DATASETS_ENDPOINT}/{dataset_code}", raise_for_status=False
    )

    # Create a regular DATABASE dataset
    create_payload = {
        "code": dataset_code,
        "name": "Regular DB Dataset",
        "fields": [{"name": "val", "type": "TEXT", "required": True}],
    }
    response = api_client.post(DATASETS_ENDPOINT, json=create_payload)
    assert response.status_code == 201
    assert response.json()["source_type"] == "DATABASE"

    # Try to update external config on a DATABASE dataset
    response = api_client.patch(
        f"{DATASETS_ENDPOINT}/{dataset_code}/external-config",
        json={
            "api_config": {
                "url": "https://example.com",
                "method": "GET",
            }
        },
        raise_for_status=False,
    )
    assert response.status_code == 400
    assert "not an external API dataset" in response.json()["message"]

    # Cleanup
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{DATASETS_ENDPOINT}/{dataset_code}")


def test_external_api_field_mapping_column_sync(api_client: APIClient, request):
    """
    GBPM-776: PATCH /:code/external-config must sync the fields list when
    field_mappings is updated.
    1. Create dataset with two mappings
    2. Add a new mapping → new column appears in definition and records
    3. Existing field type/required metadata is preserved
    4. Remove a mapping → field dropped from definition
    5. Update only api_config (no field_mappings) → fields unchanged
    """
    dataset_code = "TEST_EXT_MAPPING_SYNC_E2E"

    api_client.delete(f"{DATASETS_ENDPOINT}/{dataset_code}", raise_for_status=False)

    create_payload = {
        "code": dataset_code,
        "name": "Mapping Sync Test",
        "source_type": "EXTERNAL_API",
        "fields": [
            {"name": "post_id", "type": "NUMBER", "required": True},
            {"name": "title", "type": "TEXT", "required": True},
        ],
        "api_config": {
            "url": "https://jsonplaceholder.typicode.com/posts",
            "method": "GET",
        },
        "field_mappings": {
            "records_path": "",
            "mappings": [
                {"field_name": "post_id", "json_path": "id"},
                {"field_name": "title", "json_path": "title"},
            ],
        },
    }
    response = api_client.post(DATASETS_ENDPOINT, json=create_payload)
    assert response.status_code == 201
    initial_fields = [f["name"] for f in response.json()["fields"]]
    assert "post_id" in initial_fields
    assert "title" in initial_fields
    assert "user_id" not in initial_fields

    try:
        # 1. Add new mapping → new column synced into fields
        response = api_client.patch(
            f"{DATASETS_ENDPOINT}/{dataset_code}/external-config",
            json={
                "field_mappings": {
                    "records_path": "",
                    "mappings": [
                        {"field_name": "post_id", "json_path": "id"},
                        {"field_name": "title", "json_path": "title"},
                        {"field_name": "user_id", "json_path": "userId"},
                    ],
                }
            },
        )
        assert response.status_code == 200
        updated = response.json()
        field_names = [f["name"] for f in updated["fields"]]
        assert "user_id" in field_names

        # Existing field metadata preserved (post_id: NUMBER, required=True)
        post_id_field = next(f for f in updated["fields"] if f["name"] == "post_id")
        assert post_id_field["type"] == "NUMBER"
        assert post_id_field["required"] is True

        # New field defaults to TEXT / not-required
        user_id_field = next(f for f in updated["fields"] if f["name"] == "user_id")
        assert user_id_field["type"] == "TEXT"
        assert user_id_field["required"] is False

        # GET definition must reflect the sync
        response = api_client.get(f"{DATASETS_ENDPOINT}/{dataset_code}")
        assert response.status_code == 200
        assert "user_id" in [f["name"] for f in response.json()["fields"]]

        # Records must include the new column
        records_endpoint = f"{DATASETS_ENDPOINT}/{dataset_code}/records"
        response = api_client.get(records_endpoint, params={"_limit": 3})
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) > 0
        assert "user_id" in items[0]

        # 2. Remove a mapping → field dropped from fields
        response = api_client.patch(
            f"{DATASETS_ENDPOINT}/{dataset_code}/external-config",
            json={
                "field_mappings": {
                    "records_path": "",
                    "mappings": [
                        {"field_name": "post_id", "json_path": "id"},
                        {"field_name": "title", "json_path": "title"},
                    ],
                }
            },
        )
        assert response.status_code == 200
        field_names = [f["name"] for f in response.json()["fields"]]
        assert "user_id" not in field_names
        assert "post_id" in field_names

        # 3. Update only api_config → fields unchanged
        response = api_client.patch(
            f"{DATASETS_ENDPOINT}/{dataset_code}/external-config",
            json={
                "api_config": {
                    "url": "https://jsonplaceholder.typicode.com/posts",
                    "method": "GET",
                    "headers": {"Accept": "application/json"},
                }
            },
        )
        assert response.status_code == 200
        field_names = [f["name"] for f in response.json()["fields"]]
        assert "post_id" in field_names
        assert "title" in field_names
        assert "user_id" not in field_names

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{DATASETS_ENDPOINT}/{dataset_code}", raise_for_status=False)


def test_external_api_pagination(api_client: APIClient, request):
    """
    Tests in-memory pagination for external API datasets.
    """
    dataset_code = "TEST_EXT_PAGINATION_E2E"

    # Cleanup if exists
    api_client.delete(
        f"{DATASETS_ENDPOINT}/{dataset_code}", raise_for_status=False
    )

    # JSONPlaceholder /posts returns 100 posts
    create_payload = {
        "code": dataset_code,
        "name": "Paginated External Posts",
        "source_type": "EXTERNAL_API",
        "fields": [
            {"name": "post_id", "type": "NUMBER", "required": True},
            {"name": "title", "type": "TEXT", "required": True},
        ],
        "api_config": {
            "url": "https://jsonplaceholder.typicode.com/posts",
            "method": "GET",
        },
        "field_mappings": {
            "records_path": "",
            "mappings": [
                {"field_name": "post_id", "json_path": "id"},
                {"field_name": "title", "json_path": "title"},
            ],
        },
    }
    response = api_client.post(DATASETS_ENDPOINT, json=create_payload)
    assert response.status_code == 201

    records_endpoint = f"{DATASETS_ENDPOINT}/{dataset_code}/records"

    # Page 1 with limit 10
    response = api_client.get(
        records_endpoint, params={"_page": 1, "_limit": 10}
    )
    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 100
    assert len(result["items"]) == 10
    assert result["page"] == 1
    assert result["limit"] == 10
    assert result["totalPages"] == 10

    # Page 2
    response = api_client.get(
        records_endpoint, params={"_page": 2, "_limit": 10}
    )
    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 100
    assert len(result["items"]) == 10
    assert result["page"] == 2

    # Last page
    response = api_client.get(
        records_endpoint, params={"_page": 10, "_limit": 10}
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result["items"]) == 10

    # Cleanup
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{DATASETS_ENDPOINT}/{dataset_code}")
