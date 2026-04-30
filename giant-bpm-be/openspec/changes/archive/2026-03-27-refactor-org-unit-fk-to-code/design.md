# Design: Org Unit Code Reference

## Context
We are moving away from DB-generated IDs for Organization Units to support better cross-environment compatibility (GBPM-406).

## Decisions

### Decision 1: Keep `id` as Primary Key, but use `code` for Foreign Keys
We will retain `OrgUnit.id` (Int, PK) for internal Prisma efficiency and stability (e.g., if we ever need to rename a code, it's cheaper to update the string than migrate PKs, although cascading updates handle this).
**Correction:** Actually, to use `code` as a Foreign Key in Prisma, `OrgUnit.code` must be marked `@unique`.
We will NOT make `code` the Primary Key yet to minimize disruption to internal join tables that might not need migration yet, but for the specific relations requested (`User`, `OrgMembership`, `Parent`), we will strictly switch to `code`.

### Decision 2: Field Renaming
-   `User`: `default_org_id` -> `default_org_code`
-   `OrgMembership`: `org_unit_id` -> `org_unit_code`
-   `OrgUnit`: `parent_id` -> `parent_code`

## Migration Plan (Development)
Since we are in a pre-production/active development phase where schema resets are acceptable (per `make migrate-reset` usage in docs), we will opt for a **Destructive Change**.

1.  Update `schema.prisma`.
2.  Create a migration that alters the columns.
3.  Update `prisma/seed.ts` to use codes.
4.  Reset database.

## Risks
-   **Data Loss:** Existing data in local DBs will be lost if not carefully migrated (accepted for this stage).
-   **API Breakage:** Frontend relying on `orgId` will break. We must ensure the API outputs `code` as the primary identifier for Orgs in responses.

## Open Questions
-   Should we rename the API fields to `orgCode` or keep them as `orgId` (but returning string) to minimize frontend refactor?
    -   *Decision:* Rename to `orgCode` (or just `code` in nested objects) to be explicit.
