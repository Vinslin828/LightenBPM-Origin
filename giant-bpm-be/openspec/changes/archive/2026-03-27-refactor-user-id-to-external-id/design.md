# Design: Refactor User External ID

## Naming Analysis

### Context
We need a secondary unique identifier for `User` to facilitate integration with external systems (e.g. HR systems, SSO providers). This identifier will be used for API lookups and data imports/exports.

### Options Considered

| Term | Pros | Cons |
| :--- | :--- | :--- |
| **`code`** | **Consistent**: Matches `OrgUnit.code`. <br> **Neutral**: Can be an Employee ID, Username, or arbitrary code. <br> **Short**: concise. | Might imply an opaque code rather than a human-readable ID (though `OrgUnit.code` is readable). |
| **`username`** | **Standard**: Common in web apps. | Confusable with `name` (display name). Implies login credentials which might be handled by Auth0. |
| **`external_id`** | **Explicit**: Clearly states origin. | **Generic**: "External" to what? <br> **Long**: `external_id` vs `code`. |
| **`identity_id`** | **Semantic**: Relates to identity. | **Confusing**: `sub` is already the OIDC identity. |
| **`pid`** | **Short**. | **Ambiguous**: Often means "Process ID" in tech. |

### Recommendation
**`code`** is the recommended choice.
*   **Reasoning**: It aligns perfectly with the existing `OrgUnit` pattern where `id` is internal (Int) and `code` is external-facing/business-logic (String). It effectively serves as the "Employee Code" or "User Code".

## Soft Delete Analysis

We need to decide how to handle user deletion, specifically regarding "Soft Delete" (marking as deleted) vs "Hard Delete" (removing row).

### Analysis

| Approach | Pros | Cons |
| :--- | :--- | :--- |
| **Soft Delete** (`deleted_at`) | **Audit Trail**: Preserves history of approvals/actions by this user. <br> **Recovery**: Easy to undo accidental deletes. <br> **Integrity**: Prevents breaking FKs in historical logs if `ON DELETE` logic is complex. | **Complexity**: All queries must exclude deleted users. <br> **Uniqueness**: Reusing emails/codes is hard (constraint conflict). <br> **Privacy**: Requires extra steps for GDPR "Right to be Forgotten". |
| **Hard Delete** | **Simplicity**: Gone is gone. Queries are simple. <br> **Clean**: Frees up unique constraints immediately. | **Data Loss**: History is lost unless archived elsewhere. <br> **Risk**: Accidental deletion is catastrophic. |

### Recommendation
**Use Soft Delete (`deleted_at`)**.
*   **Reasoning**: In a BPM/Workflow system, audit trails are critical. Even if a user leaves, we need to know they approved a request 3 years ago. Hard deleting them would break that historical context or require complex denormalization.
*   **Naming**: `deleted_at` (DateTime, nullable). Standard convention. Presence of a date implies deletion.
*   **Constraints**: We will maintain unique constraints on `code` and `email`. If a user returns, we should reactivate the existing record rather than creating a duplicate.

## API Design

We need endpoints to Manage users via this new identifier.

### Endpoint Structure
To avoid conflict with `GET /users/:id` (where id is numeric), we should use a namespace/prefix.

**Selected Pattern:** `/users/code/:code`

*   **GET** `/users/code/:code` -> Retrieve user details (404 if soft-deleted, unless explicitly handled).
*   **PUT** `/users/code/:code` -> Update user details.
*   **DELETE** `/users/code/:code` -> **Soft Delete** the user (set `deleted_at` = now).

*Alternative*: `/users/by-code/:code` (More verbose, but very clear).
*Alternative*: `/users/external/:id` (If we chose `external_id` naming).

### Proposed API Changes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/code/:code` | Get user by their external code. Should return 404 if `deleted_at` is set. |
| `PUT` | `/users/code/:code` | Update user found by external code. |
| `DELETE` | `/users/code/:code` | **Soft Delete** user found by external code. |

## Schema Change
*   **Table**: `users`
*   **Field**: `code` (String, Unique, Nullable -> Required)
    *   *Constraint*: Must be unique.
    *   *Migration*: Populate with `sub` or `uuid` initially if empty.
*   **Field**: `deleted_at` (DateTime, Nullable)
    *   *Default*: `null`.
