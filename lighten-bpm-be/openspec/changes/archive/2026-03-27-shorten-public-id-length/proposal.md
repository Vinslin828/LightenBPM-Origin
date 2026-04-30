# Change: Shorten Public ID Length

## Why
1.  **User Friendliness:** Full UUIDs (36 characters) are long and cumbersome in URLs, logs, and when shared manually.
2.  **Readability:** Shorter IDs are easier for humans to read and communicate.
3.  **Storage Efficiency:** While negligible for small datasets, shorter strings consume less space in indexes.

## What Changes
1.  **ID Format:** Switch from standard UUID (36 chars) to a shorter, URL-safe random string (e.g., 12 characters).
2.  **ID Prefix:** Support a configurable prefix (e.g., 'U' for UAT) to distinguish IDs across environments for future data migration.
3.  **Generation Strategy:** Move from database-level `uuid()` to application-level generation (using `nanoid` or similar).
4.  **Database Schema:**
    -   Change `public_id` columns from `@db.Uuid` to `String` (removing the strict UUID constraint at the DB level).
    -   Keep the `@unique` constraint.
5.  **Test Consistency:** Update the E2E test suite (Python) to use a compatible short ID generator, ensuring consistency across backend and tests.

## Impact
-   **Backward Compatibility:** Existing UUIDs will remain valid as strings.
-   **Breaking Change for Strict UUID Parsers:** External systems that strictly validate `public_id` as a UUID format will need to be updated.
-   **Collision Probability:** 12-character IDs using a 62-character alphabet provide sufficient entropy for the current scale of the system.

## Migration Strategy
1.  Update Prisma schema: remove `@db.Uuid` and change to `String`.
2.  Implement a utility in the backend to generate short IDs.
3.  Update DTOs and validation if they strictly check for UUID format.
4.  Existing data will be migrated from `UUID` type to `VARCHAR` automatically by PostgreSQL.
