GBPM-747:
Background / Context

Current BPM system allows editing relationships across User Management, Role Management, and Organization Management. Requirement is to restrict modification capabilities via backend permission configuration. Frontend will not hide or disable actions, but must enforce permission checks and show alert when user lacks edit permission.

Functional Specification

User Management – Organization Editing Permission Control

Editing actions (add/delete organization) remain visible in UI

On add or delete action, system must validate backend permission

If user does not have edit permission, block action and show alert message

If user has permission, allow normal processing

Role Management – User Assignment Permission Control

Add/delete user actions under role remain visible in UI

On action trigger, system must validate backend permission

If user does not have edit permission, block action and show alert message

If user has permission, allow normal processing

Organization Management – Heads and Users Editing Permission Control

Edit, add, delete, and set default actions remain visible

On any edit-related action, system must validate backend permission

If user does not have edit permission, block action and show alert message

If user has permission, allow normal processing

Permission Handling

Permission is controlled via backend configuration

Frontend must rely on API response or permission check result

Standardized alert message should be shown (e.g., “You do not have permission to perform this action”)

Acceptance Criteria

AC-1 User without permission cannot edit organization in User Management

GIVEN user without edit permission navigates to User Management

WHEN user attempts to add or delete organization

THEN system blocks the action and shows no-permission alert

AC-2 User with permission can edit organization in User Management

GIVEN user with edit permission navigates to User Management

WHEN user attempts to add or delete organization

THEN system allows the action successfully

AC-3 User without permission cannot edit users in Role Management

GIVEN user without edit permission navigates to Role Management

WHEN user attempts to add or delete users under a role

THEN system blocks the action and shows no-permission alert

AC-4 User without permission cannot edit Heads and Users in Organization Management

GIVEN user without edit permission navigates to Organization Management

WHEN user attempts any edit action in Heads or Users section

THEN system blocks the action and shows no-permission alert

Out of Scope

UI removal or hiding of edit buttons

Changes to existing role or permission structure

---
Organization management在討論過後，不讓admin做管理的操作，請把下列API從後端設定為disabled

Create New Org

POST https://bpm.staging.lightencycling.com/org-units

Update Org Details

PATCH https://bpm.staging.lightencycling.com/org-units/179

Delete org

DEL https://bpm.staging.lightencycling.com/org-units/179

Add membership

POST https://bpm.staging.lightencycling.com/org-units/memberships

Delete membership

DEL https://bpm.staging.lightencycling.com/org-units/memberships/300

Update membership

PATCH https://bpm.staging.lightencycling.com/org-units/memberships/301

