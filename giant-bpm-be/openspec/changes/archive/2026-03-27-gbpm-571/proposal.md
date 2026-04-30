# Proposal: Refactor Application Visibility (GBPM-571)

## Problem Statement
The current `listApplications` endpoint returns all application instances that a user has permission to view. However, the intended behavior for a "My Applications" list is to show only those applications submitted by the user or those currently requiring their approval. A broader search capability is needed to find other viewable applications (e.g., shared with the user).

## Proposed Changes

### 1. Refactor `listApplications`
*   **Purpose**: Serve as the user's personal "Inbox", "Sent" list, and a broader "Search" tool.
*   **New Filter Type**: Add `VISIBLE` to `ApplicationsFilterEnum`.
*   **Behavior by Filter**:
    *   `filter=submitted`: Only return applications where `applicant_id === currentUser.id`.
    *   `filter=approving`: Return applications where the current user is/was an approver (has an `ApprovalTask`). 
        *   **Support `approvalStatus`**: If `query.approvalStatus` is provided, filter tasks by that status.
        *   **Default**: If `query.approvalStatus` is omitted, return all applications the user is involved in as an approver (Pending, Completed, etc.).
    *   `filter=visible`: Return all applications the user is authorized to view (Applicant OR Shared OR Involved).
*   **New Search Parameters**: Add `serialNumber` and `applicantId` to `ListApplicationsQueryDto`.

### 2. Implementation Strategy
*   Update `ApplicationsFilterEnum` and `ListApplicationsQueryDto`.
*   Refactor `ApplicationService.listApplications` to apply the correct visibility logic based on the `filter` parameter.
*   Update `ApplicationRepository` to support the new search parameters and visibility filters.

## Success Criteria
*   `listApplications` correctly filters by "submitted", "approving", and "visible".
*   `filter=approving` respects `query.approvalStatus` but shows all if omitted.
*   Search parameters (`serialNumber`, `formName`, etc.) work correctly across filters.
*   Permission boundaries are respected.
