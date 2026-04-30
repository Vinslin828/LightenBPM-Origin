import requests
import json
import logging
from utils.id_generator import generate_public_id
from typing import Dict, Any
import pytest # Import pytest
from api_client import APIClient

log = logging.getLogger(__name__)

def test_get_user(
    api_client: APIClient,
    temporary_user: Dict[str, Any],
):
    """
    Tests getting a User by ID.
    """
    user_endpoint = "users"
    user_id = temporary_user["id"]

    get_response = api_client.get(f"{user_endpoint}/{user_id}")
    fetched_user = get_response.json()

    assert fetched_user["id"] == user_id
    assert fetched_user["name"] == temporary_user["name"]
    assert "defaultOrgId" in fetched_user
    assert "defaultOrgCode" in fetched_user
    assert fetched_user["defaultOrgId"] == temporary_user["defaultOrgId"]
    assert fetched_user["defaultOrgCode"] == temporary_user["defaultOrgCode"]

def test_update_user(
    api_client: APIClient,
    temporary_user: Dict[str, Any],
):
    """
    Tests updating a User.
    """
    user_endpoint = "users"
    user_id = temporary_user["id"]

    updated_name = f"{temporary_user['name']}-updated"
    update_payload = {"name": updated_name, "jobGrade": 5}

    update_response = api_client.patch(f"{user_endpoint}/{user_id}", json=update_payload)
    updated_user = update_response.json()

    assert updated_user["name"] == updated_name
    assert updated_user["jobGrade"] == 5

def test_list_users(
    api_client: APIClient,
    temporary_user: Dict[str, Any],
):
    """
    Tests listing all Users.
    """
    user_endpoint = "users"

    list_response = api_client.get(user_endpoint)
    listed_users = list_response.json()

    assert "items" in listed_users
    assert "total" in listed_users
    assert listed_users["page"] == 1
    assert listed_users["limit"] == 50
    assert any(u["id"] == temporary_user["id"] for u in listed_users["items"])

def test_list_users_with_filters(
    api_client: APIClient,
    temporary_user: Dict[str, Any],
    temporary_org_unit: Dict[str, Any],
):
    """
    Tests listing Users with advanced filter (search as keyword).
    """
    user_endpoint = "users"
    user_id = temporary_user["id"]
    user_name = temporary_user["name"]
    user_email = temporary_user["email"]
    org_name = temporary_org_unit["name"]

    # 1. Filter by search matching name (full match)
    res = api_client.get(user_endpoint, params={"search": user_name})
    users = res.json()["items"]
    assert any(u["id"] == user_id for u in users)

    # 2. Filter by search matching name (partial match, case-insensitive)
    partial_name = user_name[1:-1].upper()
    res = api_client.get(user_endpoint, params={"search": partial_name})
    users = res.json()["items"]
    assert any(u["id"] == user_id for u in users)

    # 3. Filter by search matching email (partial match, case-insensitive)
    partial_email = user_email[1:-1].upper()
    res = api_client.get(user_endpoint, params={"search": partial_email})
    users = res.json()["items"]
    assert any(u["id"] == user_id for u in users)

    # 4. Filter by search matching org name (partial match, case-insensitive)
    # partial_org = org_name[1:-1].upper()
    # res = api_client.get(user_endpoint, params={"search": partial_org})
    # users = res.json()["items"]
    # assert any(u["id"] == user_id for u in users)
    # Hide this test case since this feature was disabled in BE

    # 5. Filter with a term that doesn't match anything
    res = api_client.get(user_endpoint, params={"search": "non-existent-keyword-12345"})
    users = res.json()["items"]
    assert not any(u["id"] == user_id for u in users)

def test_list_users_pagination(
    api_client: APIClient,
    temporary_user: Dict[str, Any],
):
    """
    Tests paginated listing of Users with explicit page and limit params.
    """
    user_endpoint = "users"

    res = api_client.get(user_endpoint, params={"page": 1, "limit": 2})
    body = res.json()

    assert "items" in body
    assert "total" in body
    assert "page" in body
    assert "limit" in body
    assert "totalPages" in body
    assert body["page"] == 1
    assert body["limit"] == 2
    assert len(body["items"]) <= 2

def test_list_users_pagination_with_search(
    api_client: APIClient,
    temporary_user: Dict[str, Any],
):
    """
    Tests pagination combined with search filter.
    """
    user_endpoint = "users"
    user_name = temporary_user["name"]

    res = api_client.get(user_endpoint, params={"search": user_name, "page": 1, "limit": 5})
    body = res.json()

    assert body["page"] == 1
    assert body["limit"] == 5
    assert len(body["items"]) <= 5
    assert any(u["id"] == temporary_user["id"] for u in body["items"])

def test_create_user_with_deleted_code_conflict(api_client: APIClient):
    """
    TEST Creating a user with a code that belongs to a soft-deleted user
    should return 409 with structured conflict info (code, deletedId, deletedAt).
    """
    user_endpoint = "users"
    user_uuid = generate_public_id()
    user_data = {
        "name": f"test-user-{user_uuid}",
        "code": f"uc_{user_uuid}",
        "jobGrade": 3,
        "defaultOrgCode": "UNASSIGNED",
    }

    user_id = None
    try:
        # 1. Create user
        created = api_client.post(user_endpoint, json=user_data).json()
        user_id = created["id"]

        # 2. Soft-delete
        api_client.delete(f"{user_endpoint}/{user_id}")

        # 3. Attempt re-create with same code → expect 409
        response = api_client.post(user_endpoint, json=user_data, raise_for_status=False)
        assert response.status_code == 409
        body = response.json()
        assert body["code"] == "USER_CODE_CONFLICT_DELETED"
        assert body["deletedId"] == user_id
        assert "deletedAt" in body
    finally:
        if user_id is not None:
            try:
                api_client.delete(f"{user_endpoint}/{user_id}/hard")
            except:
                pass


def test_create_user_with_invalid_deforg(
        api_client: APIClient,
):
    """
    TEST Creating new user with non-existent org id should return 404.
    """
    user_endpoint = "users"
    user_uuid = generate_public_id()
    user_data = {
        "name": f"test-user-{user_uuid}",
        "sub": f"sub-{user_uuid}",
        "code": f"uc_{user_uuid}",
        "email": f"test.user.{user_uuid}@example.com",
        "jobGrade": 100,
        "defaultOrgCode": "NON_EXISTENT_ORG_CODE", # non-exist org code
    }

    with pytest.raises(requests.exceptions.HTTPError) as excinfo:
        api_client.post(user_endpoint, json=user_data)

    log.info(f'{excinfo.value.response.json()}')
    assert excinfo.value.response.status_code == 404

def test_create_user_without_optional_fields(
        api_client: APIClient,
):
    """
    TEST Creating new user without sub and email should succeed.
    """
    user_endpoint = "users"
    user_uuid = generate_public_id()
    user_data = {
        "name": f"test-user-{user_uuid}",
        "code": f"uc_{user_uuid}",
        "jobGrade": 3,
        "defaultOrgCode": "UNASSIGNED",
    }

    response = api_client.post(user_endpoint, json=user_data)
    created_user = response.json()

    assert created_user["name"] == user_data["name"]
    assert created_user["code"] == user_data["code"]
    assert created_user["sub"] is None
    assert created_user["email"] is None

def test_user_dynamic_default_org_resolution(
    api_client: APIClient,
):
    """
    Tests dynamic default org resolution:
    1. User with multiple memberships and no preference picks oldest active.
    2. User with preference picks preferred if active.
    """
    user_uuid = generate_public_id()
    user_code = f"user_{user_uuid}"
    org1_code = f"org1_{user_uuid}"
    org2_code = f"org2_{user_uuid}"

    try:
        # Create 2 org units
        org1 = api_client.post("org-units", json={"code": org1_code, "name": "Org 1", "type": "ORG_UNIT"}).json()
        org2 = api_client.post("org-units", json={"code": org2_code, "name": "Org 2", "type": "ORG_UNIT"}).json()
        org1_id = org1["id"]
        org2_id = org2["id"]

        # 1. Create user with UNASSIGNED
        user_data = {
            "name": f"Dynamic User {user_uuid}",
            "code": user_code,
            "jobGrade": 1,
            "defaultOrgCode": "UNASSIGNED",
        }
        user = api_client.post("users", json=user_data).json()
        user_id = user["id"]

        # Verify initial UNASSIGNED
        assert user["defaultOrgCode"] == "UNASSIGNED"

        from datetime import datetime, timedelta
        # Use UTC time to avoid timezone issues
        now = datetime.utcnow()
        past_org1 = (now - timedelta(days=2)).replace(microsecond=0).isoformat() + "Z"
        past_org2 = (now - timedelta(days=1)).replace(microsecond=0).isoformat() + "Z"

        # Add membership in Org 1 (Older)
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org1_code,
            "userId": user_id,
            "assignType": "USER",
            "startDate": past_org1,
            "endDate": "2999-12-31T23:59:59Z"
        })

        # Verify it picks Org 1
        user_fetched = api_client.get(f"users/{user_id}").json()
        assert user_fetched["defaultOrgCode"] == org1_code

        # Add membership in Org 2 (Newer)
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org2_code,
            "userId": user_id,
            "assignType": "USER",
            "startDate": past_org2,
            "endDate": "2999-12-31T23:59:59Z"
        })

        # Still picks Org 1 (Oldest)
        user_fetched = api_client.get(f"users/{user_id}").json()
        assert user_fetched["defaultOrgCode"] == org1_code

        # 2. Set preference to Org 2
        api_client.patch(f"users/{user_id}/default-org", json={"orgUnitId": org2_id})

        user_pref = api_client.get(f"users/{user_id}").json()
        assert user_pref["defaultOrgCode"] == org2_code

    finally:
        # Cleanup
        try:
            api_client.delete(f"users/code/{user_code}")
            api_client.delete(f"org-units/code/{org1_code}")
            api_client.delete(f"org-units/code/{org2_code}")
        except:
            pass


def test_default_org_fallback_head_wins_over_user(api_client: APIClient):
    """
    GBPM-691: When a user has HEAD membership in OrgA and USER membership in OrgB
    with no explicit preference, the fallback must resolve to OrgA (HEAD > USER).
    Setting an explicit preference to OrgB must override the fallback.
    """
    from datetime import datetime, timedelta

    uid = generate_public_id()
    org_a_code = f"orgA_{uid}"
    org_b_code = f"orgB_{uid}"
    user_code = f"user_{uid}"

    try:
        org_a = api_client.post("org-units", json={
            "code": org_a_code, "name": f"OrgA {uid}", "type": "ORG_UNIT"
        }).json()
        org_b = api_client.post("org-units", json={
            "code": org_b_code, "name": f"OrgB {uid}", "type": "ORG_UNIT"
        }).json()

        now = datetime.utcnow()
        start = (now - timedelta(days=1)).isoformat() + "Z"

        # Create user with USER membership in OrgB (syncMembershipAndPreference: count=1, no pref)
        user = api_client.post("users", json={
            "code": user_code,
            "name": f"User {uid}",
            "jobGrade": 1,
            "defaultOrgCode": org_b_code,
        }).json()
        user_id = user["id"]
        assert user["defaultOrgCode"] == org_b_code

        # Add HEAD membership in OrgA (different org — no overlap constraint applies)
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org_a_code,
            "userId": user_id,
            "assignType": "HEAD",
            "startDate": start,
            "endDate": "2999-12-31T23:59:59Z",
        })

        # No preference stored; fallback: HEAD (OrgA) > USER (OrgB) → OrgA wins
        fetched = api_client.get(f"users/{user_id}").json()
        assert fetched["defaultOrgCode"] == org_a_code

        # Explicit preference to OrgB (USER) overrides HEAD fallback
        api_client.patch(f"users/{user_id}/default-org", json={"orgUnitId": org_b["id"]})
        fetched = api_client.get(f"users/{user_id}").json()
        assert fetched["defaultOrgCode"] == org_b_code

    finally:
        try:
            api_client.delete(f"users/code/{user_code}")
        except:
            pass
        for code in [org_a_code, org_b_code]:
            try:
                api_client.delete(f"org-units/code/{code}")
            except:
                pass


def test_default_org_preference_endpoint(api_client: APIClient):
    """
    GBPM-704: PATCH /users/:id/default-org returns a full UserDto (not just the
    preference record). HEAD membership is a valid preference target (200).
    Expired membership is rejected (400).
    """
    from datetime import datetime, timedelta

    uid = generate_public_id()
    org_user_code = f"orgU_{uid}"
    org_head_code = f"orgH_{uid}"
    org_expired_code = f"orgE_{uid}"
    user_code = f"user_{uid}"

    try:
        org_user = api_client.post("org-units", json={
            "code": org_user_code, "name": f"OrgUser {uid}", "type": "ORG_UNIT"
        }).json()
        org_head = api_client.post("org-units", json={
            "code": org_head_code, "name": f"OrgHead {uid}", "type": "ORG_UNIT"
        }).json()
        org_expired = api_client.post("org-units", json={
            "code": org_expired_code, "name": f"OrgExpired {uid}", "type": "ORG_UNIT"
        }).json()

        now = datetime.utcnow()

        # Create user with USER membership in OrgUser
        user = api_client.post("users", json={
            "code": user_code,
            "name": f"User {uid}",
            "jobGrade": 1,
            "defaultOrgCode": org_user_code,
        }).json()
        user_id = user["id"]

        # Add HEAD membership in OrgHead
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org_head_code,
            "userId": user_id,
            "assignType": "HEAD",
            "startDate": (now - timedelta(days=1)).isoformat() + "Z",
            "endDate": "2999-12-31T23:59:59Z",
        })

        # Add an EXPIRED membership in OrgExpired
        api_client.post("org-units/memberships", json={
            "orgUnitCode": org_expired_code,
            "userId": user_id,
            "assignType": "USER",
            "startDate": (now - timedelta(days=10)).isoformat() + "Z",
            "endDate": (now - timedelta(days=1)).isoformat() + "Z",
        })

        # 1. PATCH returns full UserDto — must include id, name, defaultOrgId, defaultOrgCode
        patch_result = api_client.patch(
            f"users/{user_id}/default-org", json={"orgUnitId": org_user["id"]}
        ).json()
        assert "id" in patch_result
        assert "name" in patch_result
        assert "defaultOrgId" in patch_result
        assert "defaultOrgCode" in patch_result
        assert patch_result["defaultOrgId"] == org_user["id"]
        assert patch_result["defaultOrgCode"] == org_user_code

        # 2. HEAD membership is a valid preference target — must return 200
        head_result = api_client.patch(
            f"users/{user_id}/default-org", json={"orgUnitId": org_head["id"]}
        ).json()
        assert head_result["defaultOrgCode"] == org_head_code

        # 3. Preference persists on subsequent GET
        fetched = api_client.get(f"users/{user_id}").json()
        assert fetched["defaultOrgCode"] == org_head_code

        # 4. Expired membership rejected with 400
        response = api_client.patch(
            f"users/{user_id}/default-org",
            json={"orgUnitId": org_expired["id"]},
            raise_for_status=False,
        )
        assert response.status_code == 400

    finally:
        try:
            api_client.delete(f"users/code/{user_code}")
        except:
            pass
        for code in [org_user_code, org_head_code, org_expired_code]:
            try:
                api_client.delete(f"org-units/code/{code}")
            except:
                pass

