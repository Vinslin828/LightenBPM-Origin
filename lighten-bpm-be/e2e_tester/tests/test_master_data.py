import logging
import pytest
import json
from api_client import APIClient

log = logging.getLogger(__name__)

def test_master_data_lifecycle(api_client: APIClient, request):
    """
    Tests the full lifecycle of Master Data:
    1. Create Dataset
    2. List Datasets
    3. Insert Records
    4. Query Records with Filter and Select
    5. Update Records
    6. Delete Records
    7. Delete Dataset
    8. Final Delete Dataset
    """
    dataset_code = "TEST_VENDORS_E2E"
    # Note: api_client base_url already includes /bpm prefix or full base URL.
    datasets_endpoint = "master-data"

    # Clean up if exists
    # Use raise_for_status=False to ignore 404 if it doesn't exist
    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    # 1. Create Dataset
    create_payload = {
        "code": dataset_code,
        "name": "Test Vendors",
        "fields": [
            {"name": "vendor_name", "type": "TEXT", "required": True},
            {"name": "tax_id", "type": "TEXT", "required": False},
            {"name": "score", "type": "NUMBER", "required": False}
        ]
    }
    response = api_client.post(datasets_endpoint, json=create_payload)
    assert response.status_code == 201
    dataset = response.json()
    assert dataset["code"] == dataset_code

    # 2. List Datasets
    response = api_client.get(datasets_endpoint)
    assert response.status_code == 200
    result = response.json()
    assert "items" in result
    assert "total" in result
    assert any(d["code"] == dataset_code for d in result["items"])

    # 3. Insert Records
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"

    record1 = {"vendor_name": "Vendor A", "tax_id": "TX001", "score": 95}
    response = api_client.post(records_endpoint, json=record1)
    assert response.status_code == 201
    r1 = response.json()
    assert r1["vendor_name"] == "Vendor A"
    assert float(r1["score"]) == 95

    record2 = {"vendor_name": "Vendor B", "tax_id": "TX002", "score": 80}
    api_client.post(records_endpoint, json=record2)

    # 4. Query Records
    # All records
    response = api_client.get(records_endpoint)
    result = response.json()
    assert "items" in result
    results = result["items"]
    assert len(results) >= 2

    # Filtered
    response = api_client.get(records_endpoint, params={"vendor_name": "Vendor A"})
    result = response.json()
    results = result["items"]
    assert len(results) == 1
    assert results[0]["tax_id"] == "TX001"

    # Selected fields
    response = api_client.get(records_endpoint, params={"_select": "vendor_name,score"})
    result = response.json()
    results = result["items"]
    assert "vendor_name" in results[0]
    assert "score" in results[0]
    assert "tax_id" not in results[0]

    # 5. Update Records
    update_payload = {"score": 100}
    response = api_client.patch(records_endpoint, params={"vendor_name": "Vendor A"}, json=update_payload)
    assert response.status_code == 200
    updated_records = response.json()
    assert len(updated_records) == 1
    assert float(updated_records[0]["score"]) == 100

    # 5.1 Test Patch with Number Column Filter (GBPM-624)
    # Vendor A now has score 100, let's update it to 105 by querying score=100
    update_payload_2 = {"tax_id": "TX001-UPDATED", "score": 105}
    response_num_filter = api_client.patch(records_endpoint, params={"score": 100}, json=update_payload_2)
    assert response_num_filter.status_code == 200
    updated_records_num = response_num_filter.json()
    assert len(updated_records_num) >= 1
    assert updated_records_num[0]["tax_id"] == "TX001-UPDATED"

    # 6. Delete Records
    response = api_client.delete(records_endpoint, params={"vendor_name": "Vendor B"})
    assert response.status_code == 200

    response = api_client.get(records_endpoint)
    result = response.json()
    results = result["items"]
    assert not any(r["vendor_name"] == "Vendor B" for r in results)

    # 7. Export/Import Test (GBPM-798: schema-only JSON export/import)
    export_response = api_client.get(f"{datasets_endpoint}/{dataset_code}/export")
    assert export_response.status_code == 200
    export_data = export_response.json()
    assert export_data["definition"]["code"] == dataset_code
    # Export is now schema-only — no records key in JSON response
    assert "records" not in export_data

    # Delete dataset before import test
    api_client.delete(f"{datasets_endpoint}/{dataset_code}")

    # Import schema — should create the dataset definition, no records
    import_response = api_client.post(f"{datasets_endpoint}/import", json=export_data)
    assert import_response.status_code == 201
    import_result = import_response.json()
    assert import_result["success"] is True
    assert import_result["definition"]["code"] == dataset_code

    # Idempotency: importing the same definition again is a no-op (no error)
    import_response2 = api_client.post(f"{datasets_endpoint}/import", json=export_data)
    assert import_response2.status_code == 201

    # 8. Final Delete Dataset
    if not request.config.getoption("--keep-data"):
        response = api_client.delete(f"{datasets_endpoint}/{dataset_code}")
        assert response.status_code == 200

        # Verify deleted - Expecting 404
        response = api_client.get(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)
        assert response.status_code == 404

def test_master_data_bulk_insert(api_client: APIClient, request):
    """
    Tests bulk insertion of records.
    """
    dataset_code = "TEST_VENDORS_E2E_BULK"
    datasets_endpoint = "master-data"

    # 1. Setup Dataset
    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    create_payload = {
        "code": dataset_code,
        "name": "Bulk Test",
        "fields": [
            {"name": "field_a", "type": "TEXT", "required": True},
            {"name": "field_b", "type": "NUMBER", "required": False}
        ]
    }
    api_client.post(datasets_endpoint, json=create_payload)

    # 2. Bulk Insert
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"
    bulk_data = [
        {"field_a": "Record 1", "field_b": 10},
        {"field_a": "Record 2", "field_b": 20},
        {"field_a": "Record 3", "field_b": 30}
    ]

    response = api_client.post(records_endpoint, json=bulk_data)
    assert response.status_code == 201
    results = response.json()
    assert len(results) == 3
    assert results[0]["field_a"] == "Record 1"
    assert results[1]["field_a"] == "Record 2"
    assert results[2]["field_a"] == "Record 3"

    # 3. Verify in Database
    response = api_client.get(records_endpoint)
    result = response.json()
    all_records = result["items"]
    assert len(all_records) >= 3

    # 4. Cleanup
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{datasets_endpoint}/{dataset_code}")

def test_master_data_pagination(api_client: APIClient, request):
    """
    Tests pagination for Master Data records.
    """
    dataset_code = "TEST_PAGINATION"
    datasets_endpoint = "master-data"

    # 1. Setup Dataset
    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    create_payload = {
        "code": dataset_code,
        "name": "Pagination Test",
        "fields": [
            {"name": "val", "type": "NUMBER", "required": True}
        ]
    }
    api_client.post(datasets_endpoint, json=create_payload)

    # 2. Insert 15 records
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"
    bulk_data = [{"val": i} for i in range(15)]
    api_client.post(records_endpoint, json=bulk_data)

    # 3. Test Page 1
    response = api_client.get(records_endpoint, params={"_page": 1, "_limit": 10})
    result = response.json()
    assert result["total"] == 15
    assert len(result["items"]) == 10
    assert result["page"] == 1
    assert result["limit"] == 10
    assert result["totalPages"] == 2

    # 4. Test Page 2
    response = api_client.get(records_endpoint, params={"_page": 2, "_limit": 10})
    result = response.json()
    assert result["total"] == 15
    assert len(result["items"]) == 5
    assert result["page"] == 2

    # 5. Cleanup
    if not request.config.getoption("--keep-data"):
        api_client.delete(f"{datasets_endpoint}/{dataset_code}")

def test_system_datasets(api_client: APIClient):
    """
    Tests the system datasets (USERS and ORG_UNITS):
    1. Retrieve schema for USERS
    2. Retrieve records for USERS
    3. Verify USERS records are read-only (block create, update, delete)
    4. Retrieve schema for ORG_UNITS
    5. Retrieve records for ORG_UNITS
    6. Verify ORG_UNITS records are read-only
    """
    datasets_endpoint = "master-data"

    # 1. Retrieve schema for USERS
    response = api_client.get(f"{datasets_endpoint}/USERS")
    assert response.status_code == 200
    schema = response.json()
    assert schema["code"] == "USERS"
    assert schema["name"] == "System Users"
    assert any(f["name"] == "code" for f in schema["fields"])
    assert any(f["name"] == "name" for f in schema["fields"])

    # 2. Retrieve records for USERS
    records_endpoint = f"{datasets_endpoint}/USERS/records"
    response = api_client.get(records_endpoint)
    assert response.status_code == 200
    result = response.json()
    assert "items" in result
    assert "total" in result
    # We should have at least the admin user from seeding
    assert len(result["items"]) >= 1
    assert "code" in result["items"][0]
    assert "name" in result["items"][0]

    # 3. Verify USERS records are read-only
    # POST (Create)
    response = api_client.post(records_endpoint, json={"code": "hack", "name": "Hack"}, raise_for_status=False)
    assert response.status_code == 403
    assert "read-only" in response.json()["message"]

    # PATCH (Update)
    response = api_client.patch(records_endpoint, params={"code": "admin"}, json={"name": "Modified"}, raise_for_status=False)
    assert response.status_code == 403
    assert "read-only" in response.json()["message"]

    # DELETE (Delete)
    response = api_client.delete(records_endpoint, params={"code": "admin"}, raise_for_status=False)
    assert response.status_code == 403
    assert "read-only" in response.json()["message"]

    # 4. Retrieve schema for ORG_UNITS
    response = api_client.get(f"{datasets_endpoint}/ORG_UNITS")
    assert response.status_code == 200
    schema = response.json()
    assert schema["code"] == "ORG_UNITS"
    assert schema["name"] == "System Organization Units"

    # 5. Retrieve records for ORG_UNITS
    records_endpoint = f"{datasets_endpoint}/ORG_UNITS/records"
    response = api_client.get(records_endpoint)
    assert response.status_code == 200
    result = response.json()
    assert len(result["items"]) >= 1
    assert "code" in result["items"][0]
    assert "name" in result["items"][0]

    # 6. Verify ORG_UNITS records are read-only
    response = api_client.post(records_endpoint, json={"code": "hack", "name": "Hack"}, raise_for_status=False)
    assert response.status_code == 403

    # 7. Verify system datasets appear in listDatasets
    response = api_client.get(datasets_endpoint)
    assert response.status_code == 200
    result = response.json()
    assert any(d["code"] == "USERS" for d in result["items"])
    assert any(d["code"] == "ORG_UNITS" for d in result["items"])

def test_master_data_update_name(api_client: APIClient, request):
    """
    Tests renaming a dataset's display name via PATCH /master-data/:code.
    """
    dataset_code = "TEST_RENAME_E2E"
    datasets_endpoint = "master-data"

    # Cleanup if exists
    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    # Create dataset
    create_payload = {
        "code": dataset_code,
        "name": "Original Name",
        "fields": [{"name": "val", "type": "TEXT", "required": False}]
    }
    response = api_client.post(datasets_endpoint, json=create_payload)
    assert response.status_code == 201

    try:
        # Rename it
        response = api_client.patch(
            f"{datasets_endpoint}/{dataset_code}",
            json={"name": "Renamed Dataset"}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["name"] == "Renamed Dataset"
        assert updated["code"] == dataset_code

        # Verify via GET
        response = api_client.get(f"{datasets_endpoint}/{dataset_code}")
        assert response.status_code == 200
        assert response.json()["name"] == "Renamed Dataset"

        # Cannot rename system dataset
        response = api_client.patch(
            f"{datasets_endpoint}/USERS",
            json={"name": "Hacked"},
            raise_for_status=False
        )
        assert response.status_code == 409

        # Cannot rename to an already-used name
        another_code = f"{dataset_code}_OTHER"
        api_client.delete(f"{datasets_endpoint}/{another_code}", raise_for_status=False)
        api_client.post(datasets_endpoint, json={
            "code": another_code,
            "name": "Taken Name",
            "fields": [{"name": "x", "type": "TEXT", "required": False}]
        })
        try:
            response = api_client.patch(
                f"{datasets_endpoint}/{dataset_code}",
                json={"name": "Taken Name"},
                raise_for_status=False
            )
            assert response.status_code == 409
        finally:
            api_client.delete(f"{datasets_endpoint}/{another_code}", raise_for_status=False)
    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)


def test_master_data_schema_update(api_client: APIClient, request):
    """
    Tests schema evolution via PATCH /master-data/:code/schema:
    1. Add a nullable column — existing records should have NULL
    2. Add a required column with default — existing records get the default
    3. Remove a column — gone from records and definition
    4. Validation errors: EXTERNAL_API, system dataset, non-existent field
    """
    dataset_code = "TEST_SCHEMA_UPDATE_E2E"
    datasets_endpoint = "master-data"
    schema_endpoint = f"{datasets_endpoint}/{dataset_code}/schema"
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"

    # Cleanup if exists
    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    # Create dataset with initial fields
    create_payload = {
        "code": dataset_code,
        "name": "Schema Update Test",
        "fields": [
            {"name": "vendor_name", "type": "TEXT", "required": True},
            {"name": "score", "type": "NUMBER", "required": False}
        ]
    }
    response = api_client.post(datasets_endpoint, json=create_payload)
    assert response.status_code == 201

    try:
        # Insert a record before any schema changes
        response = api_client.post(records_endpoint, json={"vendor_name": "Vendor A", "score": 90})
        assert response.status_code == 201

        # 1. Add a nullable column — existing records should have NULL
        response = api_client.patch(schema_endpoint, json={
            "add_fields": [{"name": "category", "type": "TEXT", "required": False}]
        })
        assert response.status_code == 200
        definition = response.json()
        field_names = [f["name"] for f in definition["fields"]]
        assert "category" in field_names

        # Existing record should have NULL for new nullable column
        response = api_client.get(records_endpoint)
        records = response.json()["items"]
        assert records[0].get("category") is None

        # 2. Add a required column with default — existing records get the default
        response = api_client.patch(schema_endpoint, json={
            "add_fields": [{
                "name": "status",
                "type": "TEXT",
                "required": True,
                "default_value": "active"
            }]
        })
        assert response.status_code == 200
        definition = response.json()
        field_names = [f["name"] for f in definition["fields"]]
        assert "status" in field_names

        # Existing record should have the default value
        response = api_client.get(records_endpoint)
        records = response.json()["items"]
        assert records[0]["status"] == "active"

        # 3. Remove a column
        response = api_client.patch(schema_endpoint, json={
            "remove_fields": ["score"]
        })
        assert response.status_code == 200
        definition = response.json()
        field_names = [f["name"] for f in definition["fields"]]
        assert "score" not in field_names

        # Records should not include removed column
        response = api_client.get(records_endpoint)
        records = response.json()["items"]
        assert "score" not in records[0]

        # 4. Add and remove in same request (atomic)
        response = api_client.patch(schema_endpoint, json={
            "add_fields": [{"name": "region", "type": "TEXT", "required": False}],
            "remove_fields": ["category"]
        })
        assert response.status_code == 200
        definition = response.json()
        field_names = [f["name"] for f in definition["fields"]]
        assert "region" in field_names
        assert "category" not in field_names

        # 5. Validation: empty body
        response = api_client.patch(schema_endpoint, json={}, raise_for_status=False)
        assert response.status_code == 400

        # 6. Validation: adding required column to table with data, no default_value
        response = api_client.patch(schema_endpoint, json={
            "add_fields": [{"name": "mandatory_field", "type": "TEXT", "required": True}]
        }, raise_for_status=False)
        assert response.status_code == 400

        # 7. Validation: remove non-existent field
        response = api_client.patch(schema_endpoint, json={
            "remove_fields": ["nonexistent_col"]
        }, raise_for_status=False)
        assert response.status_code == 400

        # 8. Validation: cannot modify system dataset
        response = api_client.patch(
            f"{datasets_endpoint}/USERS/schema",
            json={"add_fields": [{"name": "x", "type": "TEXT", "required": False}]},
            raise_for_status=False
        )
        assert response.status_code == 409

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)


def test_master_data_get_code_by_name(api_client: APIClient, request):
    """
    Tests querying dataset code by its name (GBPM-666).
    """
    datasets_endpoint = "master-data"

    # 1. Test system dataset
    response = api_client.get(f"{datasets_endpoint}/get-code/System Users")
    assert response.status_code == 200
    assert response.json()["code"] == "USERS"

    # 2. Test custom dataset
    dataset_code = "TEST_CODE_BY_NAME"
    dataset_name = "Test Code By Name Dataset"

    # Cleanup if exists
    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    create_payload = {
        "code": dataset_code,
        "name": dataset_name,
        "fields": [{"name": "f1", "type": "TEXT", "required": True}]
    }
    api_client.post(datasets_endpoint, json=create_payload)

    try:
        response = api_client.get(f"{datasets_endpoint}/get-code/{dataset_name}")
        assert response.status_code == 200
        assert response.json()["code"] == dataset_code

        # 3. Test non-existent name
        response = api_client.get(f"{datasets_endpoint}/get-code/Non Existent", raise_for_status=False)
        assert response.status_code == 404
    finally:
        # Cleanup
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}")


def test_master_data_field_defaults(api_client: APIClient, request):
    """
    GBPM-764: Tests default_value and unique constraint support.
    1. Create dataset with default_value fields
    2. INSERT omitting defaulted fields → defaults applied
    3. INSERT with explicit value → explicit wins
    4. Bulk INSERT omitting defaults → all rows get defaults
    5. GET definition → default_value present in fields response
    6. PATCH add unique column → duplicate insert rejected
    7. PATCH add required+unique column to table with rows → 400
    """
    dataset_code = "TEST_FIELD_DEFAULTS_E2E"
    datasets_endpoint = "master-data"
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"
    schema_endpoint = f"{datasets_endpoint}/{dataset_code}/schema"

    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    create_payload = {
        "code": dataset_code,
        "name": "Field Defaults Test",
        "fields": [
            {"name": "label", "type": "TEXT", "required": True},
            {"name": "status", "type": "TEXT", "required": False, "default_value": "pending"},
            {"name": "active", "type": "BOOLEAN", "required": False, "default_value": False},
        ]
    }
    response = api_client.post(datasets_endpoint, json=create_payload)
    assert response.status_code == 201
    definition = response.json()

    # default_value must be persisted in the creation response
    status_field = next(f for f in definition["fields"] if f["name"] == "status")
    assert status_field.get("default_value") == "pending"
    active_field = next(f for f in definition["fields"] if f["name"] == "active")
    assert active_field.get("default_value") is False

    try:
        # 1. INSERT omitting defaulted fields → defaults applied
        response = api_client.post(records_endpoint, json={"label": "row-one"})
        assert response.status_code == 201
        row = response.json()
        assert row["status"] == "pending"
        assert row["active"] is False

        # 2. INSERT with explicit value → explicit wins
        response = api_client.post(records_endpoint, json={
            "label": "row-two",
            "status": "done",
            "active": True,
        })
        assert response.status_code == 201
        row = response.json()
        assert row["status"] == "done"
        assert row["active"] is True

        # 3. Bulk INSERT omitting defaults → all rows get defaults
        bulk_data = [{"label": f"bulk-{i}"} for i in range(3)]
        response = api_client.post(records_endpoint, json=bulk_data)
        assert response.status_code == 201
        rows = response.json()
        assert len(rows) == 3
        assert all(r["status"] == "pending" for r in rows)
        assert all(r["active"] is False for r in rows)

        # 4. GET definition → default_value present in fields
        response = api_client.get(f"{datasets_endpoint}/{dataset_code}")
        assert response.status_code == 200
        status_field = next(f for f in response.json()["fields"] if f["name"] == "status")
        assert status_field.get("default_value") == "pending"

        # 5. PATCH add unique column → unique constraint enforced
        response = api_client.patch(schema_endpoint, json={
            "add_fields": [{"name": "ref_code", "type": "TEXT", "required": False, "unique": True}]
        })
        assert response.status_code == 200
        ref_field = next(f for f in response.json()["fields"] if f["name"] == "ref_code")
        assert ref_field.get("unique") is True

        response = api_client.post(records_endpoint, json={"label": "u-a", "ref_code": "REF-001"})
        assert response.status_code == 201

        # Duplicate unique value → constraint violation (non-2xx)
        response = api_client.post(
            records_endpoint,
            json={"label": "u-b", "ref_code": "REF-001"},
            raise_for_status=False
        )
        assert response.status_code >= 400

        # 6. PATCH add required+unique column to table with rows → 400
        response = api_client.patch(schema_endpoint, json={
            "add_fields": [{
                "name": "strict_code",
                "type": "TEXT",
                "required": True,
                "unique": True,
                "default_value": "X"
            }]
        }, raise_for_status=False)
        assert response.status_code == 400

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)


def test_master_data_type_coercion(api_client: APIClient, request):
    """
    GBPM-771: Verifies that GET /master-data/{code}/records returns field values
    with their declared JavaScript types — not raw PostgreSQL strings.

    Asserts:
    - NUMBER field  → Python int or float (not str)
    - BOOLEAN field → Python bool (not str)
    - DATE field    → ISO-8601 string (not a Date object repr)
    - null values   → None
    - TEXT field    → str
    """
    dataset_code = "TEST_TYPE_COERCION_E2E"
    datasets_endpoint = "master-data"
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"

    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    create_payload = {
        "code": dataset_code,
        "name": "Type Coercion Test",
        "fields": [
            {"name": "label", "type": "TEXT", "required": True},
            {"name": "score", "type": "NUMBER", "required": False},
            {"name": "active", "type": "BOOLEAN", "required": False},
            {"name": "effective_date", "type": "DATE", "required": False},
        ]
    }
    response = api_client.post(datasets_endpoint, json=create_payload)
    assert response.status_code == 201

    try:
        # Insert a record with all typed fields populated
        response = api_client.post(records_endpoint, json={
            "label": "row-one",
            "score": 123.45,
            "active": True,
            "effective_date": "2025-06-15T00:00:00.000Z",
        })
        assert response.status_code == 201

        # Insert a second record with nulls to verify null pass-through
        response = api_client.post(records_endpoint, json={
            "label": "row-null",
            "score": None,
            "active": None,
            "effective_date": None,
        })
        assert response.status_code == 201

        # Fetch all records
        response = api_client.get(records_endpoint, params={"_limit": 10})
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) >= 2

        # Find our typed row
        typed_row = next(r for r in items if r["label"] == "row-one")

        # NUMBER: must be int or float, NOT string
        assert isinstance(typed_row["score"], (int, float)), (
            f"Expected score to be int/float, got {type(typed_row['score'])}: {typed_row['score']!r}"
        )
        assert abs(typed_row["score"] - 123.45) < 0.001

        # BOOLEAN: must be bool, NOT string
        assert isinstance(typed_row["active"], bool), (
            f"Expected active to be bool, got {type(typed_row['active'])}: {typed_row['active']!r}"
        )
        assert typed_row["active"] is True

        # DATE: must be an ISO-8601 string
        assert isinstance(typed_row["effective_date"], str), (
            f"Expected effective_date to be str, got {type(typed_row['effective_date'])}: {typed_row['effective_date']!r}"
        )
        assert "2025-06-15" in typed_row["effective_date"]

        # TEXT: must be str
        assert isinstance(typed_row["label"], str)

        # Null row: nullable fields must be None
        null_row = next(r for r in items if r["label"] == "row-null")
        assert null_row["score"] is None
        assert null_row["active"] is None
        assert null_row["effective_date"] is None

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)


def test_master_data_schema_rebuild(api_client: APIClient, request):
    """
    GBPM-800: Tests PUT /master-data/:code/schema (destructive full rebuild).
    1. Create dataset with TEXT field -> insert records
    2. PUT with confirm_data_loss=true and new schema -> table rebuilt, data gone, schema updated
    3. PUT with confirm_data_loss=false -> 400
    4. PUT on system dataset -> 409
    5. PUT on non-existent dataset -> 404
    6. id field in payload is filtered out
    7. Metadata preserved: code, name, created_by unchanged after rebuild
    """
    dataset_code = "TEST_SCHEMA_REBUILD_E2E"
    datasets_endpoint = "master-data"
    schema_endpoint = f"{datasets_endpoint}/{dataset_code}/schema"
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"

    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    create_payload = {
        "code": dataset_code,
        "name": "Schema Rebuild Test",
        "fields": [
            {"name": "vendor_name", "type": "TEXT", "required": True},
            {"name": "score", "type": "NUMBER", "required": False},
        ]
    }
    response = api_client.post(datasets_endpoint, json=create_payload)
    assert response.status_code == 201
    original = response.json()

    try:
        # Insert records before rebuild
        api_client.post(records_endpoint, json={"vendor_name": "Vendor A", "score": 99})
        api_client.post(records_endpoint, json={"vendor_name": "Vendor B", "score": 88})

        response = api_client.get(records_endpoint)
        assert response.json()["total"] == 2

        # 1. Successful rebuild with new schema
        new_fields = [
            {"name": "product_name", "type": "TEXT", "required": True},
            {"name": "active", "type": "BOOLEAN", "required": False},
        ]
        response = api_client.put(schema_endpoint, json={
            "fields": new_fields,
            "confirm_data_loss": True,
        })
        assert response.status_code == 200
        rebuilt = response.json()

        # Schema updated
        field_names = [f["name"] for f in rebuilt["fields"]]
        assert "product_name" in field_names
        assert "active" in field_names
        assert "vendor_name" not in field_names
        assert "score" not in field_names

        # All data gone
        response = api_client.get(records_endpoint)
        assert response.json()["total"] == 0

        # 2. Metadata preserved
        assert rebuilt["code"] == original["code"]
        assert rebuilt["name"] == original["name"]
        assert rebuilt["created_by"] == original["created_by"]

        # 3. confirm_data_loss=false -> 400
        response = api_client.put(schema_endpoint, json={
            "fields": new_fields,
            "confirm_data_loss": False,
        }, raise_for_status=False)
        assert response.status_code == 400

        # 4. System dataset -> 409
        response = api_client.put(
            f"{datasets_endpoint}/USERS/schema",
            json={"fields": [{"name": "code", "type": "TEXT", "required": True}], "confirm_data_loss": True},
            raise_for_status=False,
        )
        assert response.status_code == 409

        # 5. Non-existent dataset -> 404
        response = api_client.put(
            f"{datasets_endpoint}/DOES_NOT_EXIST/schema",
            json={"fields": new_fields, "confirm_data_loss": True},
            raise_for_status=False,
        )
        assert response.status_code == 404

        # 6. Unchanged schema -> no rebuild, data preserved
        response = api_client.put(schema_endpoint, json={
            "fields": [{"name": "label", "type": "TEXT", "required": False}],
            "confirm_data_loss": True,
        })
        assert response.status_code == 200
        api_client.post(records_endpoint, json={"label": "preserved-row"})

        response = api_client.put(schema_endpoint, json={
            "fields": [{"name": "label", "type": "TEXT", "required": False}],
            "confirm_data_loss": True,
        })
        assert response.status_code == 200
        response = api_client.get(records_endpoint)
        assert response.json()["total"] == 1, "Data should be preserved when schema is unchanged"

        # 7. id field in payload is silently filtered
        response = api_client.put(schema_endpoint, json={
            "fields": [
                {"name": "id", "type": "NUMBER", "required": True},
                {"name": "label", "type": "TEXT", "required": False},
            ],
            "confirm_data_loss": True,
        })
        assert response.status_code == 200
        field_names = [f["name"] for f in response.json()["fields"]]
        assert "id" not in field_names
        assert "label" in field_names

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)


def test_master_data_schema_export_import(api_client: APIClient, request):
    """
    GBPM-798: Validates the schema-only JSON export/import split.

    Scenarios covered:
    1. Export returns { definition } only — no records key
    2. Import without records → 201, success=true, definition returned
    3. Import is idempotent for existing dataset (no-op, no error)
    4. Import with deprecated records field → 201, Deprecation header set,
       records are NOT inserted into the md_* table
    5. Import with audit field overrides → created_by/created_at preserved
    6. Import of EXTERNAL_API dataset → 400 (still blocked on import side)
    """
    dataset_code = "TEST_E2E_SCHEMA_EXPORT_IMPORT"
    datasets_endpoint = "master-data"
    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    try:
        # Create dataset with a couple of fields
        create_payload = {
            "code": dataset_code,
            "name": "Schema Export Import Test",
            "fields": [
                {"name": "label", "type": "TEXT", "required": True},
                {"name": "rank", "type": "NUMBER", "required": False},
            ],
        }
        r = api_client.post(datasets_endpoint, json=create_payload)
        assert r.status_code == 201

        # Insert a record so we can verify it is NOT round-tripped via JSON import
        records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"
        api_client.post(records_endpoint, json={"label": "Alpha", "rank": 1})

        # --- Scenario 1: Export is schema-only ---
        export_r = api_client.get(f"{datasets_endpoint}/{dataset_code}/export")
        assert export_r.status_code == 200
        export_data = export_r.json()
        assert "definition" in export_data
        assert "records" not in export_data, "JSON export must not include records"
        assert export_data["definition"]["code"] == dataset_code
        field_names = [f["name"] for f in export_data["definition"]["fields"]]
        assert "label" in field_names
        assert "rank" in field_names
        log.info("Scenario 1 passed: export is schema-only")

        # --- Scenario 2: Import creates schema, returns success + definition ---
        # Delete the dataset first so we can test a clean import
        api_client.delete(f"{datasets_endpoint}/{dataset_code}")

        import_r = api_client.post(f"{datasets_endpoint}/import", json=export_data)
        assert import_r.status_code == 201
        import_result = import_r.json()
        assert import_result["success"] is True
        assert import_result["definition"]["code"] == dataset_code
        assert "count" not in import_result, "Import response must not include count"
        log.info("Scenario 2 passed: import returns success + definition")

        # --- Scenario 3: Idempotent — import for existing dataset is a no-op ---
        import_r2 = api_client.post(f"{datasets_endpoint}/import", json=export_data)
        assert import_r2.status_code == 201
        assert import_r2.json()["success"] is True
        log.info("Scenario 3 passed: import is idempotent")

        # --- Scenario 4: Deprecated records field → Deprecation header, records NOT inserted ---
        api_client.delete(f"{datasets_endpoint}/{dataset_code}")

        deprecated_payload = {
            **export_data,
            "records": [{"label": "BetaDeprecated", "rank": 99}],
        }
        import_r3 = api_client.post(
            f"{datasets_endpoint}/import", json=deprecated_payload
        )
        assert import_r3.status_code == 201
        assert import_r3.headers.get("Deprecation") == "true", \
            "Deprecation header must be set when records field is present"

        # Confirm records were NOT inserted into the md_* table
        records_r = api_client.get(records_endpoint)
        assert records_r.json()["total"] == 0, \
            "JSON import must not insert records even when records field is supplied"
        log.info("Scenario 4 passed: deprecated records field → Deprecation header, no rows inserted")

        # --- Scenario 5: Audit field overrides ---
        api_client.delete(f"{datasets_endpoint}/{dataset_code}")

        audit_payload = {
            "definition": {
                **export_data["definition"],
                "created_by": "original_author",
                "created_at": "2023-01-15T08:00:00.000Z",
            }
        }
        import_r4 = api_client.post(f"{datasets_endpoint}/import", json=audit_payload)
        assert import_r4.status_code == 201
        created_def = import_r4.json()["definition"]
        assert created_def["created_by"] == "original_author"
        assert "2023-01-15" in created_def["created_at"]
        log.info("Scenario 5 passed: audit fields preserved")

        # --- Scenario 6: EXTERNAL_API import is blocked ---
        ext_payload = {
            "definition": {
                **export_data["definition"],
                "code": f"{dataset_code}_EXT",
                "source_type": "EXTERNAL_API",
            }
        }
        import_r5 = api_client.post(
            f"{datasets_endpoint}/import", json=ext_payload, raise_for_status=False
        )
        assert import_r5.status_code == 400
        log.info("Scenario 6 passed: EXTERNAL_API import blocked")

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)
            api_client.delete(
                f"{datasets_endpoint}/{dataset_code}_EXT", raise_for_status=False
            )


def test_master_data_csv_export_import(api_client: APIClient, request):
    """
    Validates the CSV record export/import endpoints:

    1. Export empty dataset → valid CSV with header row only, no data rows
    2. Insert records then export → CSV contains all rows with correct values
    3. CSV round-trip → delete records, re-import from exported CSV, records restored
    4. Import handles numeric/boolean type coercion from CSV strings
    5. CSV column not defined in schema → 400 Bad Request
    6. No file uploaded → 400 Bad Request
    7. EXTERNAL_API dataset export → 403 Forbidden
    8. EXTERNAL_API dataset import → 403 Forbidden
    9. System dataset import → 403 Forbidden
    """
    dataset_code = "TEST_E2E_CSV_EXPORT_IMPORT"
    datasets_endpoint = "master-data"
    records_endpoint = f"{datasets_endpoint}/{dataset_code}/records"
    export_csv_endpoint = f"{datasets_endpoint}/{dataset_code}/records/export-csv"
    import_csv_endpoint = f"{datasets_endpoint}/{dataset_code}/records/import-csv"

    api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)

    try:
        # Create dataset with TEXT, NUMBER, and BOOLEAN fields
        create_payload = {
            "code": dataset_code,
            "name": "CSV Export Import Test",
            "fields": [
                {"name": "label", "type": "TEXT", "required": True},
                {"name": "score", "type": "NUMBER", "required": False},
                {"name": "active", "type": "BOOLEAN", "required": False},
            ],
        }
        r = api_client.post(datasets_endpoint, json=create_payload)
        assert r.status_code == 201

        # --- Scenario 1: Export empty dataset → header row only ---
        r_export = api_client.get(export_csv_endpoint)
        assert r_export.status_code == 200
        assert "text/csv" in r_export.headers.get("Content-Type", "")
        csv_text = r_export.text
        lines = [ln for ln in csv_text.strip().splitlines() if ln]
        assert len(lines) == 1, "Empty dataset export must have header only"
        headers = [h.strip() for h in lines[0].split(",")]
        assert "label" in headers
        assert "score" in headers
        assert "active" in headers
        log.info("Scenario 1 passed: empty export returns header-only CSV")

        # --- Scenario 2: Insert records then export → CSV contains all rows ---
        api_client.post(records_endpoint, json={"label": "Alpha", "score": 10, "active": True})
        api_client.post(records_endpoint, json={"label": "Beta", "score": 20, "active": False})
        api_client.post(records_endpoint, json={"label": "Gamma", "score": 30, "active": True})

        r_export2 = api_client.get(export_csv_endpoint)
        assert r_export2.status_code == 200
        csv_text2 = r_export2.text
        data_lines = [ln for ln in csv_text2.strip().splitlines() if ln]
        assert len(data_lines) == 4, "Export must include header + 3 data rows"
        assert "Alpha" in csv_text2
        assert "Beta" in csv_text2
        assert "Gamma" in csv_text2
        log.info("Scenario 2 passed: export includes all inserted rows")

        # --- Scenario 3: Round-trip — delete records, re-import from CSV ---
        # Delete each record by its known label value
        for label in ("Alpha", "Beta", "Gamma"):
            api_client.delete(records_endpoint, params={"label": label})

        count_after_delete = api_client.get(records_endpoint).json()["total"]
        assert count_after_delete == 0, "All records should be deleted before re-import"

        csv_bytes = csv_text2.encode("utf-8")
        r_import = api_client.post(
            import_csv_endpoint,
            files={"file": ("data.csv", csv_bytes, "text/csv")},
        )
        assert r_import.status_code == 201
        result = r_import.json()
        assert result["inserted"] == 3, f"Expected 3 inserted, got {result['inserted']}"

        restored = api_client.get(records_endpoint).json()["items"]
        restored_labels = {rec["label"] for rec in restored}
        assert restored_labels == {"Alpha", "Beta", "Gamma"}, \
            f"Restored labels mismatch: {restored_labels}"
        log.info("Scenario 3 passed: CSV round-trip restores all records")

        # --- Scenario 4: Type coercion — numbers and booleans parsed from CSV strings ---
        alpha_rec = next(r for r in restored if r["label"] == "Alpha")
        assert float(alpha_rec["score"]) == 10.0, "score must be numeric after CSV import"
        assert alpha_rec["active"] is True, "active=True must be boolean after CSV import"
        beta_rec = next(r for r in restored if r["label"] == "Beta")
        assert beta_rec["active"] is False, "active=False must be boolean after CSV import"
        log.info("Scenario 4 passed: numeric and boolean values coerced correctly")

        # --- Scenario 5: Unknown CSV column → 400 ---
        bad_csv = "label,score,nonexistent_col\nDelta,5,bad_value\n"
        r_bad = api_client.post(
            import_csv_endpoint,
            files={"file": ("bad.csv", bad_csv.encode("utf-8"), "text/csv")},
            raise_for_status=False,
        )
        assert r_bad.status_code == 400, \
            f"Unknown column must return 400, got {r_bad.status_code}"
        log.info("Scenario 5 passed: unknown CSV column → 400")

        # --- Scenario 6: No file uploaded → 400 ---
        r_no_file = api_client.post(import_csv_endpoint, raise_for_status=False)
        assert r_no_file.status_code == 400, \
            f"Missing file must return 400, got {r_no_file.status_code}"
        log.info("Scenario 6 passed: missing file → 400")

        # --- Scenario 7: EXTERNAL_API export → 403 ---
        ext_code = f"{dataset_code}_EXT"
        api_client.delete(f"{datasets_endpoint}/{ext_code}", raise_for_status=False)
        r_ext_create = api_client.post(datasets_endpoint, json={
            "code": ext_code,
            "name": "CSV External API Test",
            "source_type": "EXTERNAL_API",
            "fields": [{"name": "val", "type": "TEXT", "required": False}],
            "api_config": {
                "url": "http://localhost/fake",
                "method": "GET",
                "headers": {},
                "response_path": "data",
            },
        })
        assert r_ext_create.status_code == 201

        r_ext_export = api_client.get(
            f"{datasets_endpoint}/{ext_code}/records/export-csv",
            raise_for_status=False,
        )
        assert r_ext_export.status_code == 403, \
            f"EXTERNAL_API CSV export must return 403, got {r_ext_export.status_code}"
        log.info("Scenario 7 passed: EXTERNAL_API CSV export → 403")

        # --- Scenario 8: EXTERNAL_API import → 403 ---
        simple_csv = "val\nhello\n"
        r_ext_import = api_client.post(
            f"{datasets_endpoint}/{ext_code}/records/import-csv",
            files={"file": ("data.csv", simple_csv.encode("utf-8"), "text/csv")},
            raise_for_status=False,
        )
        assert r_ext_import.status_code == 403, \
            f"EXTERNAL_API CSV import must return 403, got {r_ext_import.status_code}"
        log.info("Scenario 8 passed: EXTERNAL_API CSV import → 403")

        # --- Scenario 9: System dataset import → 403 ---
        sys_csv = "code,name\nSYS001,Test\n"
        r_sys_import = api_client.post(
            f"{datasets_endpoint}/USERS/records/import-csv",
            files={"file": ("data.csv", sys_csv.encode("utf-8"), "text/csv")},
            raise_for_status=False,
        )
        assert r_sys_import.status_code == 403, \
            f"System dataset CSV import must return 403, got {r_sys_import.status_code}"
        log.info("Scenario 9 passed: system dataset CSV import → 403")

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{datasets_endpoint}/{dataset_code}", raise_for_status=False)
            api_client.delete(
                f"{datasets_endpoint}/{dataset_code}_EXT", raise_for_status=False
            )