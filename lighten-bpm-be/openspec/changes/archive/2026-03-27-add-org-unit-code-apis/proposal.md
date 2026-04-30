# Change: Add Org Unit Code APIs

## Why
Following the refactoring of OrgUnit foreign keys to use `code`, the API should also support managing Organization Units using these semantic codes. This improves consistency and allows clients to interact with the system without needing internal integer IDs. Additionally, querying memberships by `code` is now more performant as the column exists directly on the `OrgMembership` table.

## What Changes
We will add new endpoints to `OrgUnitController` to support operations via `code`:

-   `GET /org-units/code/:code` (Already partially supported via service, need controller exposure)
-   `PATCH /org-units/code/:code`
-   `DELETE /org-units/code/:code`
-   `GET /org-units/code/:code/heads`
-   `GET /org-units/code/:code/users`

We will update `OrgUnitService` and `OrgUnitRepository` to implement the logic for these endpoints, leveraging the `org_unit_code` column where applicable.

## Impact
-   **New API Endpoints:** Non-breaking addition.
-   **Service/Repository:** New methods added.
