import json
import logging
import requests
from typing import Dict, Any
from utils.id_generator import generate_public_id

log = logging.getLogger(__name__)

def test_migration_missing_dependencies(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test Import with missing dependencies (User/OrgUnit).
    """
    # 1. Create Workflow to be exported
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_name = f"Migration Fail Test {generate_public_id()}"
    create_wf_payload = {
        "name": workflow_name,
        "description": "Workflow for migration failure test",
        "tags": []
    }
    res = requests.post(workflow_endpoint, json=create_wf_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    wf_data = res.json()
    workflow_id = wf_data["workflow_id"]

    # 2. Export Workflow
    export_wf_endpoint = f"{api_base_url}/workflow/{workflow_id}/export"
    res = requests.get(export_wf_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    wf_export_payload = res.json()

    # 3. Tamper with dependencies to introduce a non-existent User
    fake_user_code = "NON_EXISTENT_USER_CODE_12345"
    wf_export_payload["payload"]["dependencies"]["users"].append({
        "source_id": 99999,
        "code": fake_user_code,
        "name": "Fake User",
        "email": "fake@example.com"
    })

    # 4. Check Import - Should detect missing user
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=wf_export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    # Assertions
    assert check_result["can_proceed"] is False

    user_check = next((u for u in check_result["dependencies_check"]["users"] if u["code"] == fake_user_code), None)
    assert user_check is not None
    assert user_check["status"] == "MISSING"
    assert user_check["severity"] == "BLOCKING"

    # 5. Tamper with dependencies to introduce a non-existent OrgUnit
    fake_org_code = "NON_EXISTENT_ORG_CODE_54321"
    wf_export_payload["payload"]["dependencies"]["org_units"].append({
        "source_id": 88888,
        "code": fake_org_code,
        "name": "Fake Org",
        "type": "ORG_UNIT"
    })

    # Remove the fake user so we can test OrgUnit blocking specifically (though multiple blocks are allowed)
    wf_export_payload["payload"]["dependencies"]["users"] = []

    res = requests.post(check_endpoint, json=wf_export_payload, headers=admin_auth_headers)
    check_result = res.json()

    assert check_result["can_proceed"] is False

    org_check = next((o for o in check_result["dependencies_check"]["org_units"] if o["code"] == fake_org_code), None)
    assert org_check is not None
    assert org_check["status"] == "MISSING"
    assert org_check["severity"] == "BLOCKING"

def test_migration_missing_tags_and_master_data_warnings(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test Import check returns WARNING severity for missing tags and master data.
    These are non-blocking — import can still proceed.
    """
    # 1. Create a form with a schema that has getMasterData references
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Warning Test {generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "dropdown",
                "attributes": {
                    "name": "vendor_select",
                    "defaultValue": {
                        "isReference": True,
                        "reference": "getMasterData(\"NonExistentDataset\").map(v => v.name)"
                    }
                }
            }
        }
    }
    create_form_payload = {
        "name": form_name,
        "description": "Form for warning test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }

    res = requests.post(form_endpoint, json=create_form_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 2. Export Form
    export_endpoint = f"{api_base_url}/form/{form_id}/export"
    res = requests.get(export_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()
    print("Exported Payload with Missing Master Data Reference:")
    print(json.dumps(export_payload, indent=2))

    # Verify master_data is in the export
    assert "master_data" in export_payload["payload"]["dependencies"]
    master_data_deps = export_payload["payload"]["dependencies"]["master_data"]
    assert len(master_data_deps) == 1
    assert master_data_deps[0]["dataset_name"] == "NonExistentDataset"

    # 3. Inject a fake tag to test tag warning
    fake_tag_name = f"non_existent_tag_{generate_public_id()}"
    export_payload["payload"]["dependencies"]["tags"].append({
        "name": fake_tag_name,
        "description": None,
        "color": None
    })

    # 4. Inject a fake validation to test validation check
    fake_val_name = f"non_existent_val_{generate_public_id()}"
    export_payload["payload"]["dependencies"]["validations"].append({
        "source_id": 99999,
        "public_id": generate_public_id(),
        "name": fake_val_name,
        "validation_type": "CODE",
        "validation_code": "function validate(v) { return true; }",
        "error_message": "Fake validation",
        "components": ["input"]
    })

    # 5. Check Import - should proceed but with warnings for tags/master_data,
    #    and INFO for validations (they can be auto-created)
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    print("Import Check Result with Missing Tags, Master Data, and Validations:")
    print(json.dumps(check_result, indent=2))

    # Import should still proceed (none of these are blocking)
    assert check_result["can_proceed"] is True

    # Check master data warning
    md_check = check_result["dependencies_check"]["master_data"]
    assert len(md_check) == 1
    assert md_check[0]["dataset_name"] == "NonExistentDataset"
    assert md_check[0]["status"] == "MISSING"
    assert md_check[0]["severity"] == "WARNING"

    # Check tag warning
    tag_checks = check_result["dependencies_check"]["tags"]
    missing_tags = [t for t in tag_checks if t["status"] == "MISSING"]
    assert len(missing_tags) >= 1
    fake_tag_check = next(t for t in missing_tags if t["name"] == fake_tag_name)
    assert fake_tag_check["severity"] == "WARNING"

    # Check validation (INFO severity - can be auto-created)
    val_checks = check_result["dependencies_check"]["validations"]
    fake_val_check = next(
        (v for v in val_checks if v["name"] == fake_val_name), None
    )
    assert fake_val_check is not None
    assert fake_val_check["status"] == "MISSING"
    assert fake_val_check["severity"] == "INFO"
    # Missing validator: source details present, target is null
    assert fake_val_check["source"]["public_id"] is not None
    assert fake_val_check["target"] is None


def test_migration_workflow_check_merges_bundled_form_warnings(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #6: Workflow import check merges bundled form's tag/master_data/validation
    warnings into the workflow's dependencies_check.
    """
    # 1. Create a form with master data ref
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Merge Warn Test {generate_public_id()}"
    md_name = f"MergeWarnDataset_{generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "dropdown",
                "attributes": {
                    "name": "vendor_select",
                    "defaultValue": {
                        "isReference": True,
                        "reference": f"getMasterData(\"{md_name}\").map(v => v.name)"
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for merge warning test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 2. Create workflow and bind to form
    workflow_endpoint = f"{api_base_url}/workflow"
    wf_name = f"Migration Merge Warn WF {generate_public_id()}"
    res = requests.post(workflow_endpoint, json={
        "name": wf_name,
        "description": "Workflow for merge warning test",
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    workflow_id = res.json()["workflow_id"]

    binding_endpoint = f"{api_base_url}/bindings"
    res = requests.post(binding_endpoint, json={
        "form_id": form_id,
        "workflow_id": workflow_id
    }, headers=admin_auth_headers)
    assert res.status_code == 201

    # 3. Export workflow
    res = requests.get(
        f"{api_base_url}/workflow/{workflow_id}/export",
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    wf_export = res.json()

    # 4. Inject a fake tag into the bundled form's dependencies
    fake_tag = f"bundled_form_tag_{generate_public_id()}"
    wf_export["payload"]["binding"]["bundled_form"]["dependencies"]["tags"].append({
        "name": fake_tag,
        "description": None,
        "color": None
    })

    # 5. Inject a fake validation into the bundled form's dependencies
    fake_val = f"bundled_form_val_{generate_public_id()}"
    wf_export["payload"]["binding"]["bundled_form"]["dependencies"]["validations"].append({
        "source_id": 99999,
        "public_id": generate_public_id(),
        "name": fake_val,
        "validation_type": "CODE",
        "validation_code": "function validate(v) { return true; }",
        "error_message": "Fake",
        "components": ["input"]
    })

    # 6. Check import
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=wf_export, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    # Should still proceed (all warnings are non-blocking)
    assert check_result["can_proceed"] is True

    # Merged master_data from bundled form
    md_check = check_result["dependencies_check"]["master_data"]
    md_entry = next((m for m in md_check if m["dataset_name"] == md_name), None)
    assert md_entry is not None
    assert md_entry["status"] == "MISSING"
    assert md_entry["severity"] == "WARNING"

    # Merged tags from bundled form
    tag_entry = next(
        (t for t in check_result["dependencies_check"]["tags"] if t["name"] == fake_tag),
        None,
    )
    assert tag_entry is not None
    assert tag_entry["status"] == "MISSING"
    assert tag_entry["severity"] == "WARNING"

    # Merged validations from bundled form
    val_entry = next(
        (v for v in check_result["dependencies_check"]["validations"] if v["name"] == fake_val),
        None,
    )
    assert val_entry is not None
    assert val_entry["status"] == "MISSING"
    assert val_entry["severity"] == "INFO"
    # Missing validator: source details present, target is null
    assert val_entry["source"]["public_id"] is not None
    assert val_entry["target"] is None


def test_migration_backward_compat_without_master_data_field(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #7: Backward compatibility — a legacy export payload without the
    master_data field should still pass import check with master_data: []
    in the response.
    """
    # 1. Create a simple form
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Compat Test {generate_public_id()}"
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for backward compat test",
        "is_template": False,
        "form_schema": {"root": [], "entities": {}},
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 2. Export
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 3. Remove master_data field to simulate a legacy export
    if "master_data" in export_payload["payload"]["dependencies"]:
        del export_payload["payload"]["dependencies"]["master_data"]

    # 4. Check import — should succeed without error
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    assert check_result["can_proceed"] is True
    # The response should still have master_data key, just empty
    assert "master_data" in check_result["dependencies_check"]
    assert check_result["dependencies_check"]["master_data"] == []


def test_migration_existing_dependencies_show_exists_info(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #8: When all dependencies exist on the target system,
    they should show status=EXISTS, severity=INFO.
    """
    # 1. Create a tag
    tag_endpoint = f"{api_base_url}/tags"
    tag_name = f"existing-tag-{generate_public_id()}"
    res = requests.post(tag_endpoint, json={"name": tag_name}, headers=admin_auth_headers)
    assert res.status_code == 201
    tag_id = res.json()["id"]

    # 2. Create a validation
    val_endpoint = f"{api_base_url}/validation-registry"
    val_name = f"existing_val_{generate_public_id()}"
    res = requests.post(val_endpoint, json={
        "name": val_name,
        "description": "Existing validation",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return true; }",
        "errorMessage": "Always passes",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    val_id = res.json()["id"]

    # 3. Create a master data dataset
    md_endpoint = f"{api_base_url}/master-data"
    dataset_code = f"TEST_EXIST_{generate_public_id().upper().replace('-', '_')}"
    dataset_name = f"Existing Dataset {generate_public_id()}"
    res = requests.post(md_endpoint, json={
        "code": dataset_code,
        "name": dataset_name,
        "fields": [{"name": "col_a", "type": "TEXT", "required": True}]
    }, headers=admin_auth_headers)
    assert res.status_code == 201

    # 4. Create a form referencing all three
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Exists Test {generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "input",
                "attributes": {
                    "name": "test_field",
                    "inputType": "text",
                    "validator": {
                        "registryValidators": [{"validatorId": val_id}]
                    },
                    "defaultValue": {
                        "isReference": True,
                        "reference": f"getMasterData(\"{dataset_name}\")[0].col_a"
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form with all existing deps",
        "is_template": False,
        "form_schema": form_schema,
        "tags": [tag_id]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 5. Export
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 6. Check import — all should be EXISTS/INFO
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    assert check_result["can_proceed"] is True

    # Tag: EXISTS/INFO
    tag_check = next(
        (t for t in check_result["dependencies_check"]["tags"] if t["name"] == tag_name),
        None,
    )
    assert tag_check is not None
    assert tag_check["status"] == "EXISTS"
    assert tag_check["severity"] == "INFO"

    # Validation: EXISTS/INFO — source and target both populated
    val_check = next(
        (v for v in check_result["dependencies_check"]["validations"] if v["name"] == val_name),
        None,
    )
    assert val_check is not None
    assert val_check["status"] == "EXISTS"
    assert val_check["severity"] == "INFO"
    # source comes from the export payload; target comes from the DB
    assert val_check["source"]["public_id"] == val_id
    assert val_check["target"]["public_id"] == val_id  # same env: IDs match
    assert val_check["target"]["validation_code"] is not None

    # Master data: EXISTS/INFO
    md_check = next(
        (m for m in check_result["dependencies_check"]["master_data"] if m["dataset_name"] == dataset_name),
        None,
    )
    assert md_check is not None
    assert md_check["status"] == "EXISTS"
    assert md_check["severity"] == "INFO"

    # Cleanup
    requests.delete(f"{tag_endpoint}/{tag_id}", headers=admin_auth_headers)
    requests.delete(f"{val_endpoint}/{val_id}", headers=admin_auth_headers)
    requests.delete(f"{md_endpoint}/{dataset_code}", headers=admin_auth_headers)


def test_migration_validator_check_shows_id_mismatch(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #9: When a validator exists in the target by name but carries a different
    public_id than the source export, the check response must surface both IDs
    so the frontend can flag the divergence for user confirmation.

    This simulates the cross-environment scenario where the same-named validator
    was independently created in the target (receiving a target-env public_id),
    while the source export references its own public_id.
    """
    val_endpoint = f"{api_base_url}/validation-registry"
    form_endpoint = f"{api_base_url}/form"

    # 1. Create the validator in the target env — gets target-native public_id
    val_name = f"mismatch_val_{generate_public_id()}"
    res = requests.post(val_endpoint, json={
        "name": val_name,
        "description": "Validator that exists independently in target",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return v !== null; }",
        "errorMessage": "Must not be null",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    target_public_id = res.json()["id"]

    # 2. Create a form referencing this validator, then export it
    form_name = f"Mismatch Check Test {generate_public_id()}"
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for id mismatch check test",
        "is_template": False,
        "form_schema": {
            "root": ["field-1"],
            "entities": {
                "field-1": {
                    "type": "input",
                    "attributes": {
                        "name": "test_field",
                        "inputType": "text",
                        "validator": {
                            "registryValidators": [{"validatorId": target_public_id}]
                        }
                    }
                }
            }
        },
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 3. Simulate a source-environment payload: replace the validator's public_id
    #    with a "source env" value (different from what the target has)
    source_fake_public_id = f"SRC{generate_public_id()}"
    assert len(export_payload["payload"]["dependencies"]["validations"]) == 1
    export_payload["payload"]["dependencies"]["validations"][0]["public_id"] = source_fake_public_id

    # 4. Run check
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    # 5. The validator entry must show EXISTS with source AND target details
    val_entry = next(
        (v for v in check_result["dependencies_check"]["validations"] if v["name"] == val_name),
        None,
    )
    assert val_entry is not None
    assert val_entry["status"] == "EXISTS"
    assert val_entry["severity"] == "INFO"

    # source carries the source-env public_id (what the export was built with)
    assert val_entry["source"]["public_id"] == source_fake_public_id

    # target carries the target-env public_id (what actually exists in this env)
    assert val_entry["target"]["public_id"] == target_public_id

    # The two IDs differ — this is the signal for the frontend to flag the mismatch
    assert val_entry["source"]["public_id"] != val_entry["target"]["public_id"]

    # Cleanup
    requests.delete(f"{val_endpoint}/{target_public_id}", headers=admin_auth_headers)


def test_migration_soft_deleted_target(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test Import when the target form is soft-deleted.
    """
    # 1. Create Form
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Delete Test {generate_public_id()}"
    create_form_payload = {
        "name": form_name,
        "description": "Form for soft delete test",
        "is_template": False,
        "form_schema": {"root": [], "entities": {}},
        "tags": []
    }
    res = requests.post(form_endpoint, json=create_form_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 2. Export Form
    export_endpoint = f"{api_base_url}/form/{form_id}/export"
    res = requests.get(export_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 3. Soft Delete the Form
    delete_endpoint = f"{api_base_url}/form/{form_id}"
    res = requests.delete(delete_endpoint, headers=admin_auth_headers)
    assert res.status_code == 204

    # 4. Check Import - Should detect that form is deleted
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    assert check_result["can_proceed"] is False
    assert check_result["summary"]["entity_exists"] is True
    assert "is deleted" in check_result["summary"]["error"]

def test_migration_soft_deleted_workflow_target(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test Import when the target workflow is soft-deleted.
    """
    # 1. Create Workflow
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_name = f"Migration Delete Workflow Test {generate_public_id()}"
    create_wf_payload = {
        "name": workflow_name,
        "description": "Workflow for soft delete test",
        "tags": []
    }
    res = requests.post(workflow_endpoint, json=create_wf_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    workflow_id = res.json()["workflow_id"]

    # 2. Export Workflow
    export_endpoint = f"{api_base_url}/workflow/{workflow_id}/export"
    res = requests.get(export_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 3. Soft Delete the Workflow
    delete_endpoint = f"{api_base_url}/workflow/{workflow_id}"
    res = requests.delete(delete_endpoint, headers=admin_auth_headers)
    assert res.status_code == 204

    # 4. Check Import - Should detect that workflow is deleted
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    assert check_result["can_proceed"] is False
    assert check_result["summary"]["entity_exists"] is True
    assert "is deleted" in check_result["summary"]["error"]
