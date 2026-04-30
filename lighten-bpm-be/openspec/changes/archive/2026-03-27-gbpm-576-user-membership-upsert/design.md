## Context

Currently, the user's default organization is stored in the `User` table (`default_org_id`), but the `OrgMembership` table is used for fine-grained permission checks. To eliminate dependency and potential inconsistencies, we need to decouple them and resolve the default organization dynamically from active memberships.

## Goals / Non-Goals

**Goals:**
- Remove the `default_org_id` dependency from the `User` table.
- Dynamically resolve the default organization based on a user's active `OrgMembership` records.
- Use the system-reserved `UNASSIGNED` organization as a fallback for users without active memberships.
- Provide a robust mechanism for users with multiple active memberships to select their default preference.
- Standardize the representation of "indefinite" memberships using a far-future constant.
- Ensure that external data ingestion via `MigrationService.bulkImport` respects and correctly synchronizes these new preferences.
- Maintain backward compatibility for API consumers (`UserDto`).
- Update the flow engine's dependency on the user's default organization.

**Non-Goals:**
- Automatically modifying historical or expired memberships when user preferences change.
- Handling complex dynamic permission re-evaluation for in-flight tasks upon preference change.

## Decisions

### 1. Separated User-Org Mapping (b.2)
- **Decision**: Create a new `UserDefaultOrg` table instead of adding an `is_default` flag to `OrgMembership`.
- **Rationale**: A unique constraint (`user_id`) on the new table natively enforces exactly one explicitly configured default organization per user. This approach separates the user's preference from the historical and factual `OrgMembership` data. It is cleaner than dealing with overlapping expiration states of an `is_default` boolean column.

### 2. Unified Default Org Resolution Strategy
- **Decision**: Implement dynamic resolution logic in the data access/service layer.
- **Rationale**: When querying a user, the system will evaluate their active memberships:
  - **Count == 0**: Fallback to system-reserved `UNASSIGNED` organization (resolved by `ORG_CODE_UNASSIGNED`).
  - **Count == 1**: The single active membership is returned as the default.
  - **Count > 1**: Lookup the user's preference in the `UserDefaultOrg` table. If the preference is missing or invalid, fallback to the active membership with the **earliest `start_date`**.
  This allows `UserRepository` to map these values back to `UserDto` seamlessly, preserving the current API response format.

### 3. Flow Engine Abstraction
- **Decision**: Refactor flow engine dependencies on `user.default_org_id`.
- **Rationale**: Node executors and profile retrieval logic in the `flow-engine` will now call the updated `UserService` method that handles this dynamic resolution. This encapsulates the logic and ensures consistency between what the frontend sees and what the engine uses for routing.

### 4. Indefinite Memberships via Far-Future Date
- **Decision**: Define a system constant `INDEFINITE_MEMBERSHIP_END_DATE` (e.g., `2999-12-31`) to represent memberships with no expiration.
- **Rationale**: Choosing a far-future date over a nullable `DateTime?` column avoids widespread schema changes and refactoring of existing queries across `UserService`, `OrgUnitService`, and `PermissionBuilder` that rely on the `end_date > current_date` check to determine active status.

### 5. Bulk Import Preference Synchronization
- **Decision**: Update `MigrationService.bulkImport` to synchronize `defaultOrgCode`.
- **Rationale**: The import process must be aligned with the new decoupled architecture. When users are imported with a `defaultOrgCode` and have multiple memberships, the bulk import transaction must explicitly create or update the corresponding `UserDefaultOrg` record to prevent them from falling back to arbitrary defaults.

## Risks / Trade-offs

- **[Risk] Performance Overhead** → [Mitigation] Dynamic resolution requires fetching active memberships and a potential preference record. We can optimize this by including these relations in the primary user fetch.
- **[Risk] Preference Invalidation** → [Mitigation] If a user's chosen default membership expires, the dynamic resolution will automatically fallback to the oldest active membership or `UNASSIGNED` until a new preference is set.