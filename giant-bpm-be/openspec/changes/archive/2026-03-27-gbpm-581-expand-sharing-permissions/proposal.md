# Proposal: Expand Instance Sharing Permissions (GBPM-581)

## Problem Statement
Currently, only the application applicant or a system admin can share an application instance with other users. This is too restrictive, as approvers involved in the process may also need to share the instance with colleagues for consultation or visibility.

## Proposed Changes
Expand the permission logic for managing application instance shares to include any user who is currently or was previously an approver for that specific instance.

Affected methods in `ApplicationService`:
- `createInstanceShare`
- `createInstanceShares`
- `setInstanceShares`
- `listInstanceShares`
- `deleteInstanceSharesByQuery`

Note: `deleteInstanceShare` already allows the creator of the share to delete it, which covers approvers who created their own shares.

## Implementation Strategy
1.  **Enhance `InstanceDataService`**: Add a helper method `isUserInvolvedAsApprover(instanceId: number, userId: number)` to check if a user has any associated `ApprovalTask` for the given instance (including `escalated_to`).
2.  **Update `ApplicationService`**: Refactor the permission check in the affected methods to allow access if:
    - User is an Admin (`isAdminUser(user)`)
    - OR User is the Applicant (`instance.applicant_id === user.id`)
    - OR User is an Approver (`await this.instanceDataService.isUserInvolvedAsApprover(instance.id, user.id)`)

## Success Criteria
- Approvers can successfully share instances they are involved in.
- Applicants and Admins maintain their sharing permissions.
- Users not involved in the instance (and not admins) are still forbidden from sharing.
- New unit tests verify the expanded permissions.
