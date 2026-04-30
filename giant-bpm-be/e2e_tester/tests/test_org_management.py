import json
import logging
import uuid
from utils.id_generator import generate_public_id
from typing import Dict, Any, Generator
from datetime import datetime, timedelta

import pytest
from requests import Response, exceptions

from api_client import APIClient

log = logging.getLogger(__name__)


def _assert_success_response(response: Response):
    """Asserts that the response has a successful status code."""
    assert 200 <= response.status_code < 300


def test_org_unit_crud(api_client: APIClient, temporary_org_unit: Dict[str, Any]):
    """
    Tests the Create, Read, and Update operations for an OrgUnit.
    Create is handled by the 'temporary_org_unit' fixture.
    Delete is handled by the 'temporary_org_unit' fixture's teardown.
    """
    # The fixture 'temporary_org_unit' handles creation.
    created_org_unit = temporary_org_unit
    org_unit_id = created_org_unit["id"]

    # 1. Read (GET)
    get_response = api_client.get(f"org-units/{org_unit_id}")
    _assert_success_response(get_response)
    fetched_org_unit = get_response.json()

    assert fetched_org_unit["id"] == org_unit_id
    assert fetched_org_unit["name"] == created_org_unit["name"]

    # 2. Update (PATCH)
    updated_name = f"{created_org_unit['name']} - Updated"
    update_payload = {"name": updated_name}
    update_response = api_client.patch(f"org-units/{org_unit_id}", json=update_payload)
    _assert_success_response(update_response)
    updated_org_unit = update_response.json()

    assert updated_org_unit["name"] == updated_name

    # 3. Verify update by reading again
    get_updated_response = api_client.get(f"org-units/{org_unit_id}")
    _assert_success_response(get_updated_response)
    fetched_updated_org_unit = get_updated_response.json()
    assert fetched_updated_org_unit["name"] == updated_name


def test_delete_org_unit(api_client: APIClient, temporary_org_unit: Dict[str, Any]):
    """
    Tests deleting an OrgUnit explicitly.
    The fixture ensures the OrgUnit is created and attempts cleanup,
    but this test performs the deletion action.
    """
    org_unit_to_delete = temporary_org_unit
    org_unit_id = org_unit_to_delete["id"]

    # Action: Delete the OrgUnit
    delete_response = api_client.delete(f"org-units/{org_unit_id}")
    _assert_success_response(delete_response)

    # Verification: Check that it's gone (expecting a 404)
    with pytest.raises(exceptions.HTTPError) as excinfo:
        api_client.get(f"org-units/{org_unit_id}")
    assert excinfo.value.response.status_code == 404


def test_list_org_units(api_client: APIClient, temporary_org_unit: Dict[str, Any]):
    """
    Tests listing all OrgUnits.
    GBPM-729: Each item must include a heads field (array of UserDto).
    """
    list_response = api_client.get("org-units")
    _assert_success_response(list_response)
    listed_org_units = list_response.json()

    assert any(ou["id"] == temporary_org_unit["id"] for ou in listed_org_units)

    # GBPM-729: every item must have a heads field that is a list
    for ou in listed_org_units:
        assert "heads" in ou, f"org unit {ou.get('id')} is missing the heads field"
        assert isinstance(ou["heads"], list)


def test_list_org_units_with_filters(
    api_client: APIClient,
    temporary_org_unit: Dict[str, Any],
    request: pytest.FixtureRequest,
):
    """
    Tests listing OrgUnits with name filters.
    """
    org_unit_endpoint = "org-units"
    org_id = temporary_org_unit["id"]
    org_name = temporary_org_unit["name"]

    # 1. Filter by name (full match)
    res = api_client.get(org_unit_endpoint, params={"name": org_name})
    units = res.json()
    assert any(u["id"] == org_id for u in units)

    # 2. Filter by name (partial match, case-insensitive)
    partial_name = org_name[1:-1].upper()
    res = api_client.get(org_unit_endpoint, params={"name": partial_name})
    units = res.json()
    assert any(u["id"] == org_id for u in units)

    # 3. Create a ROLE and filter by its name
    role_code = f"TEST_ROLE_{generate_public_id().upper()}"
    role_name = f"Test Role {role_code}"
    role_data = {
        "code": role_code,
        "name": role_name,
        "type": "ROLE",
        "parentCode": None
    }
    role_res = api_client.post(org_unit_endpoint, json=role_data)
    created_role = role_res.json()
    role_id = created_role["id"]

    try:
        # Filter by ROLE name
        res = api_client.get(org_unit_endpoint, params={"name": role_name})
        units = res.json()
        assert any(u["id"] == role_id for u in units)
        assert any(u["type"] == "ROLE" for u in units if u["id"] == role_id)
    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{org_unit_endpoint}/{role_id}")


def test_org_membership_apis(
    api_client: APIClient,
    temporary_user_b: Dict[str, Any],
    temporary_org_unit: Dict[str, Any],
    temporary_org_membership: Dict[str, Any],
    request: pytest.FixtureRequest,
):
    """
    Tests the APIs related to OrgMembership, using a fixture for creation
    and conditionally testing deletion.
    """
    org_unit_id = temporary_org_unit["id"]
    user_id = temporary_user_b["id"]

    # 1. CREATE is handled by the 'temporary_org_membership' fixture.
    created_membership = temporary_org_membership
    membership_id = created_membership["id"]
    log.info(f"Using OrgMembership with ID: {membership_id} from fixture.")
    assert created_membership["orgUnitId"] == org_unit_id
    assert created_membership["userId"] == user_id

    # 2. GET OrgUnitUsers (expects OrgMemberDto)
    get_users_response = api_client.get(f"org-units/{org_unit_id}/users")
    _assert_success_response(get_users_response)
    org_unit_users = get_users_response.json()
    assert any(member["user"]["id"] == user_id for member in org_unit_users)

    log.info(f'organizaion-{org_unit_id} members:')
    for member in org_unit_users:
        log.info(f'\n{json.dumps(member, indent=4)}')

    # 3. GET OrgMembershipsByUser (expects OrgMemberDto)
    get_user_memberships_response = api_client.get(f"org-units/memberships/user/{user_id}")
    _assert_success_response(get_user_memberships_response)
    user_memberships = get_user_memberships_response.json()
    assert any(member["orgUnitCode"] == temporary_org_unit["code"] for member in user_memberships)
    assert any(member["user"]["id"] == user_id for member in user_memberships)

    log.info(f'membersihp for userid = {user_id}')
    for member in user_memberships:
        log.info(f'\n{json.dumps(member, indent=4)}')

    # 4. UPDATE OrgMembership
    updated_note = "Updated test membership note"
    update_payload = {"note": updated_note, "assignType": "HEAD"}
    update_response = api_client.patch(f"org-units/memberships/{membership_id}", json=update_payload)
    _assert_success_response(update_response)
    updated_membership = update_response.json()
    assert updated_membership["note"] == updated_note
    assert updated_membership["assignType"] == "HEAD"

    log.info(f'updated membership:\n{json.dumps(updated_membership, indent=4)}')

    # 4.1 TEST Indefinite Toggle (Create)
    # Use a start date far in the future to avoid overlap with existing membership
    future_start = (datetime.now() + timedelta(days=400)).isoformat(timespec='milliseconds') + "Z"
    indefinite_membership_payload = {
        "orgUnitCode": temporary_org_unit["code"],
        "userId": user_id,
        "assignType": "USER",
        "startDate": future_start,
        "isIndefinite": True
    }
    inf_res = api_client.post("org-units/memberships", json=indefinite_membership_payload)
    _assert_success_response(inf_res)
    inf_membership = inf_res.json()
    assert inf_membership["endDate"].startswith("2999-12-31")
    inf_id = inf_membership["id"]

    # Clean up the extra membership
    api_client.delete(f"org-units/memberships/{inf_id}/hard")

    # 4.2 TEST Indefinite Toggle (Update)
    # Reset existing membership to indefinite
    api_client.patch(f"org-units/memberships/{membership_id}", json={"isIndefinite": True})
    updated_inf_res = api_client.get(f"org-units/memberships/user/{user_id}")
    updated_inf = next(m for m in updated_inf_res.json() if m["id"] == membership_id)
    assert updated_inf["endDate"].startswith("2999-12-31")

    # 5. GET OrgUnitHeads (expects OrgMemberDto)
    get_heads_response = api_client.get(f"org-units/{org_unit_id}/heads")
    _assert_success_response(get_heads_response)
    org_unit_heads = get_heads_response.json()
    assert any(member["user"]["id"] == user_id for member in org_unit_heads)

    # 6. DELETE and VERIFY only if --keep-data is not specified
    if not request.config.getoption("--keep-data"):
        log.info(f"Testing deletion for OrgMembership ID: {membership_id}")
        # 6. DELETE OrgMembership
        delete_response = api_client.delete(f"org-units/memberships/{membership_id}")
        _assert_success_response(delete_response)

        # 7. VERIFY membership is gone
        get_after_delete_response = api_client.get(f"org-units/memberships/user/{user_id}")
        _assert_success_response(get_after_delete_response)
        user_memberships_after_delete = get_after_delete_response.json()
        assert not any(m["id"] == membership_id for m in user_memberships_after_delete)
    else:
        log.info("Skipping deletion test for OrgMembership due to --keep-data flag.")

def test_create_org_unit_with_deleted_code_conflict(api_client: APIClient):
    """
    TEST Creating an OrgUnit with a code that belongs to a soft-deleted org unit
    should return 409 with structured conflict info (code, deletedId, deletedAt).
    """
    org_unit_endpoint = "org-units"
    test_uuid = generate_public_id()
    org_data = {
        "name": f"Test-Org-Unit {test_uuid}",
        "type": "ORG_UNIT",
        "code": f"TOU-{test_uuid}",
    }

    org_id = None
    try:
        # 1. Create
        created = api_client.post(org_unit_endpoint, json=org_data).json()
        org_id = created["id"]

        # 2. Soft-delete
        api_client.delete(f"{org_unit_endpoint}/{org_id}")

        # 3. Attempt re-create → expect 409
        response = api_client.post(org_unit_endpoint, json=org_data, raise_for_status=False)
        assert response.status_code == 409
        body = response.json()
        assert body["code"] == "ORG_UNIT_CODE_CONFLICT_DELETED"
        assert body["deletedId"] == org_id
        assert "deletedAt" in body
    finally:
        if org_id is not None:
            try:
                api_client.delete(f"{org_unit_endpoint}/{org_id}/hard")
            except:
                pass


def test_org_unit_create_with_invalid_parent(api_client: APIClient):
    """
    TEST Creating new OrgUnit with a non-existent parent ID should return 404.
    """
    org_unit_endpoint = "org-units"
    test_uuid = generate_public_id()
    org_unit_data = {
        "name": f"Test-Org-Unit {test_uuid}",
        "type": "ORG_UNIT",
        "parentCode": "NON_EXISTENT_PARENT_CODE",  # Non-existent parent code
        "code": f"TOU-{test_uuid}"
    }

    with pytest.raises(exceptions.HTTPError) as excinfo:
        api_client.post(org_unit_endpoint, json=org_unit_data)

    log.info(f"Received error response: {excinfo.value.response.json()}")
    assert excinfo.value.response.status_code == 404


def test_org_unit_by_code_apis(
    api_client: APIClient,
    temporary_org_unit: Dict[str, Any],
    temporary_org_membership: Dict[str, Any],
    temporary_user_b: Dict[str, Any]
):
    """
    Tests the new API endpoints that operate on OrgUnit Code instead of ID.
    - GET /org-units/code/:code
    - PATCH /org-units/code/:code
    - GET /org-units/code/:code/heads
    - GET /org-units/code/:code/users
    - DELETE /org-units/code/:code (Manual cleanup, since fixture handles ID-based deletion)
    """
    org_code = temporary_org_unit["code"]
    user_id = temporary_user_b["id"]

    # 1. GET by Code
    get_response = api_client.get(f"org-units/code/{org_code}")
    _assert_success_response(get_response)
    fetched_org = get_response.json()
    assert fetched_org["id"] == temporary_org_unit["id"]
    assert fetched_org["code"] == org_code

    # 2. PATCH by Code
    updated_name = f"{temporary_org_unit['name']} (Patched via Code)"
    update_payload = {"name": updated_name}
    patch_response = api_client.patch(f"org-units/code/{org_code}", json=update_payload)
    _assert_success_response(patch_response)
    updated_org = patch_response.json()
    assert updated_org["name"] == updated_name

    # Verify update via standard GET
    verify_response = api_client.get(f"org-units/{temporary_org_unit['id']}")
    assert verify_response.json()["name"] == updated_name

    # 3. GET Heads by Code
    # The fixture 'temporary_org_membership' creates a member, let's update it to HEAD to test this
    membership_id = temporary_org_membership["id"]
    api_client.patch(f"org-units/memberships/{membership_id}", json={"assignType": "HEAD"})

    heads_response = api_client.get(f"org-units/code/{org_code}/heads")
    _assert_success_response(heads_response)
    heads = heads_response.json()
    assert len(heads) > 0
    assert any(h["user"]["id"] == user_id for h in heads)

    # 4. GET Users by Code (assignType=ALL because the membership was changed to HEAD above)
    users_response = api_client.get(f"org-units/code/{org_code}/users?assignType=ALL")
    _assert_success_response(users_response)
    users = users_response.json()
    assert len(users) > 0
    assert any(u["user"]["id"] == user_id for u in users)


def test_delete_org_unit_by_code(api_client: APIClient, request: pytest.FixtureRequest):
    """
    Tests DELETE /org-units/code/:code endpoint.
    Creates a standalone OrgUnit to avoid FK constraint violations.
    """
    # 1. Create a standalone OrgUnit
    org_unit_endpoint = "org-units"
    org_unit_code = f"DEL_TEST_{generate_public_id().upper()}"
    org_unit_data = {
        "code": org_unit_code,
        "name": f"Delete Test Org Unit {org_unit_code}",
        "type": "ORG_UNIT",
        "parentCode": None
    }
    response = api_client.post(org_unit_endpoint, json=org_unit_data)
    _assert_success_response(response)
    created_org_unit = response.json()

    # 2. DELETE by Code
    delete_response = api_client.delete(f"org-units/code/{org_unit_code}")
    _assert_success_response(delete_response)

    # 3. Verify deletion
    with pytest.raises(exceptions.HTTPError) as excinfo:
        api_client.get(f"org-units/code/{org_unit_code}")
    assert excinfo.value.response.status_code == 404

    # 4. Verify ID-based access also fails
    with pytest.raises(exceptions.HTTPError) as excinfo:
        api_client.get(f"org-units/{created_org_unit['id']}")
    assert excinfo.value.response.status_code == 404

def test_org_membership_overlap_prevention(
    api_client: APIClient,
    temporary_user: Dict[str, Any],
    temporary_org_unit: Dict[str, Any],
    request: pytest.FixtureRequest,
):
    """
    Tests that overlapping date ranges for the same user and org unit are prevented.
    """
    org_code = temporary_org_unit["code"]
    user_id = temporary_user["id"]
    endpoint = "org-units/memberships"

    # Cleanup default membership created by fixture to allow fresh testing
    # The fixture creates an indefinite membership starting NOW
    current_memberships = api_client.get(f"org-units/memberships/user/{user_id}").json()
    for m in current_memberships:
        if m["orgUnitCode"] == org_code:
            api_client.delete(f"org-units/memberships/{m['id']}")

    # Base dates
    base_start = datetime.utcnow() + timedelta(days=1)
    base_end = base_start + timedelta(days=30)

    # 1. Create initial membership
    payload = {
        "orgUnitCode": org_code,
        "userId": user_id,
        "assignType": "USER",
        "startDate": base_start.isoformat() + "Z",
        "endDate": base_end.isoformat() + "Z",
        "isIndefinite": False
    }
    res = api_client.post(endpoint, json=payload)
    _assert_success_response(res)
    membership_id = res.json()["id"]

    try:
        # 2. Try to create an overlapping membership (fully inside)
        overlap_payload = payload.copy()
        overlap_payload["startDate"] = (base_start + timedelta(days=5)).isoformat() + "Z"
        overlap_payload["endDate"] = (base_start + timedelta(days=10)).isoformat() + "Z"

        with pytest.raises(exceptions.HTTPError) as excinfo:
            api_client.post(endpoint, json=overlap_payload)
        assert excinfo.value.response.status_code == 400
        assert "overlap" in excinfo.value.response.json()["message"].lower()

        # 3. Try to create an overlapping membership (partially overlapping - start before, end inside)
        overlap_payload_2 = payload.copy()
        overlap_payload_2["startDate"] = (base_start - timedelta(days=5)).isoformat() + "Z"
        overlap_payload_2["endDate"] = (base_start + timedelta(days=5)).isoformat() + "Z"

        with pytest.raises(exceptions.HTTPError) as excinfo:
            api_client.post(endpoint, json=overlap_payload_2)
        assert excinfo.value.response.status_code == 400

        # 4. Try to create an overlapping membership (partially overlapping - start inside, end after)
        overlap_payload_3 = payload.copy()
        overlap_payload_3["startDate"] = (base_start + timedelta(days=25)).isoformat() + "Z"
        overlap_payload_3["endDate"] = (base_start + timedelta(days=35)).isoformat() + "Z"

        with pytest.raises(exceptions.HTTPError) as excinfo:
            api_client.post(endpoint, json=overlap_payload_3)
        assert excinfo.value.response.status_code == 400

        # 5. Try to create an overlapping membership (surrounding)
        overlap_payload_4 = payload.copy()
        overlap_payload_4["startDate"] = (base_start - timedelta(days=5)).isoformat() + "Z"
        overlap_payload_4["endDate"] = (base_end + timedelta(days=5)).isoformat() + "Z"

        with pytest.raises(exceptions.HTTPError) as excinfo:
            api_client.post(endpoint, json=overlap_payload_4)
        assert excinfo.value.response.status_code == 400

        # 6. Create a non-overlapping membership (after)
        non_overlap_payload = payload.copy()
        non_overlap_payload["startDate"] = (base_end + timedelta(days=1)).isoformat() + "Z"
        non_overlap_payload["endDate"] = (base_end + timedelta(days=10)).isoformat() + "Z"
        res_ok = api_client.post(endpoint, json=non_overlap_payload)
        _assert_success_response(res_ok)
        membership_id_2 = res_ok.json()["id"]

        # 7. Try to update membership_id_2 to overlap with membership_id
        update_payload = {
            "startDate": (base_start + timedelta(days=5)).isoformat() + "Z"
        }
        with pytest.raises(exceptions.HTTPError) as excinfo:
            api_client.patch(f"{endpoint}/{membership_id_2}", json=update_payload)
        assert excinfo.value.response.status_code == 400

    finally:
        if not request.config.getoption("--keep-data"):
            api_client.delete(f"{endpoint}/{membership_id}")
            # membership_id_2 might not have been created if test failed early
            try:
                api_client.delete(f"{endpoint}/{membership_id_2}")
            except:
                pass


def test_org_membership_cross_type_overlap_prevented(
    api_client: APIClient,
    request: pytest.FixtureRequest,
):
    """
    Overlapping memberships of DIFFERENT assignType (USER vs HEAD) for the same
    user and org must also be rejected with 400. Only one active membership per
    (User, OrgUnit) is allowed regardless of assignType. Admin must manually
    close the existing membership before creating a new one of a different type.
    """
    uid = generate_public_id()
    org_code = f"org_{uid}"
    user_code = f"user_{uid}"
    endpoint = "org-units/memberships"
    user_membership_id = None

    try:
        api_client.post("org-units", json={"code": org_code, "name": f"Org {uid}", "type": "ORG_UNIT"})
        user = api_client.post("users", json={
            "code": user_code,
            "name": f"User {uid}",
            "jobGrade": 1,
            "defaultOrgCode": "UNASSIGNED",
        }).json()
        user_id = user["id"]

        base_start = datetime.utcnow() + timedelta(days=1)
        base_end = base_start + timedelta(days=30)

        # Create an initial USER membership
        res = api_client.post(endpoint, json={
            "orgUnitCode": org_code,
            "userId": user_id,
            "assignType": "USER",
            "startDate": base_start.isoformat() + "Z",
            "endDate": base_end.isoformat() + "Z",
            "isIndefinite": False,
        })
        _assert_success_response(res)
        user_membership_id = res.json()["id"]

        # Try to add a HEAD membership that overlaps the USER period — must be rejected
        with pytest.raises(exceptions.HTTPError) as excinfo:
            api_client.post(endpoint, json={
                "orgUnitCode": org_code,
                "userId": user_id,
                "assignType": "HEAD",
                "startDate": (base_start + timedelta(days=5)).isoformat() + "Z",
                "endDate": (base_start + timedelta(days=10)).isoformat() + "Z",
                "isIndefinite": False,
            })
        assert excinfo.value.response.status_code == 400
        assert "overlap" in excinfo.value.response.json()["message"].lower()

    finally:
        if not request.config.getoption("--keep-data"):
            if user_membership_id:
                try:
                    api_client.delete(f"{endpoint}/{user_membership_id}")
                except:
                    pass
            try:
                api_client.delete(f"users/code/{user_code}")
            except:
                pass
            try:
                api_client.delete(f"org-units/code/{org_code}")
            except:
                pass


def test_head_not_in_default_users_list(api_client: APIClient):
    """
    GBPM-691/708: HEAD members must not appear in GET /org-units/:id/users (default
    assignType=USER). They must appear with ?assignType=HEAD or ?assignType=ALL.
    GBPM-721: Each member's nested user object must include correct defaultOrgId
    and defaultOrgCode.
    """
    uid = generate_public_id()
    org_code = f"org_{uid}"
    user_code = f"user_{uid}"
    head_code = f"head_{uid}"

    try:
        org = api_client.post("org-units", json={
            "code": org_code,
            "name": f"Org {uid}",
            "type": "ORG_UNIT",
        }).json()
        org_id = org["id"]

        now = datetime.utcnow()
        start = (now - timedelta(days=1)).isoformat() + "Z"

        # User A — USER membership via defaultOrgCode (syncMembershipAndPreference)
        user_a = api_client.post("users", json={
            "code": user_code,
            "name": f"User {uid}",
            "jobGrade": 1,
            "defaultOrgCode": org_code,
        }).json()
        user_a_id = user_a["id"]

        # User B — HEAD membership added manually
        user_b = api_client.post("users", json={
            "code": head_code,
            "name": f"Head {uid}",
            "jobGrade": 1,
            "defaultOrgCode": "UNASSIGNED",
        }).json()
        user_b_id = user_b["id"]
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org_code,
            "userId": user_b_id,
            "assignType": "HEAD",
            "startDate": start,
            "endDate": "2999-12-31T23:59:59Z",
        })

        # Default (assignType=USER) — User A present, User B absent
        default_members = api_client.get(f"org-units/{org_id}/users").json()
        default_ids = [m["user"]["id"] for m in default_members]
        assert user_a_id in default_ids
        assert user_b_id not in default_ids

        # GBPM-721: member's user object has correct defaultOrgId/defaultOrgCode
        user_a_member = next(m for m in default_members if m["user"]["id"] == user_a_id)
        assert user_a_member["user"]["defaultOrgId"] == org_id
        assert user_a_member["user"]["defaultOrgCode"] == org_code

        # assignType=HEAD — User B present, User A absent
        head_members = api_client.get(f"org-units/{org_id}/users", params={"assignType": "HEAD"}).json()
        head_ids = [m["user"]["id"] for m in head_members]
        assert user_b_id in head_ids
        assert user_a_id not in head_ids

        # assignType=ALL — both present
        all_members = api_client.get(f"org-units/{org_id}/users", params={"assignType": "ALL"}).json()
        all_ids = [m["user"]["id"] for m in all_members]
        assert user_a_id in all_ids
        assert user_b_id in all_ids

        # GBPM-729: GET /org-units list includes heads field with the HEAD user
        listed = api_client.get("org-units").json()
        target = next((ou for ou in listed if ou["id"] == org_id), None)
        assert target is not None
        assert "heads" in target
        head_ids_in_list = [u["id"] for u in target["heads"]]
        assert user_b_id in head_ids_in_list
        assert user_a_id not in head_ids_in_list

    finally:
        try:
            api_client.delete(f"users/code/{user_code}")
        except:
            pass
        try:
            api_client.delete(f"users/code/{head_code}")
        except:
            pass
        try:
            api_client.delete(f"org-units/code/{org_code}")
        except:
            pass


def test_org_members_status_and_deleted_filters(api_client: APIClient):
    """
    GBPM-708: status=expired returns only expired memberships; default (active)
    excludes them. includeDeleted=true surfaces soft-deleted users.
    """
    uid = generate_public_id()
    org_code = f"org_{uid}"
    active_code = f"active_{uid}"
    expired_code = f"expired_{uid}"
    deleted_code = f"deleted_{uid}"
    active_id = None
    expired_id = None
    deleted_id = None

    try:
        org = api_client.post("org-units", json={
            "code": org_code,
            "name": f"Org {uid}",
            "type": "ORG_UNIT",
        }).json()
        org_id = org["id"]

        now = datetime.utcnow()

        # Active user — membership running now → 2999
        active_user = api_client.post("users", json={
            "code": active_code,
            "name": f"Active {uid}",
            "jobGrade": 1,
            "defaultOrgCode": "UNASSIGNED",
        }).json()
        active_id = active_user["id"]
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org_code,
            "userId": active_id,
            "assignType": "USER",
            "startDate": (now - timedelta(days=5)).isoformat() + "Z",
            "endDate": "2999-12-31T23:59:59Z",
        })

        # Expired user — membership entirely in the past
        expired_user = api_client.post("users", json={
            "code": expired_code,
            "name": f"Expired {uid}",
            "jobGrade": 1,
            "defaultOrgCode": "UNASSIGNED",
        }).json()
        expired_id = expired_user["id"]
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org_code,
            "userId": expired_id,
            "assignType": "USER",
            "startDate": (now - timedelta(days=10)).isoformat() + "Z",
            "endDate": (now - timedelta(days=1)).isoformat() + "Z",
        })

        # Deleted user — active membership, but user is soft-deleted
        deleted_user = api_client.post("users", json={
            "code": deleted_code,
            "name": f"Deleted {uid}",
            "jobGrade": 1,
            "defaultOrgCode": "UNASSIGNED",
        }).json()
        deleted_id = deleted_user["id"]
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org_code,
            "userId": deleted_id,
            "assignType": "USER",
            "startDate": (now - timedelta(days=5)).isoformat() + "Z",
            "endDate": "2999-12-31T23:59:59Z",
        })
        api_client.delete(f"users/{deleted_id}")  # soft-delete

        # Default (active, non-deleted) — only active_id
        default_members = api_client.get(f"org-units/{org_id}/users").json()
        default_ids = [m["user"]["id"] for m in default_members]
        assert active_id in default_ids
        assert expired_id not in default_ids
        assert deleted_id not in default_ids

        # status=expired — only expired_id
        expired_members = api_client.get(
            f"org-units/{org_id}/users", params={"status": "expired"}
        ).json()
        expired_member_ids = [m["user"]["id"] for m in expired_members]
        assert expired_id in expired_member_ids
        assert active_id not in expired_member_ids
        assert deleted_id not in expired_member_ids

        # status=all + includeDeleted=true — active and deleted user both present
        all_with_deleted = api_client.get(
            f"org-units/{org_id}/users",
            params={"status": "all", "includeDeleted": "true"},
        ).json()
        all_deleted_ids = [m["user"]["id"] for m in all_with_deleted]
        assert active_id in all_deleted_ids
        assert deleted_id in all_deleted_ids

    finally:
        try:
            api_client.delete(f"users/code/{active_code}")
        except:
            pass
        try:
            api_client.delete(f"users/code/{expired_code}")
        except:
            pass
        if deleted_id is not None:
            try:
                api_client.delete(f"users/{deleted_id}/hard")
            except:
                pass
        try:
            api_client.delete(f"org-units/code/{org_code}")
        except:
            pass
