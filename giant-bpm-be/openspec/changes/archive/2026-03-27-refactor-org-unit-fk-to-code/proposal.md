# Change: Refactor Org Unit Foreign Keys to Code

## Why
Currently, `OrgUnit` relationships (Parent/Child) and references from other tables (`User`, `OrgMembership`) rely on the auto-incrementing integer `id`.
This creates challenges for:
1.  **Environment Syncing:** `id`s often diverge between Sandbox, Staging, and Production. A "Sales Dept" might be ID 5 in Prod but ID 8 in Sandbox.
2.  **Data Portability:** Importing/Exporting organization trees is difficult when relying on DB-specific IDs.
3.  **Readability:** `code` (e.g., "DEPT_SALES") is semantically meaningful; `id: 5` is not.

## What Changes
We will replace the Integer Foreign Keys pointing to `OrgUnit` with String Foreign Keys pointing to `OrgUnit.code`.

-   **Target:** `OrgUnit.code` (String, Unique) becomes the reference key.
-   **Impacted Relations:**
    -   `User.default_org_id` (Int) -> `User.default_org_code` (String)
    -   `OrgMembership.org_unit_id` (Int) -> `OrgMembership.org_unit_code` (String)
    -   `OrgUnit.parent_id` (Int) -> `OrgUnit.parent_code` (String)

## Impact
-   **BREAKING:** Database schema changes.
-   **BREAKING:** API DTOs handling Org Unit IDs will now require Codes.
-   **Refactor:** `UserService`, `OrgUnitService`, and `OrgMembershipService` logic.
-   **Refactor:** Seeding scripts (`prisma/seed.ts`).
