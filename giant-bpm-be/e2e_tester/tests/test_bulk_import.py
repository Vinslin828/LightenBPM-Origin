import logging
import pytest
from datetime import datetime, timedelta, timezone
from utils.id_generator import generate_public_id
from api_client import APIClient

log = logging.getLogger(__name__)

def test_bulk_import_user_with_default_org(api_client: APIClient):
    """
    Tests bulk import of users with multiple memberships and default org preference.
    """
    import_uuid = generate_public_id()
    org1_code = f"b_org1_{import_uuid}"
    org2_code = f"b_org2_{import_uuid}"
    user_code = f"b_user_{import_uuid}"

    try:
        # Prepare bulk import payload
        payload = {
            "orgUnits": [
                {"code": org1_code, "name": "Bulk Org 1", "type": "ORG_UNIT"},
                {"code": org2_code, "name": "Bulk Org 2", "type": "ORG_UNIT"}
            ],
            "users": [
                {
                    "code": user_code,
                    "name": "Bulk User",
                    "email": f"bulk_{import_uuid}@example.com",
                    "jobGrade": 1,
                    "defaultOrgCode": org2_code # Set org2 as preferred
                }
            ],
            "memberships": [
                {
                    "userCode": user_code,
                    "orgUnitCode": org1_code,
                    "assignType": "USER",
                    "startDate": "2020-01-01T00:00:00Z",
                    "endDate": "2999-12-31T23:59:59Z"
                },
                {
                    "userCode": user_code,
                    "orgUnitCode": org2_code,
                    "assignType": "USER",
                    "startDate": "2021-01-01T00:00:00Z",
                    "endDate": "2999-12-31T23:59:59Z"
                }
            ]
        }

        # Execute bulk import
        # The endpoint is POST /import/bulk
        res = api_client.post("import/bulk", json=payload)
        assert res.status_code == 201

        # Verify user and resolved default org
        user = api_client.get(f"users/code/{user_code}").json()
        assert user["name"] == "Bulk User"
        # Should be org2 because it was explicitly provided as defaultOrgCode in bulk import
        assert user["defaultOrgCode"] == org2_code

    finally:
        # Cleanup
        try:
            api_client.delete(f"users/code/{user_code}")
            api_client.delete(f"org-units/code/{org1_code}")
            api_client.delete(f"org-units/code/{org2_code}")
        except:
            pass

def _get_memberships_for_user(api_client: APIClient, user_code: str, status: str = "active") -> list:
    """Fetch memberships for a user by code. Defaults to active (start_date <= now < end_date)."""
    user = api_client.get(f"users/code/{user_code}").json()
    return api_client.get(f"org-units/memberships/user/{user['id']}?status={status}").json()


def _get_org_memberships(api_client: APIClient, user_code: str, org_code: str, status: str = "active") -> list:
    """Fetch memberships for a user filtered to a specific org unit."""
    all_memberships = _get_memberships_for_user(api_client, user_code, status=status)
    return [m for m in all_memberships if m["orgUnitCode"] == org_code]


def _bulk_import_membership(
    api_client: APIClient,
    user_code: str,
    org_code: str,
    assign_type: str,
    start_date: str,
    end_date: str,
):
    """Send a single-membership delta import."""
    api_client.post(
        "import/bulk",
        json={
            "orgUnits": [],
            "users": [],
            "memberships": [
                {
                    "userCode": user_code,
                    "orgUnitCode": org_code,
                    "assignType": assign_type,
                    "startDate": start_date,
                    "endDate": end_date,
                }
            ],
        },
    )


def _setup_isolated_user(api_client: APIClient, uid: str, label: str):
    """
    Create a user with a dedicated default org and a separate test org.

    Using two orgs prevents the indefinite USER membership auto-created by
    defaultOrgCode from interfering with cookie-cutter assertions in test_org.

    Returns: (user_code, def_org_code, test_org_code)
    """
    def_org_code = f"def_org_{uid}"
    test_org_code = f"test_org_{uid}"
    user_code = f"user_{uid}"

    api_client.post("org-units", json={"code": def_org_code, "name": f"Default Org {label}", "type": "ORG_UNIT"})
    api_client.post("org-units", json={"code": test_org_code, "name": f"Test Org {label}", "type": "ORG_UNIT"})
    api_client.post("users", json={
        "code": user_code, "name": f"User {label}", "jobGrade": 1, "defaultOrgCode": def_org_code,
    })
    return user_code, def_org_code, test_org_code


def _cleanup_isolated_user(api_client: APIClient, user_code: str, def_org_code: str, test_org_code: str):
    for path in (
        f"users/code/{user_code}",
        f"org-units/code/{def_org_code}",
        f"org-units/code/{test_org_code}",
    ):
        try:
            api_client.delete(path)
        except Exception:
            pass


def test_bulk_import_overlap_prevention_replaced_by_cookie_cutter(api_client: APIClient):
    """
    Overlapping memberships are no longer rejected (400). Instead, the import
    resolves conflicts with cookie-cutter logic: the remote record is inserted
    and any overlapping local records are truncated, adjusted, or deleted.

    This test seeds an indefinite local membership and imports a delta record
    that fully overlaps it (R swallows L). The local record should be deleted
    and the remote record inserted.
    """
    import_uuid = generate_public_id()
    org_code = f"ov_org_{import_uuid}"
    user_code = f"ov_user_{import_uuid}"

    try:
        api_client.post("org-units", json={"code": org_code, "name": "Overlap Org", "type": "ORG_UNIT"})
        api_client.post("users", json={
            "code": user_code, "name": "Overlap User", "jobGrade": 1, "defaultOrgCode": org_code
        })

        # The defaultOrgCode creation seeds an indefinite USER membership starting now.
        # Import a remote HEAD membership covering a wider range → R swallows L.
        _bulk_import_membership(
            api_client, user_code, org_code, "HEAD",
            "2020-01-01T00:00:00Z", "2999-12-31T23:59:59Z"
        )

        memberships = _get_memberships_for_user(api_client, user_code)
        # Only the remote HEAD record should remain
        assert len(memberships) == 1
        assert memberships[0]["assignType"] == "HEAD"

    finally:
        try:
            api_client.delete(f"users/code/{user_code}")
            api_client.delete(f"org-units/code/{org_code}")
        except Exception:
            pass


def test_delta_import_clips_tail(api_client: APIClient):
    """
    R clips L's tail: local [2026-05-01, 2027-06-01] USER, remote [2026-09-01, 2028-01-01] HEAD.
    Expected: local updated to [2026-05-01, 2026-09-01], remote inserted as HEAD.
    All resulting end dates are in the future so the active-only endpoint returns both.
    Uses two-org pattern: def_org holds the auto-created indefinite membership;
    test_org is clean for isolated cookie-cutter assertions.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "ClipTail")

    try:
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2026-05-01T00:00:00Z", "2027-06-01T00:00:00Z")

        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-09-01T00:00:00Z", "2028-01-01T00:00:00Z")

        memberships = _get_org_memberships(api_client, user_code, test_org_code, status="all")
        assert len(memberships) == 2

        user_mem = next(m for m in memberships if m["assignType"] == "USER")
        head_mem = next(m for m in memberships if m["assignType"] == "HEAD")

        assert user_mem["startDate"].startswith("2026-05-01")
        assert user_mem["endDate"].startswith("2026-09-01")
        assert head_mem["startDate"].startswith("2026-09-01")
        assert head_mem["endDate"].startswith("2028-01-01")

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_delta_import_clips_head(api_client: APIClient):
    """
    R clips L's head: local [2026-09-01, 2028-01-01] USER, remote [2026-06-01, 2026-11-01] HEAD.
    Expected: local updated to [2026-11-01, 2028-01-01], remote inserted as HEAD.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "ClipHead")

    try:
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2026-09-01T00:00:00Z", "2028-01-01T00:00:00Z")

        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-06-01T00:00:00Z", "2026-11-01T00:00:00Z")

        memberships = _get_org_memberships(api_client, user_code, test_org_code, status="all")
        assert len(memberships) == 2

        user_mem = next(m for m in memberships if m["assignType"] == "USER")
        head_mem = next(m for m in memberships if m["assignType"] == "HEAD")

        assert user_mem["startDate"].startswith("2026-11-01")
        assert user_mem["endDate"].startswith("2028-01-01")
        assert head_mem["startDate"].startswith("2026-06-01")
        assert head_mem["endDate"].startswith("2026-11-01")

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_delta_import_swallows_local(api_client: APIClient):
    """
    R swallows L: local [2026-07-01, 2026-09-01] USER, remote [2026-06-01, 2027-01-01] HEAD.
    Expected: local deleted, only remote HEAD remains.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "Swallows")

    try:
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2026-07-01T00:00:00Z", "2026-09-01T00:00:00Z")

        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-06-01T00:00:00Z", "2027-01-01T00:00:00Z")

        memberships = _get_org_memberships(api_client, user_code, test_org_code, status="all")
        assert len(memberships) == 1
        assert memberships[0]["assignType"] == "HEAD"
        assert memberships[0]["startDate"].startswith("2026-06-01")
        assert memberships[0]["endDate"].startswith("2027-01-01")

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_delta_import_contained_in_local(api_client: APIClient):
    """
    L contains R (the scenario highlighted in the design meeting):
    local [2026-05-01, 2028-01-02] USER, remote [2026-07-01, 2026-12-31] HEAD.
    Expected: local truncated to [2026-05-01, 2026-07-01], remote inserted.
    The trailing period [2026-12-31, 2028-01-02] is dropped — no split.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "Contains")

    try:
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2026-05-01T00:00:00Z", "2028-01-02T00:00:00Z")

        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-07-01T00:00:00Z", "2026-12-31T00:00:00Z")

        memberships = _get_org_memberships(api_client, user_code, test_org_code, status="all")
        assert len(memberships) == 2

        user_mem = next(m for m in memberships if m["assignType"] == "USER")
        head_mem = next(m for m in memberships if m["assignType"] == "HEAD")

        assert user_mem["startDate"].startswith("2026-05-01")
        assert user_mem["endDate"].startswith("2026-07-01")
        assert head_mem["startDate"].startswith("2026-07-01")
        assert head_mem["endDate"].startswith("2026-12-31")

        # No trailing record for [2026-12-31, 2028-01-02]
        trailing = [m for m in memberships if m["startDate"].startswith("2026-12-31")]
        assert len(trailing) == 0

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_delta_import_multiple_overlaps(api_client: APIClient):
    """
    R overlaps multiple local records:
    local A [2026-05-01, 2026-09-01] USER, local B [2026-09-01, 2027-03-01] HEAD,
    remote [2026-06-01, 2026-10-01] HEAD.
    Expected: A clipped to [2026-05-01, 2026-06-01], B clipped to [2026-10-01, 2027-03-01],
    remote inserted. All 3 records have end dates in the future.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "MultiOverlap")

    try:
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2026-05-01T00:00:00Z", "2026-09-01T00:00:00Z")
        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-09-01T00:00:00Z", "2027-03-01T00:00:00Z")

        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-06-01T00:00:00Z", "2026-10-01T00:00:00Z")

        memberships = _get_org_memberships(api_client, user_code, test_org_code, status="all")
        assert len(memberships) == 3

        starts = sorted(m["startDate"][:10] for m in memberships)
        assert starts == ["2026-05-01", "2026-06-01", "2026-10-01"]

        ends = sorted(m["endDate"][:10] for m in memberships)
        assert ends == ["2026-06-01", "2026-10-01", "2027-03-01"]

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_delta_import_isdeleted_closes_active_membership(api_client: APIClient):
    """
    isDeleted=true on an active membership closes it (endDate set to now, so no longer active).
    isDeleted is deprecated — will be removed in a future import version.
    Uses a separate test_org so the default indefinite membership doesn't interfere.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "IsDeletedActive")

    try:
        # Seed active indefinite membership in test_org
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2026-01-01T00:00:00Z", "2999-12-31T23:59:59Z")

        assert len(_get_org_memberships(api_client, user_code, test_org_code)) == 1

        # Close via isDeleted=true
        api_client.post("import/bulk", json={
            "orgUnits": [], "users": [],
            "memberships": [{
                "userCode": user_code,
                "orgUnitCode": test_org_code,
                "assignType": "USER",
                "startDate": "2026-01-01T00:00:00Z",
                "endDate": "2999-12-31T23:59:59Z",
                "isDeleted": True,
            }],
        })

        # Membership should be closed — not returned as active
        assert len(_get_org_memberships(api_client, user_code, test_org_code)) == 0

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_delta_import_isdeleted_noop_on_historical_membership(api_client: APIClient):
    """
    isDeleted=true on a historical (already-ended) membership must not close any other
    active membership. Verified by seeding an additional active record in test_org and
    confirming it survives the isDeleted call targeting the historical one.
    isDeleted is deprecated — will be removed in a future import version.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "IsDeletedNoop")

    try:
        # Seed a historical past-dated membership in test_org
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2020-01-01T00:00:00Z", "2021-01-01T00:00:00Z")

        # Seed an active membership in test_org that must NOT be closed
        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z")

        assert len(_get_org_memberships(api_client, user_code, test_org_code)) == 1  # only active HEAD

        # Fire isDeleted=true targeting the historical record (startDate = 2020-01-01)
        api_client.post("import/bulk", json={
            "orgUnits": [], "users": [],
            "memberships": [{
                "userCode": user_code,
                "orgUnitCode": test_org_code,
                "assignType": "USER",
                "startDate": "2020-01-01T00:00:00Z",
                "endDate": "2021-01-01T00:00:00Z",
                "isDeleted": True,
            }],
        })

        # Active HEAD membership must still be present — historical record was a no-op
        active = _get_org_memberships(api_client, user_code, test_org_code)
        assert len(active) == 1
        assert active[0]["assignType"] == "HEAD"

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_active_filter_excludes_scheduled_memberships(api_client: APIClient):
    """
    GBPM-780 regression: GET /org-units/memberships/user/:id must not return memberships
    whose start_date is in the future (scheduled). Only memberships where
    start_date <= now < end_date should appear with the default ?status=active filter.
    """
    uid = generate_public_id()
    user_code, def_org_code, test_org_code = _setup_isolated_user(api_client, uid, "GBPM780")

    try:
        # Active: started in the past, ends in the future
        _bulk_import_membership(api_client, user_code, test_org_code, "USER",
                                "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z")
        # Scheduled: starts in the future
        _bulk_import_membership(api_client, user_code, test_org_code, "HEAD",
                                "2026-06-01T00:00:00Z", "2027-06-01T00:00:00Z")

        # Default (active) — should return only the past-started membership
        active = _get_org_memberships(api_client, user_code, test_org_code)
        assert len(active) == 1
        assert active[0]["assignType"] == "USER"
        assert active[0]["startDate"].startswith("2026-01-01")

        # ?status=scheduled — should return only the future-started membership
        scheduled = _get_org_memberships(api_client, user_code, test_org_code, status="scheduled")
        assert len(scheduled) == 1
        assert scheduled[0]["assignType"] == "HEAD"
        assert scheduled[0]["startDate"].startswith("2026-06-01")

        # ?status=all — should return both
        all_memberships = _get_org_memberships(api_client, user_code, test_org_code, status="all")
        assert len(all_memberships) == 2

    finally:
        _cleanup_isolated_user(api_client, user_code, def_org_code, test_org_code)


def test_bulk_import_explicit_enddate_preserved_through_defaultorg_sync(api_client: APIClient):
    """
    GBPM-769 regression: step 4 (syncUserDefaultOrgPreference) must not overwrite
    the endDate of a membership imported in step 3.

    All three resources (org, user, membership) are created in a single bulk call
    to replicate the real-world external-system sync scenario. The membership carries
    an explicit endDate (2027-06-30), not the INDEFINITE sentinel (2999-12-31).
    After the import, the stored endDate must still be 2027-06-30.
    """
    uid = generate_public_id()
    org_code = f"gbpm769_org_{uid}"
    user_code = f"gbpm769_user_{uid}"
    explicit_end = "2027-06-30T00:00:00Z"

    try:
        res = api_client.post("import/bulk", json={
            "orgUnits": [{"code": org_code, "name": "GBPM-769 Org", "type": "ORG_UNIT"}],
            "users": [{
                "code": user_code,
                "name": "GBPM-769 User",
                "jobGrade": 3,
                "defaultOrgCode": org_code,
                "email": f"gbpm769_{uid}@example.com",
            }],
            "memberships": [{
                "userCode": user_code,
                "orgUnitCode": org_code,
                "assignType": "USER",
                "startDate": "2024-01-01T00:00:00Z",
                "endDate": explicit_end,
            }],
        })
        assert res.status_code == 201

        memberships = _get_org_memberships(api_client, user_code, org_code)

        # Exactly one membership — step 4 must not create an extra INDEFINITE fallback
        assert len(memberships) == 1, (
            f"Expected 1 membership, got {len(memberships)}: {memberships}"
        )
        # endDate must be the imported value, not overwritten to 2999-12-31
        assert memberships[0]["endDate"].startswith("2027-06-30"), (
            f"GBPM-769: endDate was overwritten. Expected 2027-06-30, got {memberships[0]['endDate']}"
        )

    finally:
        try:
            api_client.delete(f"users/code/{user_code}")
            api_client.delete(f"org-units/code/{org_code}")
        except Exception:
            pass


def test_bulk_import_defaultorg_missing_org_returns_400(api_client: APIClient):
    """
    When defaultOrgCode references an org that does not exist in the DB, bulkImport
    must return 400 BadRequest and roll back the entire transaction.
    """
    uid = generate_public_id()
    user_code = f"miss_user_{uid}"
    nonexistent_org_code = f"miss_org_{uid}"  # deliberately not created

    res = api_client.post("import/bulk", raise_for_status=False, json={
        "orgUnits": [],
        "users": [{
            "code": user_code,
            "name": "Missing Org User",
            "jobGrade": 1,
            "defaultOrgCode": nonexistent_org_code,
        }],
        "memberships": [],
    })

    assert res.status_code == 400, (
        f"Expected 400 for missing defaultOrgCode org, got {res.status_code}: {res.text}"
    )
    # Transaction must be rolled back — endpoint returns 200 with empty body when user absent
    user_res = api_client.get(f"users/code/{user_code}", raise_for_status=False)
    user_body = user_res.text.strip()
    assert not user_body or user_body == "null", (
        f"Transaction was not rolled back: user was persisted despite 400 error: {user_body}"
    )


def test_bulk_import_defaultorg_deleted_in_same_batch_returns_400(api_client: APIClient):
    """
    When defaultOrgCode references an org that is soft-deleted in the same batch
    (orgUnits contains the org with isDeleted=true), bulkImport must return 400
    BadRequest and roll back the entire transaction.
    """
    uid = generate_public_id()
    org_code = f"del_org_{uid}"
    user_code = f"del_user_{uid}"

    # Pre-create the org so it exists and can be deleted in the batch
    setup = api_client.post("org-units", json={
        "code": org_code,
        "name": "To-Be-Deleted Org",
        "type": "ORG_UNIT",
    })
    assert setup.status_code == 201

    try:
        res = api_client.post("import/bulk", raise_for_status=False, json={
            "orgUnits": [
                # Delete the org in this same batch
                {"code": org_code, "name": "To-Be-Deleted Org", "type": "ORG_UNIT", "isDeleted": True},
            ],
            "users": [{
                "code": user_code,
                "name": "Deleted Org User",
                "jobGrade": 1,
                "defaultOrgCode": org_code,  # references the org being deleted above
            }],
            "memberships": [],
        })

        assert res.status_code == 400, (
            f"Expected 400 for soft-deleted defaultOrgCode org, got {res.status_code}: {res.text}"
        )
        # Transaction must be rolled back — endpoint returns 200 with empty body when user absent
        user_res = api_client.get(f"users/code/{user_code}", raise_for_status=False)
        user_body = user_res.text.strip()
        assert not user_body or user_body == "null", (
            f"Transaction was not rolled back: user was persisted despite 400 error: {user_body}"
        )

    finally:
        try:
            api_client.delete(f"org-units/code/{org_code}")
        except Exception:
            pass


def test_bulk_import_defaultorg_creates_fallback_membership_when_none_imported(api_client: APIClient):
    """
    When a bulk import provides a user with defaultOrgCode but no corresponding
    membership in the payload, syncUserDefaultOrgPreference (step 4) must create
    a fallback INDEFINITE USER membership for that org.

    This is the complementary case to
    test_bulk_import_explicit_enddate_preserved_through_defaultorg_sync:
    the fallback must fire when there is nothing to preserve.
    """
    uid = generate_public_id()
    org_code = f"fallback_org_{uid}"
    user_code = f"fallback_user_{uid}"

    try:
        res = api_client.post("import/bulk", json={
            "orgUnits": [{"code": org_code, "name": "Fallback Org", "type": "ORG_UNIT"}],
            "users": [{
                "code": user_code,
                "name": "Fallback User",
                "jobGrade": 3,
                "defaultOrgCode": org_code,
                "email": f"fallback_{uid}@example.com",
            }],
            "memberships": [],  # No membership provided — fallback must be auto-created
        })
        assert res.status_code == 201

        memberships = _get_org_memberships(api_client, user_code, org_code)

        # Exactly one fallback membership must be auto-created
        assert len(memberships) == 1, (
            f"Expected 1 fallback membership, got {len(memberships)}: {memberships}"
        )
        assert memberships[0]["assignType"] == "USER"
        # Must carry the INDEFINITE sentinel
        assert memberships[0]["endDate"].startswith("2999-12-31"), (
            f"Expected INDEFINITE fallback endDate, got {memberships[0]['endDate']}"
        )

    finally:
        try:
            api_client.delete(f"users/code/{user_code}")
            api_client.delete(f"org-units/code/{org_code}")
        except Exception:
            pass
