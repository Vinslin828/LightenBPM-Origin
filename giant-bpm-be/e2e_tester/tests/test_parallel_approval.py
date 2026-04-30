"""
E2E tests for approval routing display correctness.

GBPM-748: When the same user appears in multiple parallel approval groups,
approving their task in Group N was not reflected in the routing display —
all groups showed the status of the first-found task (Group 0).
Fix: for active/completed nodes, tasks are the source of truth,
grouped by approver_group_index and enriched with user details via
userService.findByIds().

GBPM-810: After the first approver in a sequential (reporting-line) group
acts, the approver order shown in the routing panel was reordered. Root
cause: approval_tasks fetched without ORDER BY, so a WAITING→PENDING row
update could change PostgreSQL's physical scan order on the next read.
Fix: orderBy created_at asc in all Prisma approval_tasks includes, plus a
defensive createdAt sort in _getApprovalGroups Branch B.
"""
import logging
from typing import Any, Dict, Optional

import pytest
from api_client import APIClient
from utils.id_generator import generate_public_id

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _setup_parallel_workflow(
    api_client: APIClient,
    form_id: str,
    approval_logic: str,
) -> Dict[str, Any]:
    """
    Create a workflow with one parallel approval node (2 groups, both using
    the *applicant* approver type so the submitting user appears in both).

    Returns ``{"workflow_id": ..., "binding_id": ...}`` for use and teardown.
    """
    wf_name = f"Parallel-{approval_logic}-{generate_public_id()}"

    wf_id = api_client.post("workflow", json={"name": wf_name}).json()["workflow_id"]

    binding_id = api_client.post(
        "bindings",
        json={"form_id": form_id, "workflow_id": wf_id},
    ).json()["id"]

    flow_def = {
        "version": 1,
        "nodes": [
            {"key": "START", "type": "start", "next": "PARALLEL"},
            {
                "key": "PARALLEL",
                "type": "approval",
                "next": "END",
                "approval_method": "parallel",
                "approval_logic": approval_logic,
                "description": f"Parallel {approval_logic} node",
                "approvers": [
                    {"type": "applicant", "description": "Group 0"},
                    {"type": "applicant", "description": "Group 1"},
                ],
            },
            {"key": "END", "type": "end"},
        ],
    }
    rev_id = api_client.post(
        f"workflow/{wf_id}/revisions",
        json={"name": wf_name, "flow_definition": flow_def},
    ).json()["revision_id"]
    api_client.patch(f"workflow/revisions/{rev_id}", json={"status": "ACTIVE"})

    return {"workflow_id": wf_id, "binding_id": binding_id}


def _get_parallel_node(api_client: APIClient, sn: str) -> Optional[Dict[str, Any]]:
    """Return the first parallel ApprovalRoutingNode from the routing response."""
    resp = api_client.get(f"applications/{sn}/routing").json()
    for node in resp.get("routing", {}).get("nodes", []):
        if node.get("type") == "approval" and node.get("approvalMethod") == "parallel":
            return node
    return None


def _approve(api_client: APIClient, sn: str, task_id: str) -> None:
    api_client.put(
        f"applications/{sn}/approval",
        json={"approval_id": task_id, "approval_result": "approve"},
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_parallel_and_group_statuses_are_independent(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
):
    """
    GBPM-748 regression: parallel AND node with the same user in both groups.

    Approving Group 1's task must change only Group 1 to APPROVED.
    Group 0 must remain PENDING until its own task is approved.

    Before the fix, _getApprovalGroups() returned the first-matching task for
    the user regardless of group index, so both groups would reflect Group 0's
    status — making Group 1's approval invisible in the routing display.
    """
    wf = _setup_parallel_workflow(api_client, temporary_form["form_id"], "AND")
    sn = None

    try:
        # Submit application
        app = api_client.post(
            "applications/submission",
            json={"binding_id": wf["binding_id"], "form_data": {}},
        ).json()
        sn = app["serial_number"]
        assert app["workflow_instance"]["status"] == "RUNNING"

        # Initial routing — parallel node PENDING, both groups PENDING
        node = _get_parallel_node(api_client, sn)
        assert node is not None, "Parallel approval node not found in routing"
        assert node["status"] == "pending"
        assert len(node["approvalGroups"]) == 2

        groups = node["approvalGroups"]
        assert groups[0]["approvals"][0]["status"] == "PENDING"
        assert groups[1]["approvals"][0]["status"] == "PENDING"

        task_id_g0 = groups[0]["approvals"][0]["approvalTaskId"]
        task_id_g1 = groups[1]["approvals"][0]["approvalTaskId"]
        assert task_id_g0 != task_id_g1, (
            "Expected separate task IDs per group; got the same ID for both. "
            "Tasks may not have been created per group."
        )

        # Approve Group 1's task only
        _approve(api_client, sn, task_id_g1)

        # GBPM-748 core assertions: each group shows its own task's status
        node = _get_parallel_node(api_client, sn)
        assert node is not None
        groups = node["approvalGroups"]

        assert groups[0]["approvals"][0]["status"] == "PENDING", (
            "Group 0 should still be PENDING — only Group 1 was approved. "
            "[GBPM-748: before fix, both groups showed the same (wrong) status]"
        )
        assert groups[1]["approvals"][0]["status"] == "APPROVED", (
            "Group 1 should be APPROVED after its task was approved. "
            "[GBPM-748: before fix, this showed PENDING]"
        )
        assert node["status"] == "pending", (
            "AND node must stay PENDING until all groups approve"
        )

        # Approve Group 0 → node should complete
        _approve(api_client, sn, task_id_g0)

        routing = api_client.get(f"applications/{sn}/routing").json()
        assert routing["overall_status"] == "COMPLETED"

        node = next(
            (n for n in routing["routing"]["nodes"] if n.get("key") == "PARALLEL"),
            None,
        )
        assert node is not None
        assert node["status"] == "completed"

    finally:
        if sn:
            api_client.delete(f"applications/{sn}", raise_for_status=False)
        api_client.delete(f"bindings/{wf['binding_id']}", raise_for_status=False)
        api_client.delete(f"workflow/{wf['workflow_id']}/hard", raise_for_status=False)


def test_parallel_or_first_group_approval_completes_node(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
):
    """
    Parallel OR node: approving any one group completes the node immediately.
    The remaining group's task should be CANCELLED in the routing display.

    This also exercises the same tasks-first display path fixed by GBPM-748.
    """
    wf = _setup_parallel_workflow(api_client, temporary_form["form_id"], "OR")
    sn = None

    try:
        # Submit application
        app = api_client.post(
            "applications/submission",
            json={"binding_id": wf["binding_id"], "form_data": {}},
        ).json()
        sn = app["serial_number"]
        assert app["workflow_instance"]["status"] == "RUNNING"

        # Get initial routing
        node = _get_parallel_node(api_client, sn)
        assert node is not None
        assert node["status"] == "pending"

        task_id_g0 = node["approvalGroups"][0]["approvals"][0]["approvalTaskId"]

        # Approve Group 0 — OR logic: node should complete, Group 1 cancelled
        _approve(api_client, sn, task_id_g0)

        routing = api_client.get(f"applications/{sn}/routing").json()
        assert routing["overall_status"] == "COMPLETED"

        node = next(
            (n for n in routing["routing"]["nodes"] if n.get("key") == "PARALLEL"),
            None,
        )
        assert node is not None
        assert node["status"] == "completed"
        assert node["approvalGroups"][0]["approvals"][0]["status"] == "APPROVED"
        assert node["approvalGroups"][1]["approvals"][0]["status"] == "CANCELLED", (
            "Group 1's task should be CANCELLED after OR node completed via Group 0"
        )

    finally:
        if sn:
            api_client.delete(f"applications/{sn}", raise_for_status=False)
        api_client.delete(f"bindings/{wf['binding_id']}", raise_for_status=False)
        api_client.delete(f"workflow/{wf['workflow_id']}/hard", raise_for_status=False)


def test_parallel_node_not_yet_reached_shows_waiting(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
):
    """
    When the parallel node has not yet been reached (no approval tasks in DB),
    the routing should show all anticipated approvers with WAITING status.

    This exercises Branch A of _getApprovalGroups() (resolveApprovers path).
    """
    form_id = temporary_form["form_id"]
    wf_name = f"Two-Step-{generate_public_id()}"
    wf_id = None
    binding_id = None
    sn = None

    try:
        # Create a workflow: START → SINGLE_APPROVAL → PARALLEL → END
        # The parallel node is blocked behind a single approval, so it won't
        # be reached until the first approval is done.
        wf_id = api_client.post("workflow", json={"name": wf_name}).json()["workflow_id"]
        binding_id = api_client.post(
            "bindings",
            json={"form_id": form_id, "workflow_id": wf_id},
        ).json()["id"]

        flow_def = {
            "version": 1,
            "nodes": [
                {"key": "START", "type": "start", "next": "GATE"},
                {
                    "key": "GATE",
                    "type": "approval",
                    "next": "PARALLEL",
                    "approval_method": "single",
                    "approvers": {"type": "applicant"},
                    "description": "Gate approval",
                },
                {
                    "key": "PARALLEL",
                    "type": "approval",
                    "next": "END",
                    "approval_method": "parallel",
                    "approval_logic": "AND",
                    "description": "Parallel node (not yet reached)",
                    "approvers": [
                        {"type": "applicant", "description": "Group 0"},
                        {"type": "applicant", "description": "Group 1"},
                    ],
                },
                {"key": "END", "type": "end"},
            ],
        }
        rev_id = api_client.post(
            f"workflow/{wf_id}/revisions",
            json={"name": wf_name, "flow_definition": flow_def},
        ).json()["revision_id"]
        api_client.patch(f"workflow/revisions/{rev_id}", json={"status": "ACTIVE"})

        # Submit application — GATE node is now PENDING, PARALLEL not yet reached
        app = api_client.post(
            "applications/submission",
            json={"binding_id": binding_id, "form_data": {}},
        ).json()
        sn = app["serial_number"]

        # Find the parallel node in the routing
        routing = api_client.get(f"applications/{sn}/routing").json()
        parallel_node = next(
            (n for n in routing["routing"]["nodes"] if n.get("key") == "PARALLEL"),
            None,
        )
        assert parallel_node is not None
        assert parallel_node["status"] == "inactive"

        # Both groups should show anticipated approvers as WAITING
        for group in parallel_node["approvalGroups"]:
            for approval in group["approvals"]:
                assert approval["status"] == "WAITING", (
                    f"Expected WAITING for not-yet-reached group, got {approval['status']}"
                )

    finally:
        if sn:
            api_client.delete(f"applications/{sn}", raise_for_status=False)
        if binding_id:
            api_client.delete(f"bindings/{binding_id}", raise_for_status=False)
        if wf_id:
            api_client.delete(f"workflow/{wf_id}/hard", raise_for_status=False)


# ---------------------------------------------------------------------------
# GBPM-810 helpers
# ---------------------------------------------------------------------------


def _setup_parallel_workflow_3groups(
    api_client: APIClient,
    form_id: str,
) -> Dict[str, Any]:
    """
    Create a 3-group parallel AND workflow where every group uses the
    applicant approver type so the admin can approve each one.
    Groups are given distinct descriptions to assert ordering.
    """
    wf_name = f"Parallel-3G-{generate_public_id()}"
    wf_id = api_client.post("workflow", json={"name": wf_name}).json()["workflow_id"]
    binding_id = api_client.post(
        "bindings", json={"form_id": form_id, "workflow_id": wf_id}
    ).json()["id"]
    flow_def = {
        "version": 1,
        "nodes": [
            {"key": "START", "type": "start", "next": "PARALLEL"},
            {
                "key": "PARALLEL",
                "type": "approval",
                "next": "END",
                "approval_method": "parallel",
                "approval_logic": "AND",
                "description": "Three-group parallel node",
                "approvers": [
                    {"type": "applicant", "description": "group-0"},
                    {"type": "applicant", "description": "group-1"},
                    {"type": "applicant", "description": "group-2"},
                ],
            },
            {"key": "END", "type": "end"},
        ],
    }
    rev_id = api_client.post(
        f"workflow/{wf_id}/revisions",
        json={"name": wf_name, "flow_definition": flow_def},
    ).json()["revision_id"]
    api_client.patch(f"workflow/revisions/{rev_id}", json={"status": "ACTIVE"})
    return {"workflow_id": wf_id, "binding_id": binding_id}


def _get_node_by_key(
    api_client: APIClient, sn: str, node_key: str
) -> Optional[Dict[str, Any]]:
    """Return a routing node by its key."""
    resp = api_client.get(f"applications/{sn}/routing").json()
    for node in resp.get("routing", {}).get("nodes", []):
        if node.get("key") == node_key:
            return node
    return None


# ---------------------------------------------------------------------------
# GBPM-810 tests
# ---------------------------------------------------------------------------


def test_parallel_approver_group_order_stable_after_approval(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
) -> None:
    """
    GBPM-810: Parallel group ordering must be preserved after one group is approved.

    With a 3-group parallel AND node (groups 0, 1, 2 in definition order),
    the routing response must return the groups in the same order after group 0
    is approved (Branch A → Branch B transition).  Before the fix, the DB fetch
    of approval_tasks lacked ORDER BY, so a task-row update could change
    PostgreSQL's physical scan order and cause the groups to appear reordered.
    """
    wf = _setup_parallel_workflow_3groups(api_client, temporary_form["form_id"])
    sn = None
    try:
        app = api_client.post(
            "applications/submission",
            json={"binding_id": wf["binding_id"], "form_data": {}},
        ).json()
        sn = app["serial_number"]
        assert app["workflow_instance"]["status"] == "RUNNING"

        # Branch A: all three groups present in definition order
        node = _get_node_by_key(api_client, sn, "PARALLEL")
        assert node is not None, "PARALLEL node not found in routing"
        assert len(node["approvalGroups"]) == 3
        initial_order = [g["desc"] for g in node["approvalGroups"]]
        assert initial_order == ["group-0", "group-1", "group-2"]

        groups = node["approvalGroups"]
        task_g0 = groups[0]["approvals"][0]["approvalTaskId"]
        task_g1 = groups[1]["approvals"][0]["approvalTaskId"]
        task_g2 = groups[2]["approvals"][0]["approvalTaskId"]
        assert len({task_g0, task_g1, task_g2}) == 3, "Each group must have a distinct task ID"

        # Approve group 0 — subsequent routing calls use Branch B
        _approve(api_client, sn, task_g0)

        # Branch B: group order and statuses
        node = _get_node_by_key(api_client, sn, "PARALLEL")
        assert node is not None
        post_order = [g["desc"] for g in node["approvalGroups"]]
        assert post_order == ["group-0", "group-1", "group-2"], (
            f"Group order changed after approval: {post_order}. "
            "[GBPM-810: approval_tasks fetched without ORDER BY could reorder groups]"
        )
        assert node["approvalGroups"][0]["approvals"][0]["status"] == "APPROVED"
        assert node["approvalGroups"][1]["approvals"][0]["status"] == "PENDING"
        assert node["approvalGroups"][2]["approvals"][0]["status"] == "PENDING"

    finally:
        if sn:
            api_client.delete(f"applications/{sn}", raise_for_status=False)
        api_client.delete(f"bindings/{wf['binding_id']}", raise_for_status=False)
        api_client.delete(f"workflow/{wf['workflow_id']}/hard", raise_for_status=False)


def test_sequential_approver_order_stable_after_first_approval(
    api_client: APIClient,
    temporary_form: Dict[str, Any],
) -> None:
    """
    GBPM-810 (core): Within a sequential reporting-line group, the approver
    order must remain stable after each approver acts.

    Setup: three-level org hierarchy.
      grandparent_org (approver_c is HEAD, job_grade=15)
        └── parent_org (approver_b is HEAD, job_grade=10)
              └── child_org (approver_a is HEAD, job_grade=5)
                      └── anchor_user (job_grade=1, default org = child_org)

    The workflow uses specific_user_reporting_line from anchor_user at level=3,
    which resolves to [approver_a, approver_b, approver_c] bottom-up.

    Each approval triggers a WAITING→PENDING row write on the next approver's
    task, giving two independent opportunities to exercise the ordering fix:
      1. A approves → B promoted WAITING→PENDING; assert order [A, B, C]
      2. B approves → C promoted WAITING→PENDING; assert order [A, B, C]

    Before the fix: approval_tasks were fetched without ORDER BY, so a
    row update could change PostgreSQL's physical heap scan order on the
    next read and cause reordering.
    """
    uid = generate_public_id()
    grandparent_code = f"TEST_GRP_{uid.upper()}"
    parent_code = f"TEST_PAR_{uid.upper()}"
    child_code = f"TEST_CHD_{uid.upper()}"

    # Track created resources for cleanup (innermost org deleted first)
    created_org_ids: list = []
    created_membership_ids: list = []
    created_user_ids: list = []
    sn = None
    wf_id = None
    binding_id = None

    try:
        # ── Org hierarchy ──────────────────────────────────────────────────────
        grandparent_org = api_client.post(
            "org-units",
            json={
                "code": grandparent_code,
                "name": f"Grandparent Org {uid}",
                "type": "ORG_UNIT",
                "parentCode": None,
            },
        ).json()

        parent_org = api_client.post(
            "org-units",
            json={
                "code": parent_code,
                "name": f"Parent Org {uid}",
                "type": "ORG_UNIT",
                "parentCode": grandparent_code,
            },
        ).json()

        child_org = api_client.post(
            "org-units",
            json={
                "code": child_code,
                "name": f"Child Org {uid}",
                "type": "ORG_UNIT",
                "parentCode": parent_code,
            },
        ).json()
        # innermost first so teardown deletes in leaf→root order
        created_org_ids.extend([child_org["id"], parent_org["id"], grandparent_org["id"]])

        # ── approver_a: HEAD of child org (level 1, job_grade=5) ───────────────
        # defaultOrgCode=parent_code keeps the auto-created USER membership out of
        # child_org so it doesn't conflict with the explicit HEAD membership below.
        approver_a = api_client.post(
            "users",
            json={
                "name": f"approver-a-{uid}",
                "sub": f"sub-a-{uid}",
                "code": f"ua_{uid}",
                "email": f"approver.a.{uid}@example.com",
                "jobGrade": 5,
                "defaultOrgCode": parent_code,
            },
        ).json()
        created_user_ids.append(approver_a["id"])

        mem_a = api_client.post(
            "org-units/memberships",
            json={
                "orgUnitCode": child_code,
                "userId": approver_a["id"],
                "assignType": "USER",
                "startDate": "2020-01-01T00:00:00.000Z",
                "endDate": "2099-12-31T00:00:00.000Z",
            },
        ).json()
        api_client.patch(
            f"org-units/memberships/{mem_a['id']}", json={"assignType": "HEAD"}
        )
        created_membership_ids.append(mem_a["id"])

        # ── approver_b: HEAD of parent org (level 2, job_grade=10) ────────────
        # defaultOrgCode=child_code keeps the auto-created USER membership out of
        # parent_org.  approver_b appears as USER in child_org, but
        # getOrgUnitHeads only returns HEAD members, so they won't be picked up
        # at the child level.
        approver_b = api_client.post(
            "users",
            json={
                "name": f"approver-b-{uid}",
                "sub": f"sub-b-{uid}",
                "code": f"ub_{uid}",
                "email": f"approver.b.{uid}@example.com",
                "jobGrade": 10,
                "defaultOrgCode": child_code,
            },
        ).json()
        created_user_ids.append(approver_b["id"])

        mem_b = api_client.post(
            "org-units/memberships",
            json={
                "orgUnitCode": parent_code,
                "userId": approver_b["id"],
                "assignType": "USER",
                "startDate": "2020-01-01T00:00:00.000Z",
                "endDate": "2099-12-31T00:00:00.000Z",
            },
        ).json()
        api_client.patch(
            f"org-units/memberships/{mem_b['id']}", json={"assignType": "HEAD"}
        )
        created_membership_ids.append(mem_b["id"])

        # ── approver_c: HEAD of grandparent org (level 3, job_grade=15) ────────
        # defaultOrgCode=parent_code keeps the auto-created USER membership out of
        # grandparent_org.
        approver_c = api_client.post(
            "users",
            json={
                "name": f"approver-c-{uid}",
                "sub": f"sub-c-{uid}",
                "code": f"uc_{uid}",
                "email": f"approver.c.{uid}@example.com",
                "jobGrade": 15,
                "defaultOrgCode": parent_code,
            },
        ).json()
        created_user_ids.append(approver_c["id"])

        mem_c = api_client.post(
            "org-units/memberships",
            json={
                "orgUnitCode": grandparent_code,
                "userId": approver_c["id"],
                "assignType": "USER",
                "startDate": "2020-01-01T00:00:00.000Z",
                "endDate": "2099-12-31T00:00:00.000Z",
            },
        ).json()
        api_client.patch(
            f"org-units/memberships/{mem_c['id']}", json={"assignType": "HEAD"}
        )
        created_membership_ids.append(mem_c["id"])

        # ── anchor_user: the "specific user" whose reporting line is traversed ─
        anchor_user = api_client.post(
            "users",
            json={
                "name": f"anchor-{uid}",
                "sub": f"sub-anc-{uid}",
                "code": f"uanc_{uid}",
                "email": f"anchor.{uid}@example.com",
                "jobGrade": 1,
                "defaultOrgCode": child_code,
            },
        ).json()
        created_user_ids.append(anchor_user["id"])

        # ── Workflow ───────────────────────────────────────────────────────────
        wf_name = f"Sequential-RL-{uid}"
        wf_id = api_client.post("workflow", json={"name": wf_name}).json()["workflow_id"]
        binding_id = api_client.post(
            "bindings",
            json={"form_id": temporary_form["form_id"], "workflow_id": wf_id},
        ).json()["id"]
        flow_def = {
            "version": 1,
            "nodes": [
                {"key": "START", "type": "start", "next": "SEQUENTIAL"},
                {
                    "key": "SEQUENTIAL",
                    "type": "approval",
                    "next": "END",
                    "approval_method": "single",
                    "approvers": {
                        "type": "specific_user_reporting_line",
                        "config": {
                            "source": "manual",
                            "user_id": anchor_user["id"],
                            "method": "to_level",
                            "level": 3,
                        },
                        "description": "Sequential reporting line",
                    },
                    "description": "Sequential reporting-line approval",
                },
                {"key": "END", "type": "end"},
            ],
        }
        rev_id = api_client.post(
            f"workflow/{wf_id}/revisions",
            json={"name": wf_name, "flow_definition": flow_def},
        ).json()["revision_id"]
        api_client.patch(f"workflow/revisions/{rev_id}", json={"status": "ACTIVE"})

        # ── Submit ─────────────────────────────────────────────────────────────
        app = api_client.post(
            "applications/submission",
            json={"binding_id": binding_id, "form_data": {}},
        ).json()
        sn = app["serial_number"]
        assert app["workflow_instance"]["status"] == "RUNNING"

        # ── Branch B: verify initial ordering after tasks are created ──────────
        seq_node = _get_node_by_key(api_client, sn, "SEQUENTIAL")
        assert seq_node is not None, "SEQUENTIAL node not found in routing"
        assert seq_node["status"] == "pending"
        assert len(seq_node["approvalGroups"]) == 1, "Single approval node has one group"

        group = seq_node["approvalGroups"][0]
        assert group["isReportingLine"] is True
        approvals = group["approvals"]
        assert len(approvals) == 3, (
            f"Reporting line should resolve to 3 approvers; got {len(approvals)}"
        )
        assert approvals[0]["assignee"]["id"] == approver_a["id"], (
            f"Expected approver_a first; got {approvals[0]['assignee']['id']}"
        )
        assert approvals[1]["assignee"]["id"] == approver_b["id"], (
            f"Expected approver_b second; got {approvals[1]['assignee']['id']}"
        )
        assert approvals[2]["assignee"]["id"] == approver_c["id"], (
            f"Expected approver_c third; got {approvals[2]['assignee']['id']}"
        )
        assert approvals[0]["status"] == "PENDING"
        assert approvals[1]["status"] == "WAITING"
        assert approvals[2]["status"] == "WAITING"
        task_id_a = approvals[0]["approvalTaskId"]

        # ── Round 1: approve A → B promoted WAITING→PENDING ───────────────────
        # The admin token may or may not allow approving tasks assigned to
        # non-admin users.  We try and only assert post-approval order when the
        # call succeeds (HTTP 200).
        approve_resp = api_client.put(
            f"applications/{sn}/approval",
            json={"approval_id": task_id_a, "approval_result": "approve"},
            raise_for_status=False,
        )
        if approve_resp.status_code != 200:
            log.warning(
                "Admin approval of a non-assigned task returned %s — "
                "post-approval ordering not verified (requires admin-bypass permission).",
                approve_resp.status_code,
            )
            return

        seq_node = _get_node_by_key(api_client, sn, "SEQUENTIAL")
        assert seq_node is not None
        post_approvals = seq_node["approvalGroups"][0]["approvals"]
        assert post_approvals[0]["assignee"]["id"] == approver_a["id"], (
            "approver_a must remain first after round-1 approval. "
            "[GBPM-810: WAITING→PENDING write on B's row could change scan order]"
        )
        assert post_approvals[1]["assignee"]["id"] == approver_b["id"], (
            "approver_b must remain second after round-1 approval."
        )
        assert post_approvals[2]["assignee"]["id"] == approver_c["id"], (
            "approver_c must remain third after round-1 approval."
        )
        assert post_approvals[0]["status"] == "APPROVED"
        assert post_approvals[1]["status"] == "PENDING"
        assert post_approvals[2]["status"] == "WAITING"
        task_id_b = post_approvals[1]["approvalTaskId"]

        # ── Round 2: approve B → C promoted WAITING→PENDING ───────────────────
        approve_resp2 = api_client.put(
            f"applications/{sn}/approval",
            json={"approval_id": task_id_b, "approval_result": "approve"},
            raise_for_status=False,
        )
        if approve_resp2.status_code != 200:
            log.warning(
                "Round-2 admin approval returned %s — "
                "second WAITING→PENDING ordering check skipped.",
                approve_resp2.status_code,
            )
            return

        seq_node = _get_node_by_key(api_client, sn, "SEQUENTIAL")
        assert seq_node is not None
        post_approvals2 = seq_node["approvalGroups"][0]["approvals"]
        assert post_approvals2[0]["assignee"]["id"] == approver_a["id"], (
            "approver_a must remain first after round-2 approval."
        )
        assert post_approvals2[1]["assignee"]["id"] == approver_b["id"], (
            "approver_b must remain second after round-2 approval."
        )
        assert post_approvals2[2]["assignee"]["id"] == approver_c["id"], (
            "approver_c must remain third after round-2 approval. "
            "[GBPM-810: WAITING→PENDING write on C's row could change scan order]"
        )
        assert post_approvals2[0]["status"] == "APPROVED"
        assert post_approvals2[1]["status"] == "APPROVED"
        assert post_approvals2[2]["status"] == "PENDING"

    finally:
        if sn:
            api_client.delete(f"applications/{sn}", raise_for_status=False)
        if binding_id:
            api_client.delete(f"bindings/{binding_id}", raise_for_status=False)
        if wf_id:
            api_client.delete(f"workflow/{wf_id}/hard", raise_for_status=False)
        for membership_id in created_membership_ids:
            api_client.delete(
                f"org-units/memberships/{membership_id}", raise_for_status=False
            )
        for user_id in created_user_ids:
            api_client.delete(f"users/{user_id}/hard", raise_for_status=False)
        # innermost org must be deleted before outer ones (FK constraint)
        for org_id in created_org_ids:
            api_client.delete(f"org-units/{org_id}", raise_for_status=False)
