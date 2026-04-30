# Design: Revert Org Unit FK to ID

## Context
We are refining the `OrgUnit` architecture to balance **Stability** (Internal) and **Usability** (External).

## Decisions

### Decision 1: Internal IDs for Relationships
All database foreign keys will point to `OrgUnit.id` (Auto-increment Int).
-   `User`: `default_org_id` (Int) references `OrgUnit.id`
-   `OrgMembership`: `org_unit_id` (Int) references `OrgUnit.id`
-   `OrgUnit`: `parent_id` (Int?) references `OrgUnit.id`

### Decision 2: External Codes for APIs
The API surface will effectively "hide" the internal IDs where possible, favoring `code`.

#### **Write Operations (Input DTOs)**
Clients will send `code`.
-   `CreateUserDto`: `{ defaultOrgCode: "SALES", ... }`
-   `CreateOrgUnitDto`: `{ parentCode: "HEAD_OFFICE", ... }`

**Service Layer Responsibility:**
1.  Receive `code`.
2.  Lookup `OrgUnit` by `code` to get `id`.
3.  Throw 404 if `code` invalid.
4.  Save entity using `id`.

#### **Read Operations (Output DTOs)**
Clients expect `code`.
-   `UserResponse`: `{ defaultOrg: { code: "SALES", name: "Sales Dept" } }`
-   `OrgMembershipResponse`: `{ orgUnitCode: "SALES", ... }`

**Service Layer Responsibility:**
-   Ensure Prisma queries `include` or `select` the related `OrgUnit` to fetch the `code`.
-   Map the internal `orgUnit.code` to the DTO response fields.

## Migration Plan
Since we are in development:
1.  **Schema Change:** Modify `prisma/schema.prisma`.
2.  **Migration:** Create new migration (will drop `_code` columns and add `_id` columns).
3.  **Seed Update:** `prisma/seed.ts` must be updated. It creates Orgs first (getting IDs), then uses those IDs to create Users/Memberships.
    -   *Helper:* The seed script might need a local map `Map<Code, ID>` to easily resolve dependencies during the seed run.

## Risks
-   **Resolution Overhead:** Every "Create User" now requires a DB Read (Lookup Org by Code) before the DB Write.
    -   *Mitigation:* This is negligible for the volume of User creation. Caching can be added later if needed.
