# Change: Revert Org Unit Foreign Keys to ID

## Why
We recently moved `OrgUnit` foreign keys to use `code` to improve environment portability (GBPM-406). However, using a "Business Code" as a hard database Foreign Key introduces tight coupling between business data and relational integrity.

**Problems with Code as FK:**
1.  **Renaming Complexity:** If a department code changes (e.g., "SALES" -> "GLB_SALES"), propagating this change to thousands of `User` and `OrgMembership` records is expensive and risky, even with `ON UPDATE CASCADE`.
2.  **Performance:** Integer joins are generally faster and more efficient than String joins, especially as the dataset grows.
3.  **Standard Practice:** The industry standard "Best of Both Worlds" approach is:
    -   **Database:** Use Surrogate Keys (`id`) for robust, immutable relationships.
    -   **API:** Use Natural Keys (`code`) for human-readable, portable interaction.

## What Changes
We will revert the *Internal Database Schema* to use Integer IDs for relationships, while updating the *Application Layer* (Service/Controller) to handle the translation between Codes (from Client) and IDs (for Database).

-   **Schema Reversion:**
    -   `User.default_org_code` -> `User.default_org_id` (FK to `OrgUnit.id`)
    -   `OrgMembership.org_unit_code` -> `OrgMembership.org_unit_id` (FK to `OrgUnit.id`)
    -   `OrgUnit.parent_code` -> `OrgUnit.parent_id` (FK to `OrgUnit.id`)
    -   *Note:* `OrgUnit.code` remains Unique and is the primary lookup key for APIs.

-   **API Behavior:**
    -   **Inputs:** Continue to accept `code` (e.g., `defaultOrgCode: "SALES"`). The Service layer will resolve this to `ID: 5` before saving.
    -   **Outputs:** Ensure `code` is returned in responses so clients don't need to know the `id`.

## Impact
-   **BREAKING:** Database schema changes (requires migration/reset).
-   **Refactor:** `UserService`, `OrgUnitService`, and `OrgMembershipService` will need "Resolver" logic (Code -> ID).
-   **Refactor:** Seeding scripts (`prisma/seed.ts`).
