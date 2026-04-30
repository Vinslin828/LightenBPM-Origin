# Change: Add User Code and Soft Delete

## Why
1.  **User Code:** We need to support external string-based IDs (e.g. Employee IDs) for Users to facilitate integration with external systems and data portability. We will introduce a secondary unique identifier `code`.
2.  **Soft Delete:** To preserve audit history in the workflow system, users should be marked as deleted rather than removed from the database.

## What Changes
1.  **Schema:**
    -   `User` table:
        -   Add `code` (String, Unique, Indexed).
        -   Add `deleted_at` (DateTime, Nullable).
    -   Existing `id` (Int, PK) remains unchanged.

2.  **Logic:**
    -   **Creation:** `UserService.create` must populate `code`.
    -   **Lookup:** `UserService` methods should filter out users where `deleted_at IS NOT NULL` by default.
    -   **Deletion:** `UserService.remove` (and new API) will set `deleted_at = NOW()` instead of `DELETE FROM`.

## Impact
-   **Non-Breaking Schema Change:** Adding columns is safe.
-   **Logic Update:** Queries need to be audit-aware (decide when to show deleted users, e.g. in historical logs vs active selection lists).

## Migration Strategy
1.  Add nullable `code` and `deleted_at` columns to `User`.
2.  Run script/migration to populate `code` for existing users.
3.  Add Unique constraint to `code`.