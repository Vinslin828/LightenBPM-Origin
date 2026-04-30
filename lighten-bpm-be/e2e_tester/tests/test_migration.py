import json
import logging
import requests
from typing import Dict, Any
from utils.id_generator import generate_public_id

log = logging.getLogger(__name__)

def test_migration_form_flow(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test Export and Import of Form and Workflow.
    """
    # 1. Create Form
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Test Form {generate_public_id()}"
    form_schema = {
        "root": [],
        "entities": {}
    }
    create_form_payload = {
        "name": form_name,
        "description": "Form for migration test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }

    res = requests.post(form_endpoint, json=create_form_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    form_data = res.json()
    form_id = form_data["form_id"]
    log.info(f"Created Form: {form_id}")

    # 2. Export Form
    export_endpoint = f"{api_base_url}/form/{form_id}/export"
    res = requests.get(export_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()
    log.info(f"Exported Form Payload: {json.dumps(export_payload, indent=2)}")

    assert export_payload["type"] == "FORM"
    assert export_payload["payload"]["public_id"] == form_id
    assert "master_data" in export_payload["payload"]["dependencies"]

    # 3. Check Import (Form)
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    log.info(f"Check Import Result: {json.dumps(check_result, indent=2)}")

    assert check_result["can_proceed"] is True
    assert "master_data" in check_result["dependencies_check"]
    # Since we are importing to the same system, it should say NO_CHANGE if nothing changed,
    # or UPDATE_REVISION if we force it?
    # Logic in checkImport: if latest revision ID matches, action is NO_CHANGE.
    # We haven't changed the form, so it should be NO_CHANGE.
    assert check_result["summary"]["action"] == "NO_CHANGE"

    # Let's modify the export payload to force a new revision or simulate import to new env
    # Modify public_id of revision to simulate a new revision
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()
    export_payload["payload"]["latest_revision"]["description"] = "Updated description via import"

    print('-- Modified Export Payload for Import:\n', json.dumps(export_payload, indent=2))
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    check_result = res.json()
    log.info(f"Re-Check Import Result after modification: {json.dumps(check_result, indent=2)}")
    assert check_result["summary"]["action"] == "UPDATE_REVISION"

    # 4. Execute Import (Form)
    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    print('-- Import Form Response:\n', res)
    assert res.status_code == 201

    exec_resp = res.json()
    assert exec_resp["type"] == "FORM"
    assert exec_resp["public_id"] == export_payload["payload"]["public_id"]
    assert exec_resp["latest_revision_public_id"] == export_payload["payload"]["latest_revision"]["public_id"]

    # Verify update
    res = requests.get(f"{api_base_url}/form/{form_id}", headers=admin_auth_headers)
    updated_form = res.json()
    print('-- Updated Form:\n', updated_form)
    assert updated_form["revision"]["description"] == "Updated description via import"

    # 5. Create Workflow
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_name = f"Migration Test Workflow {generate_public_id()}"
    create_wf_payload = {
        "name": workflow_name,
        "description": "Workflow for migration test",
        "tags": []
    }
    res = requests.post(workflow_endpoint, json=create_wf_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    wf_data = res.json()
    workflow_id = wf_data["workflow_id"]
    log.info(f"Created Workflow: {workflow_id}")

    # Bind Workflow to Form
    binding_endpoint = f"{api_base_url}/bindings"
    res = requests.post(binding_endpoint, json={"form_id": form_id, "workflow_id": workflow_id}, headers=admin_auth_headers)
    assert res.status_code == 201

    # 6. Export Workflow
    export_wf_endpoint = f"{api_base_url}/workflow/{workflow_id}/export"
    res = requests.get(export_wf_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    wf_export_payload = res.json()
    log.info(f"Exported Workflow Payload: {json.dumps(wf_export_payload, indent=2)}")

    assert wf_export_payload["type"] == "WORKFLOW"
    assert wf_export_payload["payload"]["binding"] is not None
    assert wf_export_payload["payload"]["binding"]["target_form_public_id"] == form_id
    assert wf_export_payload["payload"]["binding"]["bundled_form"] is not None # Because we bound it

    # 7. Check Import (Workflow)
    res = requests.post(check_endpoint, json=wf_export_payload, headers=admin_auth_headers)
    check_result_wf = res.json()
    log.info(f"Check Import Result (Workflow): {json.dumps(check_result_wf, indent=2)}")

    assert check_result_wf["can_proceed"] is True
    assert check_result_wf["dependencies_check"]["related_form"]["status"] == "EXISTS"

    # Modify Workflow Payload to simulate update
    wf_export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()
    wf_export_payload["payload"]["latest_revision"]["description"] = "Updated workflow via import"

    # 8. Execute Import (Workflow)
    # We need re-check with modified payload
    res = requests.post(check_endpoint, json=wf_export_payload, headers=admin_auth_headers)
    check_result_wf = res.json()

    res = requests.post(execute_endpoint, json=check_result_wf, headers=admin_auth_headers)
    assert res.status_code == 201

    exec_resp_wf = res.json()
    assert exec_resp_wf["type"] == "WORKFLOW"
    assert exec_resp_wf["public_id"] == wf_export_payload["payload"]["public_id"]
    assert exec_resp_wf["latest_revision_public_id"] == wf_export_payload["payload"]["latest_revision"]["public_id"]

    # Verify update
    res = requests.get(f"{api_base_url}/workflow/{workflow_id}", headers=admin_auth_headers)
    updated_wf = res.json()
    assert updated_wf["revision"]["description"] == "Updated workflow via import"


def test_migration_form_exports_only_referenced_validations(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test that form export only includes validations actually referenced
    by registryValidators in the form schema, not all validations registered
    for the component types used in the form.
    """
    validation_endpoint = f"{api_base_url}/validation-registry"

    # 1. Create two validation rules, both bound to the "input" component type
    val_a_name = f"val_referenced_{generate_public_id()}"
    res = requests.post(validation_endpoint, json={
        "name": val_a_name,
        "description": "Referenced validation",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return v.length > 0; }",
        "errorMessage": "Must not be empty",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    val_a_id = res.json()["id"]  # public_id
    log.info(f"Created referenced validation: {val_a_id}")

    val_b_name = f"val_unreferenced_{generate_public_id()}"
    res = requests.post(validation_endpoint, json={
        "name": val_b_name,
        "description": "Unreferenced validation (should NOT be exported)",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return true; }",
        "errorMessage": "Always passes",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    val_b_id = res.json()["id"]  # public_id
    log.info(f"Created unreferenced validation: {val_b_id}")

    # 2. Create a form with an input field that references only val_a
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Validation Test {generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "input",
                "attributes": {
                    "name": "test_input",
                    "inputType": "text",
                    "validator": {
                        "registryValidators": [
                            {"validatorId": val_a_id}
                        ]
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form referencing one of two validations",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 3. Export the form
    export_endpoint = f"{api_base_url}/form/{form_id}/export"
    res = requests.get(export_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    print('-- Exported Form Payload:\n', json.dumps(export_payload, indent=2))

    exported_validations = export_payload["payload"]["dependencies"]["validations"]
    exported_val_ids = [v["public_id"] for v in exported_validations]

    log.info(f"Exported validation IDs: {exported_val_ids}")

    # Only val_a should be exported, not val_b
    assert val_a_id in exported_val_ids, \
        f"Referenced validation {val_a_id} should be in export"
    assert val_b_id not in exported_val_ids, \
        f"Unreferenced validation {val_b_id} should NOT be in export"

    # 4. Verify the exported validation has correct data
    exported_val_a = next(v for v in exported_validations if v["public_id"] == val_a_id)
    assert exported_val_a["name"] == val_a_name
    assert "input" in exported_val_a["components"]

    # Cleanup
    requests.delete(f"{validation_endpoint}/{val_a_id}", headers=admin_auth_headers)
    requests.delete(f"{validation_endpoint}/{val_b_id}", headers=admin_auth_headers)


def test_migration_form_export_with_master_data_references(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #1: Form export with master data references (happy path).
    Creates a master data dataset, creates a form referencing it via getMasterData(),
    exports, and verifies the dataset appears in dependencies.master_data.
    On import check, the existing dataset should show EXISTS/INFO.
    """
    # 1. Create a master data dataset
    md_endpoint = f"{api_base_url}/master-data"
    dataset_code = f"TEST_MD_{generate_public_id().upper().replace('-', '_')}"
    dataset_name = f"Test Dataset {generate_public_id()}"
    res = requests.post(md_endpoint, json={
        "code": dataset_code,
        "name": dataset_name,
        "fields": [
            {"name": "item_name", "type": "TEXT", "required": True}
        ]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    log.info(f"Created master data dataset: {dataset_code}")

    # 2. Create a form with a schema referencing the dataset
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration MasterData Test {generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "dropdown",
                "attributes": {
                    "name": "item_select",
                    "defaultValue": {
                        "isReference": True,
                        "reference": f"getMasterData(\"{dataset_name}\").map(v => v.item_name)"
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form with master data reference",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 3. Export
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # Verify master_data in export
    md_deps = export_payload["payload"]["dependencies"]["master_data"]
    assert len(md_deps) == 1
    assert md_deps[0]["dataset_name"] == dataset_name

    # 4. Check import — dataset exists on same system → EXISTS/INFO
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    assert check_result["can_proceed"] is True
    md_check = check_result["dependencies_check"]["master_data"]
    assert len(md_check) == 1
    assert md_check[0]["dataset_name"] == dataset_name
    assert md_check[0]["status"] == "EXISTS"
    assert md_check[0]["severity"] == "INFO"

    # Cleanup
    requests.delete(f"{md_endpoint}/{dataset_code}", headers=admin_auth_headers)


def test_migration_import_auto_creates_missing_validations(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #2: Import execute auto-creates missing validations.
    Creates a validation, creates a form referencing it, exports,
    deletes the validation, then executes import and verifies
    the validation gets recreated.
    """
    validation_endpoint = f"{api_base_url}/validation-registry"

    # 1. Create a validation rule
    val_name = f"val_autocreate_{generate_public_id()}"
    res = requests.post(validation_endpoint, json={
        "name": val_name,
        "description": "Validation to be auto-created",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return v.length > 0; }",
        "errorMessage": "Must not be empty",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    val_id = res.json()["id"]

    # 2. Create a form referencing this validation
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration AutoCreate Val Test {generate_public_id()}"
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
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for auto-create validation test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 3. Export
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    assert len(export_payload["payload"]["dependencies"]["validations"]) == 1
    assert export_payload["payload"]["dependencies"]["validations"][0]["name"] == val_name

    # 4. Delete the validation from the system
    res = requests.delete(f"{validation_endpoint}/{val_id}", headers=admin_auth_headers)
    assert res.status_code == 204

    # 5. Modify export to force a new revision
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()

    # 6. Check import — validation is MISSING but INFO (can be auto-created)
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    val_check = next(
        (v for v in check_result["dependencies_check"]["validations"] if v["name"] == val_name),
        None
    )
    assert val_check is not None
    assert val_check["status"] == "MISSING"

    # 7. Execute import — should auto-create the validation
    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 8. Verify the validation was recreated
    res = requests.get(f"{validation_endpoint}?name={val_name}", headers=admin_auth_headers)
    assert res.status_code == 200
    val_list = res.json()
    assert val_list["total"] >= 1
    recreated = next((v for v in val_list["items"] if v["name"] == val_name), None)
    assert recreated is not None

    # Cleanup
    requests.delete(f"{validation_endpoint}/{recreated['id']}", headers=admin_auth_headers)


def test_migration_import_auto_creates_missing_tags(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #3: Import execute auto-creates missing tags.
    Exports a form, injects a non-existent tag, executes import,
    and verifies the tag was created.
    """
    # 1. Create a simple form
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration AutoCreate Tag Test {generate_public_id()}"
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for auto-create tag test",
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

    # 3. Inject a non-existent tag and force a new revision
    new_tag_name = f"auto-created-tag-{generate_public_id()}"
    export_payload["payload"]["dependencies"]["tags"].append({
        "name": new_tag_name,
        "description": "Auto-created by import",
        "color": "#FF0000"
    })
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()

    # 4. Check import — tag should be WARNING but can_proceed is True
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    missing_tag = next(
        (t for t in check_result["dependencies_check"]["tags"] if t["name"] == new_tag_name),
        None
    )
    assert missing_tag is not None
    assert missing_tag["status"] == "MISSING"
    assert missing_tag["severity"] == "WARNING"

    # 5. Execute import — should auto-create the tag
    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 6. Verify the tag was created
    tag_endpoint = f"{api_base_url}/tags"
    res = requests.get(tag_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    tags = res.json()
    created_tag = next((t for t in tags if t["name"] == new_tag_name), None)
    assert created_tag is not None
    assert created_tag["description"] == "Auto-created by import"

    # Cleanup
    requests.delete(f"{tag_endpoint}/{created_tag['id']}", headers=admin_auth_headers)


def test_migration_validator_public_id_remapped_on_import(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #5: Cross-environment validator public_id remapping.

    Simulates the case where the source environment's validator has a different
    public_id than the same-named validator in the target environment.
    The import must rewrite the form schema's validatorId to use the target's
    public_id, not the source's.
    """
    validation_endpoint = f"{api_base_url}/validation-registry"
    form_endpoint = f"{api_base_url}/form"

    # 1. Create the validator in the target env — it gets a target-native public_id
    val_name = f"crossenv_val_{generate_public_id()}"
    res = requests.post(validation_endpoint, json={
        "name": val_name,
        "description": "Cross-env validator",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return true; }",
        "errorMessage": "Always passes",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    target_public_id = res.json()["id"]

    # 2. Create a form referencing this validator (to anchor the form public_id)
    form_name = f"CrossEnv Validator Remap Test {generate_public_id()}"
    form_schema = {
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
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for cross-env validator remap test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 3. Export to get a valid container, then doctor it to simulate a source-env payload:
    #    - change the revision public_id so import creates a new revision
    #    - replace the validatorId in the schema with a "source env" public_id
    #    - replace the validator's public_id in dependencies to match
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    source_fake_public_id = f"source-env-{generate_public_id()}"
    new_revision_id = generate_public_id()

    # Simulate schema from source environment: validatorId is the source public_id
    export_payload["payload"]["latest_revision"]["public_id"] = new_revision_id
    export_payload["payload"]["latest_revision"]["form_schema"]["entities"]["field-1"][
        "attributes"]["validator"]["registryValidators"][0]["validatorId"] = source_fake_public_id

    # Simulate dependency entry from source environment
    assert len(export_payload["payload"]["dependencies"]["validations"]) == 1
    export_payload["payload"]["dependencies"]["validations"][0]["public_id"] = source_fake_public_id

    # 4. Check import
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    # Validator should be EXISTS (matched by name)
    val_check = next(
        (v for v in check_result["dependencies_check"]["validations"] if v["name"] == val_name),
        None,
    )
    assert val_check is not None
    assert val_check["status"] == "EXISTS"

    # 5. Execute import
    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 6. Re-export and verify the saved schema uses the TARGET public_id, not source's
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    saved_export = res.json()

    saved_validator_id = (
        saved_export["payload"]["latest_revision"]["form_schema"]
        ["entities"]["field-1"]["attributes"]["validator"]["registryValidators"][0]["validatorId"]
    )
    assert saved_validator_id == target_public_id, (
        f"Expected validatorId to be remapped to target public_id '{target_public_id}', "
        f"but got '{saved_validator_id}'"
    )

    # Cleanup
    requests.delete(f"{validation_endpoint}/{target_public_id}", headers=admin_auth_headers)


def test_migration_workflow_bundled_form_master_data(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #4: Workflow export with bundled form includes master data dependencies.
    Creates a form with getMasterData references, binds it to a workflow,
    exports the workflow, and verifies the bundled form's master_data
    is present and merged into the workflow import check.
    """
    # 1. Create a form with master data reference
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Bundled MD Test {generate_public_id()}"
    dataset_name = f"BundledTestDataset_{generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "dropdown",
                "attributes": {
                    "name": "vendor_select",
                    "defaultValue": {
                        "isReference": True,
                        "reference": f"getMasterData(\"{dataset_name}\").map(v => v.name)"
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for bundled MD test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 2. Create workflow and bind to form
    workflow_endpoint = f"{api_base_url}/workflow"
    workflow_name = f"Migration Bundled MD WF {generate_public_id()}"
    res = requests.post(workflow_endpoint, json={
        "name": workflow_name,
        "description": "Workflow for bundled MD test",
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
    res = requests.get(f"{api_base_url}/workflow/{workflow_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    wf_export = res.json()

    # Verify bundled form has master_data
    bundled_form = wf_export["payload"]["binding"]["bundled_form"]
    assert bundled_form is not None
    assert "master_data" in bundled_form["dependencies"]
    md_deps = bundled_form["dependencies"]["master_data"]
    assert len(md_deps) == 1
    assert md_deps[0]["dataset_name"] == dataset_name

    # 4. Check import — master data from bundled form should be merged
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=wf_export, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    # Master data from bundled form should appear in workflow check
    md_check = check_result["dependencies_check"]["master_data"]
    assert len(md_check) >= 1
    md_entry = next(
        (m for m in md_check if m["dataset_name"] == dataset_name), None
    )
    assert md_entry is not None
    assert md_entry["status"] == "MISSING"
    assert md_entry["severity"] == "WARNING"


def test_migration_form_export_deduplicates_master_data_references(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Test #5: Multiple getMasterData references to the same dataset
    are deduplicated in the export.
    """
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Migration Dedup MD Test {generate_public_id()}"
    dataset_name = f"SharedDataset_{generate_public_id()}"
    form_schema = {
        "root": ["field-1", "field-2", "field-3"],
        "entities": {
            "field-1": {
                "type": "dropdown",
                "attributes": {
                    "name": "select_a",
                    "defaultValue": {
                        "isReference": True,
                        "reference": f"getMasterData(\"{dataset_name}\").map(v => v.col_a)"
                    }
                }
            },
            "field-2": {
                "type": "dropdown",
                "attributes": {
                    "name": "select_b",
                    "label": {
                        "isReference": True,
                        "reference": f"getMasterData(\"{dataset_name}\")[0].col_b"
                    }
                }
            },
            "field-3": {
                "type": "dropdown",
                "attributes": {
                    "name": "select_c",
                    "placeholder": {
                        "isReference": True,
                        "reference": "getMasterData(\"AnotherDataset\").length"
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form with duplicate master data refs",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # Export
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    md_deps = export_payload["payload"]["dependencies"]["master_data"]
    dataset_names = [m["dataset_name"] for m in md_deps]

    # Should have exactly 2 unique datasets, not 3
    assert len(dataset_names) == 2
    assert dataset_name in dataset_names
    assert "AnotherDataset" in dataset_names


def test_migration_form_export_flat_validator_id(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Bug fix: form export must collect validators referenced via the flat
    validator.validatorId format (not only registryValidators[]).
    """
    validation_endpoint = f"{api_base_url}/validation-registry"

    # 1. Create a validator
    val_name = f"flat_val_{generate_public_id()}"
    res = requests.post(validation_endpoint, json={
        "name": val_name,
        "description": "Flat format validator",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return v.length > 0; }",
        "errorMessage": "Must not be empty",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    val_id = res.json()["id"]

    # 2. Create form with flat validatorId format (not registryValidators)
    form_endpoint = f"{api_base_url}/form"
    form_name = f"Flat Validator Export Test {generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "input",
                "attributes": {
                    "name": "test_input",
                    "inputType": "text",
                    "validator": {
                        "required": False,
                        "validatorId": val_id
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form with flat validatorId",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 3. Export
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    exported_val_ids = [v["public_id"] for v in export_payload["payload"]["dependencies"]["validations"]]
    assert val_id in exported_val_ids, (
        f"Flat validatorId '{val_id}' must appear in dependencies.validations but got: {exported_val_ids}"
    )

    # Cleanup
    requests.delete(f"{validation_endpoint}/{val_id}", headers=admin_auth_headers)


def test_migration_flat_validator_id_remapped_on_import(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Bug fix: flat validator.validatorId in the form schema must be remapped
    to the target environment's public_id on import.
    """
    validation_endpoint = f"{api_base_url}/validation-registry"
    form_endpoint = f"{api_base_url}/form"

    # 1. Create the validator in the target env (gets a target-native public_id)
    val_name = f"flat_remap_val_{generate_public_id()}"
    res = requests.post(validation_endpoint, json={
        "name": val_name,
        "description": "Flat remap validator",
        "validationType": "CODE",
        "validationCode": "function validate(v) { return true; }",
        "errorMessage": "Always passes",
        "components": ["input"]
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    target_public_id = res.json()["id"]

    # 2. Create a form with flat validatorId format
    form_name = f"Flat Validator Remap Test {generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "input",
                "attributes": {
                    "name": "test_field",
                    "inputType": "text",
                    "validator": {
                        "required": False,
                        "validatorId": target_public_id
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for flat validator remap test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 3. Export, then doctor to simulate a source-env payload
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    source_fake_id = f"SRC{generate_public_id()}"
    new_revision_id = generate_public_id()

    # Simulate source-env: schema and dependency entry both carry the source public_id
    export_payload["payload"]["latest_revision"]["public_id"] = new_revision_id
    export_payload["payload"]["latest_revision"]["form_schema"]["entities"]["field-1"][
        "attributes"]["validator"]["validatorId"] = source_fake_id

    assert len(export_payload["payload"]["dependencies"]["validations"]) == 1
    export_payload["payload"]["dependencies"]["validations"][0]["public_id"] = source_fake_id

    # 4. Check import
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    # 5. Execute import
    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 6. Re-export and verify the saved schema uses the TARGET public_id
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    saved_export = res.json()

    saved_validator_id = (
        saved_export["payload"]["latest_revision"]["form_schema"]
        ["entities"]["field-1"]["attributes"]["validator"]["validatorId"]
    )
    assert saved_validator_id == target_public_id, (
        f"Expected flat validatorId to be remapped to '{target_public_id}', got '{saved_validator_id}'"
    )

    # Cleanup
    requests.delete(f"{validation_endpoint}/{target_public_id}", headers=admin_auth_headers)


def test_migration_form_export_dynamic_dropdown_master_data(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Bug fix: form export must include master data referenced via
    datasourceType.table.tableKey (dynamic dropdown), not only getMasterData() expressions.
    """
    md_endpoint = f"{api_base_url}/master-data"
    form_endpoint = f"{api_base_url}/form"

    # 1. Create a master data dataset
    dataset_code = f"TEST_DYN_{generate_public_id().upper()[:8]}"
    dataset_name = f"Dynamic Dropdown Dataset {generate_public_id()}"
    res = requests.post(md_endpoint, json={
        "code": dataset_code,
        "name": dataset_name,
        "fields": [
            {"name": "code", "type": "TEXT", "required": True},
            {"name": "name", "type": "TEXT", "required": True}
        ]
    }, headers=admin_auth_headers)
    assert res.status_code == 201

    # 2. Create form with dynamic dropdown referencing the dataset via tableKey
    form_name = f"Dynamic Dropdown MD Test {generate_public_id()}"
    form_schema = {
        "root": ["field-1"],
        "entities": {
            "field-1": {
                "type": "dropdown",
                "attributes": {
                    "name": "drp_dynamic",
                    "datasourceType": {
                        "type": "dynamic",
                        "table": {
                            "tableKey": dataset_code,
                            "labelKey": "name",
                            "valueKey": "code"
                        }
                    }
                }
            }
        }
    }
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form with dynamic dropdown master data reference",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 3. Export and verify master_data dependencies include the dataset
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    md_deps = export_payload["payload"]["dependencies"]["master_data"]
    dataset_names_in_export = [m["dataset_name"] for m in md_deps]
    assert dataset_code in dataset_names_in_export, (
        f"Dynamic dropdown tableKey '{dataset_code}' must appear in "
        f"dependencies.master_data but got: {dataset_names_in_export}"
    )

    # Cleanup
    requests.delete(f"{md_endpoint}/{dataset_code}", headers=admin_auth_headers)


def test_migration_form_import_persists_permissions(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Bug fix: form import must write dependencies.permissions to FormPermission.
    """
    form_endpoint = f"{api_base_url}/form"

    # 1. Create a form
    form_name = f"Permission Import Test {generate_public_id()}"
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for permission import test",
        "is_template": False,
        "form_schema": {"root": [], "entities": {}},
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    form_id = res.json()["form_id"]

    # 2. Set permissions on the form
    permissions_endpoint = f"{api_base_url}/form/{form_id}/permissions"
    res = requests.put(permissions_endpoint, json=[
        {"grantee_type": "EVERYONE", "grantee_value": "", "action": "VIEW"},
        {"grantee_type": "EVERYONE", "grantee_value": "", "action": "USE"}
    ], headers=admin_auth_headers)
    assert res.status_code == 200

    # 3. Export the form
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    exported_perms = export_payload["payload"]["dependencies"]["permissions"]
    assert len(exported_perms) == 2, "Permissions must be present in export"

    # 4. Force a new revision so import creates UPDATE_REVISION
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()

    # 5. Clear all form permissions so the import must recreate them from the payload.
    #    This is the key assertion: without the fix, permissions would remain empty after import.
    res = requests.delete(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 204
    res = requests.get(permissions_endpoint, headers=admin_auth_headers)
    assert res.json() == [], "Permissions must be empty before import to validate the fix"

    # 6. Check then execute import
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 7. Verify permissions were written from the export payload.
    # GET /:id/permissions returns aggregated entries: [{grantee_type, grantee_value, actions: [{action}]}]
    res = requests.get(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    saved_perms = res.json()
    log.info(f"Saved form permissions after import: {saved_perms}")

    saved_actions = set()
    for entry in saved_perms:
        for a in entry.get("actions", []):
            saved_actions.add((entry["grantee_type"], a["action"]))

    assert ("EVERYONE", "VIEW") in saved_actions, "EVERYONE/VIEW permission must be persisted on import"
    assert ("EVERYONE", "USE") in saved_actions, "EVERYONE/USE permission must be persisted on import"


def test_migration_workflow_import_persists_permissions(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Bug fix: workflow import must write dependencies.permissions to WorkflowPermission.
    """
    workflow_endpoint = f"{api_base_url}/workflow"

    # 1. Create a workflow
    wf_name = f"WF Permission Import Test {generate_public_id()}"
    res = requests.post(workflow_endpoint, json={
        "name": wf_name,
        "description": "Workflow for permission import test",
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    workflow_id = res.json()["workflow_id"]

    # 2. Set permissions on the workflow
    permissions_endpoint = f"{api_base_url}/workflow/{workflow_id}/permissions"
    res = requests.put(permissions_endpoint, json=[
        {"grantee_type": "EVERYONE", "grantee_value": "", "action": "VIEW"},
        {"grantee_type": "EVERYONE", "grantee_value": "", "action": "USE"}
    ], headers=admin_auth_headers)
    assert res.status_code == 200

    # 3. Export the workflow
    res = requests.get(f"{api_base_url}/workflow/{workflow_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    exported_perms = export_payload["payload"]["dependencies"]["permissions"]
    assert len(exported_perms) == 2, "Permissions must be present in export"

    # 4. Force a new revision so import creates UPDATE_REVISION
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()

    # 5. Clear all workflow permissions so the import must recreate them from the payload.
    #    This is the key assertion: without the fix, permissions would remain empty after import.
    res = requests.delete(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 204
    res = requests.get(permissions_endpoint, headers=admin_auth_headers)
    assert res.json() == [], "Permissions must be empty before import to validate the fix"

    # 6. Check then execute import
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 7. Verify permissions were written from the export payload.
    # GET /:id/permissions returns aggregated entries: [{grantee_type, grantee_value, actions: [{action}]}]
    res = requests.get(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    saved_perms = res.json()
    log.info(f"Saved workflow permissions after import: {saved_perms}")

    saved_actions = set()
    for entry in saved_perms:
        for a in entry.get("actions", []):
            saved_actions.add((entry["grantee_type"], a["action"]))

    assert ("EVERYONE", "VIEW") in saved_actions, "EVERYONE/VIEW permission must be persisted on import"
    assert ("EVERYONE", "USE") in saved_actions, "EVERYONE/USE permission must be persisted on import"


def test_migration_permission_grantee_missing_shows_warning_and_skips(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
    temporary_user: Dict[str, Any],
    api_client,
):
    """
    When a permission grantee (USER) does not exist in the target environment:
    - check must report that permission row as MISSING/WARNING (not BLOCKING)
    - can_proceed must remain true
    - execute must skip the missing grantee's permission rows
    - EVERYONE rows must still be written
    """
    workflow_endpoint = f"{api_base_url}/workflow"

    # 1. Create a workflow
    wf_name = f"WF Perm Grantee Missing Test {generate_public_id()}"
    res = requests.post(workflow_endpoint, json={
        "name": wf_name,
        "description": "Test: missing permission grantee is skipped on import",
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    workflow_id = res.json()["workflow_id"]

    # 2. Grant permissions: one to the temporary user + EVERYONE VIEW
    user_id = temporary_user["id"]
    permissions_endpoint = f"{api_base_url}/workflow/{workflow_id}/permissions"
    res = requests.put(permissions_endpoint, json=[
        {"grantee_type": "USER", "grantee_value": str(user_id), "action": "USE"},
        {"grantee_type": "EVERYONE", "grantee_value": "", "action": "VIEW"},
    ], headers=admin_auth_headers)
    assert res.status_code == 200

    # 3. Export the workflow — payload now contains grantee_code for the USER entry
    res = requests.get(f"{api_base_url}/workflow/{workflow_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    exported_perms = export_payload["payload"]["dependencies"]["permissions"]
    user_perm = next((p for p in exported_perms if p["grantee_type"] == "USER"), None)
    assert user_perm is not None, "USER permission must be in the export"
    user_code = user_perm["grantee_code"]
    assert user_code is not None, "grantee_code must be populated on export"
    log.info(f"Exported user permission: grantee_code={user_code}")

    # 4. Force a new revision and clear permissions so import recreates them
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()
    res = requests.delete(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 204

    # 5. Hard-delete the temporary user to simulate cross-env: user does not exist in target
    api_client.delete(f"users/{user_id}/hard")

    # 6. Check import — USER grantee must appear as MISSING/WARNING, can_proceed must be true
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()

    assert check_result["can_proceed"] is True, "Missing permission grantee must NOT block import"

    perm_checks = check_result["dependencies_check"]["permissions"]
    log.info(f"Permission checks: {perm_checks}")

    user_perm_check = next(
        (p for p in perm_checks if p["grantee_type"] == "USER" and p["action"] == "USE"),
        None
    )
    assert user_perm_check is not None, "USER/USE permission check entry must be present"
    assert user_perm_check["status"] == "MISSING", "Missing grantee must have MISSING status"
    assert user_perm_check["severity"] == "WARNING", "Missing grantee must have WARNING severity"

    everyone_perm_check = next(
        (p for p in perm_checks if p["grantee_type"] == "EVERYONE"),
        None
    )
    assert everyone_perm_check is not None
    assert everyone_perm_check["status"] == "EXISTS"
    assert everyone_perm_check["severity"] == "INFO"

    # 7. Execute import — missing user permission must be skipped; EVERYONE must be written
    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    res = requests.get(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    saved_perms = res.json()
    log.info(f"Saved permissions after import with missing grantee: {saved_perms}")

    saved_grantee_types = {
        (entry["grantee_type"], a["action"])
        for entry in saved_perms
        for a in entry.get("actions", [])
    }
    assert ("EVERYONE", "VIEW") in saved_grantee_types, "EVERYONE/VIEW must still be written"
    assert ("USER", "USE") not in saved_grantee_types, "Deleted user permission must be skipped"


def test_migration_permission_grantee_remapped_to_target_id(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
    temporary_user: Dict[str, Any],
):
    """
    When a permission grantee (USER) exists in the target environment:
    - execute must write the permission using the TARGET environment's internal ID
      (resolved by grantee_code lookup), not the raw grantee_value from the payload.

    We prove this by injecting a deliberately wrong grantee_value in the export payload
    while keeping the correct grantee_code, then verifying the written row uses the
    real target ID.
    """
    workflow_endpoint = f"{api_base_url}/workflow"

    # 1. Create a workflow
    wf_name = f"WF Perm Remap Test {generate_public_id()}"
    res = requests.post(workflow_endpoint, json={
        "name": wf_name,
        "description": "Test: permission grantee_value is remapped from grantee_code",
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    workflow_id = res.json()["workflow_id"]

    # 2. Grant USE permission to the temporary user
    real_user_id = temporary_user["id"]
    user_code = temporary_user["code"]
    permissions_endpoint = f"{api_base_url}/workflow/{workflow_id}/permissions"
    res = requests.put(permissions_endpoint, json=[
        {"grantee_type": "USER", "grantee_value": str(real_user_id), "action": "USE"},
    ], headers=admin_auth_headers)
    assert res.status_code == 200

    # 3. Export
    res = requests.get(f"{api_base_url}/workflow/{workflow_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 4. Tamper: replace grantee_value with a fake source-env ID (simulates cross-env ID drift)
    #    but keep grantee_code intact so remapping can resolve the correct target ID.
    for perm in export_payload["payload"]["dependencies"]["permissions"]:
        if perm["grantee_type"] == "USER":
            assert perm["grantee_code"] == user_code, "grantee_code must match user code"
            perm["grantee_value"] = "99999"  # bogus source-env ID

    # 5. Force a new revision and clear permissions
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()
    res = requests.delete(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 204

    # 6. Check then execute import
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True

    user_perm_check = next(
        (p for p in check_result["dependencies_check"]["permissions"] if p["grantee_type"] == "USER"),
        None
    )
    assert user_perm_check is not None
    assert user_perm_check["status"] == "EXISTS", "User exists in target — should be EXISTS"

    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 7. Verify: the written permission has the TARGET env's real user ID, not "99999"
    res = requests.get(permissions_endpoint, headers=admin_auth_headers)
    assert res.status_code == 200
    saved_perms = res.json()
    log.info(f"Saved permissions after remap test: {saved_perms}")

    user_perm_written = next(
        (entry for entry in saved_perms if entry["grantee_type"] == "USER"),
        None
    )
    assert user_perm_written is not None, "USER permission must be written"
    assert user_perm_written["grantee_value"] == str(real_user_id), (
        f"grantee_value must be remapped to target ID {real_user_id}, "
        f"got {user_perm_written['grantee_value']}"
    )


def test_migration_form_fe_validation_included_in_export(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Bug fix (GBPM-740): fe_validation must be carried in the export payload.

    Creates a form revision with frontend validation rules set (using the real
    FormValidation / FormValidator schema), exports the form, and asserts that
    latest_revision.fe_validation in the export payload matches the original value.
    """
    form_endpoint = f"{api_base_url}/form"
    # field_name is attributes.name — used in getFormField() and listenFieldIds.
    # field_entity_id is the entity key (UUID) in form_schema.root / entities.
    field_name = "email_input"
    field_entity_id = f"entity-{generate_public_id()}"

    # FormValidation shape mirrors the real frontend payload:
    #   { required?, validators?: FormValidator[] }
    # FormValidator: { key, code, isApi, description, errorMessage, listenFieldIds }
    # Note: listenFieldIds holds field *name* values (attributes.name), not entity UUIDs.
    fe_validation = {
        "required": True,
        "validators": [
            {
                "key": "validator_email_required",
                "code": 'function validation() {\n  const val = getFormField("email_input").value;\n  return val != null && val.trim().length > 0;\n}',
                "isApi": False,
                "description": "",
                "errorMessage": "Email is required",
                "listenFieldIds": [field_name],
            }
        ]
    }
    form_schema = {
        "root": [field_entity_id],
        "entities": {
            field_entity_id: {
                "type": "input",
                "attributes": {
                    "name": field_name,
                    "inputType": "text",
                }
            }
        }
    }

    # 1. Create form (produces a DRAFT revision)
    form_name = f"FE Validation Export Test {generate_public_id()}"
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for fe_validation export test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    created = res.json()
    form_id = created["form_id"]
    revision_id = created["revision"]["revision_id"]

    # 2. Set validation and activate in one PATCH call (only DRAFT revisions can be updated)
    res = requests.patch(
        f"{form_endpoint}/revisions/{revision_id}",
        json={"validation": fe_validation, "status": "ACTIVE"},
        headers=admin_auth_headers,
    )
    assert res.status_code == 200

    # 3. Export the form
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 4. Assert fe_validation is present and correct in the export payload
    exported_fe_validation = export_payload["payload"]["latest_revision"].get("fe_validation")
    assert exported_fe_validation is not None, (
        "fe_validation must be present in the export payload but was missing"
    )
    assert exported_fe_validation == fe_validation, (
        f"Exported fe_validation does not match original.\n"
        f"Expected: {fe_validation}\nGot: {exported_fe_validation}"
    )

    # Cleanup
    requests.delete(f"{form_endpoint}/{form_id}/hard", headers=admin_auth_headers)


def test_migration_form_fe_validation_preserved_on_import(
    api_base_url: str,
    admin_auth_headers: Dict[str, Any],
):
    """
    Bug fix (GBPM-740): fe_validation must survive the full export/import round-trip.

    Creates a form with fe_validation set (using the real FormValidation /
    FormValidator schema), exports it, simulates a cross-env import by assigning
    a new revision public_id, executes the import, then reads the imported
    revision back and asserts validation matches the source.
    """
    form_endpoint = f"{api_base_url}/form"
    # field_name is attributes.name — used in getFormField() and listenFieldIds.
    # field_entity_id is the entity key (UUID) in form_schema.root / entities.
    field_name = "drp_static_1"
    field_entity_id = f"entity-{generate_public_id()}"

    # FormValidation shape mirrors the real frontend payload:
    #   { required?, validators?: FormValidator[] }
    # FormValidator: { key, code, isApi, description, errorMessage, listenFieldIds }
    # Note: listenFieldIds holds field *name* values (attributes.name), not entity UUIDs.
    fe_validation = {
        "required": True,
        "validators": [
            {
                "key": "validator_1775622793953",
                "code": 'function validation() {\n  const val = getFormField("drp_static_1").value;\n  if (val == null || val === "ZZZ" || val === "BBB") {\n    return false;\n  }\n  return true;\n}',
                "isApi": False,
                "description": "",
                "errorMessage": "Form level-不得選BBB或ZZZ",
                "listenFieldIds": [field_name],
            }
        ]
    }
    form_schema = {
        "root": [field_entity_id],
        "entities": {
            field_entity_id: {
                "type": "dropdown",
                "attributes": {
                    "name": field_name,
                }
            }
        }
    }

    # 1. Create form (DRAFT revision)
    form_name = f"FE Validation Import Test {generate_public_id()}"
    res = requests.post(form_endpoint, json={
        "name": form_name,
        "description": "Form for fe_validation import test",
        "is_template": False,
        "form_schema": form_schema,
        "tags": []
    }, headers=admin_auth_headers)
    assert res.status_code == 201
    created = res.json()
    form_id = created["form_id"]
    revision_id = created["revision"]["revision_id"]

    # 2. Set validation and activate
    res = requests.patch(
        f"{form_endpoint}/revisions/{revision_id}",
        json={"validation": fe_validation, "status": "ACTIVE"},
        headers=admin_auth_headers,
    )
    assert res.status_code == 200

    # 3. Export
    res = requests.get(f"{api_base_url}/form/{form_id}/export", headers=admin_auth_headers)
    assert res.status_code == 200
    export_payload = res.json()

    # 4. Simulate cross-env import: assign a new revision public_id so the importer
    #    takes the create path (rather than NO_CHANGE / update-same-id path)
    export_payload["payload"]["latest_revision"]["public_id"] = generate_public_id()

    # 5. Check import
    check_endpoint = f"{api_base_url}/import/check"
    res = requests.post(check_endpoint, json=export_payload, headers=admin_auth_headers)
    assert res.status_code == 201
    check_result = res.json()
    assert check_result["can_proceed"] is True
    assert check_result["summary"]["action"] == "UPDATE_REVISION"

    # 6. Execute import
    execute_endpoint = f"{api_base_url}/import/execute"
    res = requests.post(execute_endpoint, json=check_result, headers=admin_auth_headers)
    assert res.status_code == 201

    # 7. Read back the imported form and verify fe_validation was preserved
    res = requests.get(f"{form_endpoint}/{form_id}", headers=admin_auth_headers)
    assert res.status_code == 200
    imported_form = res.json()

    imported_validation = imported_form["revision"].get("validation")
    assert imported_validation is not None, (
        "fe_validation was lost during import — revision.validation is null on the imported form"
    )
    assert imported_validation == fe_validation, (
        f"fe_validation changed during import.\n"
        f"Expected: {fe_validation}\nGot: {imported_validation}"
    )

    # Cleanup
    requests.delete(f"{form_endpoint}/{form_id}/hard", headers=admin_auth_headers)
