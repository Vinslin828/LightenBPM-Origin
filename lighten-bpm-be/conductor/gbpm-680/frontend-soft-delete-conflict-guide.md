# Frontend Integration Guide: Soft-Delete Conflict & Restore Flow

This guide covers the API behaviour introduced in GBPM-680 for **User** and **Org Unit** creation
when the submitted `code` belongs to a previously soft-deleted record, and how to restore those
records.

---

## Overview

The system performs a **soft delete** — records are marked with a `deletedAt` timestamp and hidden
from normal queries, but remain in the database. When you attempt to create a new record with the
same `code` as a soft-deleted one, the API returns a structured `409 Conflict` response instead of
creating a duplicate. You can then prompt the user to restore the old record via a dedicated
restore endpoint.

---

## 1. Create — Conflict Response

### Affected Endpoints

| Resource | Endpoint |
|---|---|
| User | `POST /bpm/users` |
| Org Unit | `POST /bpm/org-units` |

### Happy Path

A `201 Created` response with the resource body. No change from before.

### Conflict: Code Already Active

If the code belongs to an **active** record, the API returns a plain `409`:

```json
HTTP 409 Conflict
{
  "statusCode": 409,
  "message": "User with code EMP-001 already exists"
}
```

Handle this as a standard duplicate-code validation error. No extra fields are present.

### Conflict: Code Belongs to a Soft-Deleted Record

If the code belongs to a **soft-deleted** record, the API returns a structured `409` with a
machine-readable `code` field and the deleted record's metadata:

**User conflict**
```json
HTTP 409 Conflict
{
  "statusCode": 409,
  "code": "USER_CODE_CONFLICT_DELETED",
  "message": "User with code EMP-001 was previously deleted",
  "deletedId": 42,
  "deletedAt": "2025-11-15T08:30:00.000Z"
}
```

**Org Unit conflict**
```json
HTTP 409 Conflict
{
  "statusCode": 409,
  "code": "ORG_UNIT_CODE_CONFLICT_DELETED",
  "message": "OrgUnit with code DEPT-HR was previously deleted",
  "deletedId": 17,
  "deletedAt": "2025-10-01T12:00:00.000Z"
}
```

#### Fields

| Field | Type | Description |
|---|---|---|
| `statusCode` | `number` | Always `409` |
| `code` | `string` | `USER_CODE_CONFLICT_DELETED` or `ORG_UNIT_CODE_CONFLICT_DELETED` |
| `message` | `string` | Human-readable description |
| `deletedId` | `number` | Internal ID of the soft-deleted record |
| `deletedAt` | `string (ISO 8601)` | When the record was deleted |

#### Recommended UX

1. Detect `code === "USER_CODE_CONFLICT_DELETED"` (or `ORG_UNIT_CODE_CONFLICT_DELETED`).
2. Show a confirmation dialog, e.g.:
   > *"A user with this code was deleted on 15 Nov 2025. Would you like to restore it instead?"*
3. On confirmation, call the restore endpoint (see [Section 2](#2-restore-a-soft-deleted-record))
   with the `deletedId` from the response.
4. On cancel, allow the user to change the code and resubmit.

---

## 2. Restore a Soft-Deleted Record

> **Admin only** — these endpoints require the caller to have admin privileges. A non-admin caller
> receives `403 Forbidden`.

### Endpoints

| Resource | Endpoint | Method |
|---|---|---|
| User | `/bpm/users/:id/restore` | `PATCH` |
| Org Unit | `/bpm/org-units/:id/restore` | `PATCH` |

Use the `deletedId` from the `409` conflict response as the `:id` path parameter.

### Request

No request body required.

```
PATCH /bpm/users/42/restore
Authorization: Bearer <token>
```

### Success Response — `200 OK`

Returns the fully restored resource object. The `deletedAt` field will be `null`.

**User example**
```json
{
  "id": 42,
  "code": "EMP-001",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "deletedAt": null,
  "createdAt": "2024-03-01T09:00:00.000Z",
  "updatedAt": "2026-04-02T10:15:00.000Z"
}
```

**Org Unit example**
```json
{
  "id": 17,
  "code": "DEPT-HR",
  "name": "Human Resources",
  "type": "DEPARTMENT",
  "deletedAt": null,
  "createdAt": "2024-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-02T10:20:00.000Z"
}
```

### Error Responses

| Status | Condition |
|---|---|
| `404 Not Found` | No record with that ID exists |
| `409 Conflict` | Record exists but is already active (not deleted) |
| `403 Forbidden` | Caller is not an admin |

---

## 3. Listing Soft-Deleted Records

Both list endpoints now support an `includeDeleted` query parameter. This is useful for building
admin UIs that show deleted records or let users search for a record to restore.

| Resource | Endpoint |
|---|---|
| Users | `GET /bpm/users?includeDeleted=true` |
| Org Units | `GET /bpm/org-units?includeDeleted=true` |

When `includeDeleted=true`, soft-deleted records are included in the response. Each record exposes
a `deletedAt` field — non-null means the record is soft-deleted.

```json
{
  "id": 42,
  "code": "EMP-001",
  "name": "Jane Doe",
  "deletedAt": "2025-11-15T08:30:00.000Z"
}
```

Default behaviour (`includeDeleted` omitted or `false`) is unchanged — only active records are
returned.

---

## 4. `deletedAt` Field in Resource Responses

Both `UserDto` and `OrgUnitDto` now always include a `deletedAt` field:

- `null` — record is active.
- ISO 8601 timestamp — record is soft-deleted.

This field is present in **all** responses that return a user or org unit object (create, update,
get, list with `includeDeleted=true`, restore).

---

## 5. End-to-End Flow Diagram

```
Frontend                          API
   |                               |
   |--- POST /users { code: X } -->|
   |                               | code X exists but is soft-deleted
   |<-- 409 { code: "USER_CODE_CONFLICT_DELETED", deletedId: 42, deletedAt: "..." } --|
   |                               |
   | [show restore confirmation]   |
   |                               |
   |--- PATCH /users/42/restore -->|
   |                               | clears deleted_at
   |<-- 200 { id: 42, deletedAt: null, ... } --|
   |                               |
   | [proceed with restored user]  |
```

---

## 6. TypeScript Types (Reference)

```typescript
// Returned on 409 for soft-delete conflicts
interface SoftDeleteConflictError {
  statusCode: 409;
  code: 'USER_CODE_CONFLICT_DELETED' | 'ORG_UNIT_CODE_CONFLICT_DELETED';
  message: string;
  deletedId: number;
  deletedAt: string; // ISO 8601
}

function isSoftDeleteConflict(
  error: unknown,
): error is SoftDeleteConflictError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as SoftDeleteConflictError).code === 'USER_CODE_CONFLICT_DELETED' ||
    (error as SoftDeleteConflictError).code === 'ORG_UNIT_CODE_CONFLICT_DELETED'
  );
}
```
